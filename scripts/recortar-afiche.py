"""
Saca del afiche los logos de los patrocinadores y el titulo de la copa.

Los logos salen con fondo transparente: el fondo del afiche es gris oscuro con
puntos azules, y los logos son blancos, calidos (rojo, amarillo, rosado) o
cian. Cada pixel se queda con la opacidad del rasgo que mas lo delata y el
color se "despega" del fondo, asi el borde queda suave sobre cualquier oscuro.

Si llegan los logos originales en PNG o SVG basta con dejarlos en
public/marca/ con el mismo nombre y este script ya no hace falta.

Uso:  python scripts/recortar-afiche.py ruta/al/afiche.jpg
"""

import sys
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "public" / "marca"

# Cajas sobre el afiche de 1079 x 1345, en el orden en que aparecen.
LOGOS = {
    "baits-tv": (28, 1204, 216, 1292),
    "dm14": (238, 1212, 390, 1304),
    "ok-club": (408, 1198, 536, 1318),
    "dr-billards": (548, 1204, 803, 1300),
    "andykin": (797, 1206, 1046, 1320),
}

# El titulo "2da y 3ra categoria / 2da copa DM14" con su fondo azul: en la
# pagina se funde con una mascara, que es lo que lo deja igual al afiche.
TITULO = (0, 160, 1079, 545)

ESCALA = 3


def suave(x, lo, hi):
    t = np.clip((x - lo) / (hi - lo), 0, 1)
    return t * t * (3 - 2 * t)


def sin_motas(alfa, minimo):
    """Borra las islas pequenas: puntos azules del fondo que pasaron el corte."""
    visible = alfa > 0.08
    alto, ancho = visible.shape
    visto = np.zeros_like(visible)
    for y0 in range(alto):
        for x0 in range(ancho):
            if not visible[y0, x0] or visto[y0, x0]:
                continue
            isla = []
            cola = deque([(y0, x0)])
            visto[y0, x0] = True
            while cola:
                y, x = cola.popleft()
                isla.append((y, x))
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ny, nx = y + dy, x + dx
                    if 0 <= ny < alto and 0 <= nx < ancho and visible[ny, nx] and not visto[ny, nx]:
                        visto[ny, nx] = True
                        cola.append((ny, nx))
            if len(isla) < minimo:
                ys, xs = zip(*isla)
                alfa[list(ys), list(xs)] = 0
    return alfa


def recortar_logo(afiche, caja):
    c = afiche.crop(caja)
    c = c.resize((c.width * ESCALA, c.height * ESCALA), Image.LANCZOS)
    a = np.asarray(c).astype(float)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    blanco = suave(a.min(-1), 85, 165)
    calido = suave(r - b, 55, 120) * suave(r, 110, 170)
    cian = suave(g - r, 80, 130) * suave(g, 130, 180)
    alfa = np.maximum.reduce([blanco, calido, cian])
    alfa = sin_motas(alfa, minimo=18 * ESCALA * ESCALA)

    transparente = alfa < 0.02
    fondo = np.median(a[transparente], axis=0) if transparente.any() else np.array([30, 30, 36])
    color = np.clip((a - fondo * (1 - alfa[..., None])) / np.maximum(alfa, 1e-3)[..., None], 0, 255)
    img = Image.fromarray(np.dstack([color, alfa * 255]).astype(np.uint8), "RGBA")

    borde = img.getchannel("A").point(lambda v: 255 if v > 24 else 0).getbbox()
    if borde:
        m = 3 * ESCALA
        img = img.crop((max(borde[0] - m, 0), max(borde[1] - m, 0),
                        min(borde[2] + m, img.width), min(borde[3] + m, img.height)))
    return img


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    afiche = Image.open(sys.argv[1]).convert("RGB")
    SALIDA.mkdir(parents=True, exist_ok=True)

    for nombre, caja in LOGOS.items():
        img = recortar_logo(afiche, caja)
        img.save(SALIDA / f"{nombre}.png", optimize=True)
        print(f"{nombre}.png", img.size)

    titulo = afiche.crop(TITULO)
    titulo.save(SALIDA / "titulo-copa.jpg", quality=92, optimize=True, progressive=True)
    print("titulo-copa.jpg", titulo.size)

    # El afiche entero para la vista previa al compartir el enlace por WhatsApp.
    afiche.save(SALIDA / "afiche.jpg", quality=88, optimize=True, progressive=True)
    print("afiche.jpg", afiche.size)


if __name__ == "__main__":
    main()
