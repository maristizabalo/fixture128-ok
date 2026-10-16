# Fixture 128 · 2da Copa DM14

Fixture en vivo para el torneo de 128 jugadores de la **2da Copa DM14** (2da y 3ra
categoría, Club de Billares OK, octubre 16, 17 y 18). Todo en un solo repo de
JavaScript: React + Vite para las páginas y funciones Node en `/api`, listo para
Vercel.

Solo hay dos páginas:

| Página   | Para quién         | Qué hace                                                                                                                                         |
| -------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/`      | Público, TV del club | El cuadro en **modo espejo** (dos mitades con la final al centro) o **lineal** (de izquierda a derecha). Se actualiza solo cada 20 s. |
| `/admin` | Quien carga resultados | Entra con **PIN** (por defecto `951209`). Sube el Excel, carga resultados mesa por mesa y exporta todo a Excel.                         |

## Lo que trae

**Página pública**

- Cuadro de 128 → 64 → 32 → octavos → cuartos → semis → final, con líneas de llave.
- Modo **Espejo** y modo **Lineal**, y "Desde" para ver a partir de una ronda (ej. de octavos en adelante en el televisor).
- Buscador de jugador: resalta sus partidas, lleva hasta su última llave y dice si sigue en carrera o en qué ronda quedó.
- Zoom (botones, Ctrl + rueda), arrastrar con el mouse, **Ajustar** para ver el cuadro entero y **Pantalla completa**.
- Descarga del cuadro como imagen PNG para mandarlo por WhatsApp.
- Marcador: partidas jugadas, mesas en juego, ronda actual e indicador **EN VIVO**.
- Cinta de "Últimos": mesas en juego y resultados recientes. Lo que cambia con cada refresco destella.
- Detalle de cada partida: carambolas, entradas, promedio, mesa, W.O.
- Confeti cuando aparece el campeón.

**Panel `/admin`**

- PIN de 6 dígitos con teclado grande (pensado para el celular junto a la mesa). El acceso dura 14 horas.
- Partidas filtradas por *Por jugar / En juego / Jugadas*, por ronda o buscando jugador, `P12` o número de mesa.
- Cargar resultado: carambolas de cada uno (el ganador se marca solo), entradas, mesa y W.O.
- *Iniciar en mesa*: la partida aparece como **EN JUEGO · Mesa N** en el público.
- Corregir un resultado: si ya hay partidas posteriores con ese jugador, avisa cuáles se borran.
- Subir el Excel con vista previa de los 64 cruces antes de publicar, descargar la plantilla y **exportar el fixture con resultados** a Excel.
- Corregir el nombre, categoría o club de un jugador sin tocar resultados.

Los logos, el título de la copa y los colores salen del afiche original
(`docs/afiche-original.jpg`). El script `scripts/recortar-afiche.py` recorta los
logos con fondo transparente en `public/marca/`. Si llegan los logos originales en
PNG o SVG, basta con reemplazar esos archivos con el mismo nombre.

## El Excel

El Excel se lee con código del propio repo (`shared/excel.js`, con SheetJS), de dos
formas:

1. **Dentro del repo:** deja el archivo como `datos/fixture.xlsx`, haz commit y push. Mientras no se publique otra lista desde el panel, el cuadro sale de ese archivo.
2. **Desde el panel:** `/admin` → *Jugadores y Excel* → arrastra el archivo → revisa la vista previa → *Publicar fixture*.

Formatos que se reconocen solos (ver `datos/LEEME.md`):

- **Lista:** una fila por jugador en orden de llaves (1 vs 2, 3 vs 4…): `Llave | Jugador | Categoría | Club`.
- **Parejas:** una fila por partida: `Partida | Jugador 1 | Categoría | Jugador 2 | Categoría`.

Un cupo vacío o con `BYE` / `LIBRE` deja pasar directo al rival. Los nombres en
MAYÚSCULAS se pasan a Nombre Propio. "2", "2a", "segunda" quedan como `2da`.

En cuanto se carga el primer resultado, la lista queda fijada: cambiar el Excel
después ya no mueve a nadie de llave con partidas jugadas.

## Dónde se guardan los resultados

Vercel no deja escribir archivos mientras la página está publicada, así que los
resultados van a un **Redis de Upstash** (gratis, se conecta desde Vercel con un
clic). En la computadora no hace falta nada: se guardan en `.datos/`.

## Publicar en Vercel

1. En Vercel: **Add New → Project** → importar `maristizabalo/fixture128-ok`. Vercel detecta Vite solo.
2. En el proyecto: **Storage → Create Database → Upstash (Redis)** → conectarlo al proyecto. Las variables `KV_REST_API_URL` y `KV_REST_API_TOKEN` llegan solas.
3. En **Settings → Environment Variables** (opcional pero recomendado):
   - `ADMIN_PIN` = el PIN del panel (si no se pone, es `951209`).
   - `AUTH_SECRET` = un texto largo cualquiera.
4. **Redeploy**. Listo: `/` es el fixture y `/admin` el panel.

## En la computadora

```bash
npm install
npm run dev          # página y API juntas en http://localhost:5173
npm run ejemplo      # crea ejemplos/fixture-128-ejemplo.xlsx con 128 nombres inventados
npm run simular      # llena .datos/ con ese Excel y resultados a mitad de jornada
npm run build
```

## Estructura

```
api/                 funciones de Vercel (Node)
  torneo.js            GET  el torneo completo
  login.js             POST PIN → pase de 14 h
  jugadores.js         POST publicar lista (Excel subido o el de datos/)
  jugador.js           POST corregir un jugador
  partida.js           POST en juego / resultado / borrar
server/              almacenamiento (Redis o archivo), PIN, Excel del repo
shared/              lo que usan página y API por igual
  cuadro.js            arma el cuadro, BYEs, quién pasa, correcciones en cascada
  excel.js             lee el Excel (lista o parejas)
  nombres.js           "Juan Carlos Pérez Gómez" → "Juan C. Pérez G."
src/
  paginas/Publico.jsx  el fixture
  paginas/Admin.jsx    el panel
  componentes/         cuadro, llaves, visor, marcador, panel…
datos/               aquí va fixture.xlsx
public/marca/        logos y título recortados del afiche
```

Los datos del torneo que se muestran (nombre, fechas, sede, refresco) están en
`src/config.js`.
