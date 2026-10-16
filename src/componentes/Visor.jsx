import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
	Columns2,
	Download,
	Maximize,
	Minimize,
	Minus,
	Plus,
	ScanSearch,
	Search,
	StretchHorizontal,
	X
} from 'lucide-react';
import Cuadro from './Cuadro.jsx';
import { normalizar } from '../../shared/cuadro.js';
import './Cuadro.css';
import './Visor.css';

const MIN = 0.25;
const MAX = 1.6;
const limitar = (z) => Math.min(MAX, Math.max(MIN, Math.round(z * 100) / 100));

function recordar(clave, inicial) {
	try {
		return localStorage.getItem(clave) ?? inicial;
	} catch {
		return inicial;
	}
}

function guardar(clave, valor) {
	try {
		localStorage.setItem(clave, valor);
	} catch {
		/* sin almacenamiento, se olvida al recargar */
	}
}

/** Dónde va un jugador: su última partida y si sigue en carrera. */
function rastro(cuadro, id) {
	let ultima = null;
	for (const r of cuadro.rondas) for (const p of r.partidas) if (p.a?.id === id || p.b?.id === id) ultima = p;
	if (!ultima) return null;
	const ronda = cuadro.rondas[ultima.ronda];
	if (cuadro.campeon?.id === id) return { partida: ultima, texto: '¡Campeón de la copa!' };
	if (ultima.estado === 'final' && ultima.ganador !== id) return { partida: ultima, texto: `Eliminado en ${ronda.nombre}` };
	const rival = ultima.a?.id === id ? ultima.b : ultima.a;
	const contra = rival ? `vs ${rival.nombre}` : 'rival por definir';
	if (ultima.estado === 'juego') return { partida: ultima, texto: `Jugando ahora · ${ronda.nombre} ${contra}` };
	return { partida: ultima, texto: `Sigue en carrera · ${ronda.nombre} ${contra}` };
}

/**
 * El cuadro con todo lo que hace falta para mirarlo: los dos modos, desde
 * qué ronda, el buscador, el zoom, la pantalla completa y la descarga.
 *
 * El cuadro de 128 no cabe en ninguna pantalla, así que vive dentro de un
 * lienzo que se arrastra con el mouse (o el dedo) y se acerca y aleja. El zoom
 * es la propiedad `zoom` de CSS y no un `transform`: el navegador sabe cuánto
 * ocupa el cuadro ya escalado y el desplazamiento funciona solo.
 */
export default function Visor({ cuadro, recientes, onAbrir }) {
	// En el teléfono el espejo es el doble de ancho que la pantalla: de entrada, lineal.
	const [modo, setModo] = useState(() =>
		recordar('fixture128:modo', window.matchMedia('(max-width: 720px)').matches ? 'lineal' : 'espejo')
	);
	const ultimaDesde = Math.max(cuadro.rondas.length - 2, 0);
	const [desdeElegida, setDesde] = useState(() => Number(recordar('fixture128:desde', '0')) || 0);
	const desde = Math.min(desdeElegida, ultimaDesde);
	const [escala, setEscala] = useState(1);
	const [completa, setCompleta] = useState(false);
	const [sustituto, setSustituto] = useState(false);
	const [descargando, setDescargando] = useState(false);
	const [consulta, setConsulta] = useState('');
	const [resaltado, setResaltado] = useState(null);
	const [abiertas, setAbiertas] = useState(false);

	const visor = useRef(null);
	const lienzo = useRef(null);
	const llaves = useRef(null);
	const ancla = useRef(null);
	const arrastre = useRef(null);
	const escalaRef = useRef(escala);
	escalaRef.current = escala;

	useEffect(() => guardar('fixture128:modo', modo), [modo]);
	useEffect(() => guardar('fixture128:desde', String(desdeElegida)), [desdeElegida]);

	/** Lo que mide el cuadro sin zoom. */
	const medidaNatural = useCallback(() => {
		const el = llaves.current;
		if (!el) return null;
		const r = el.getBoundingClientRect();
		return { w: r.width / escalaRef.current, h: r.height / escalaRef.current };
	}, []);

	const ajustar = useCallback(
		(soloAncho = false) => {
			const caja = lienzo.current;
			const m = medidaNatural();
			if (!caja || !m) return;
			const porAncho = (caja.clientWidth - 4) / m.w;
			const porAlto = (caja.clientHeight - 4) / m.h;
			setEscala(limitar(soloAncho ? porAncho : Math.min(porAncho, porAlto)));
		},
		[medidaNatural]
	);

	// Al entrar y al cambiar de modo o de ronda: a lo ancho, pero sin encoger
	// tanto que los nombres dejen de leerse.
	useLayoutEffect(() => {
		const caja = lienzo.current;
		const m = medidaNatural();
		if (!caja || !m) return;
		const porAncho = (caja.clientWidth - 4) / m.w;
		setEscala(limitar(Math.min(1, Math.max(porAncho, caja.clientWidth < 700 ? 0.62 : 0.7))));
		caja.scrollTo({ left: 0, top: 0 });
	}, [modo, desde, medidaNatural]);

	// El zoom acercándose a un punto: lo que estaba bajo el mouse sigue ahí.
	const zoomEn = useCallback((nueva, x, y) => {
		const caja = lienzo.current;
		if (!caja) return;
		const vieja = escalaRef.current;
		const z = limitar(nueva);
		if (z === vieja) return;
		const px = x ?? caja.clientWidth / 2;
		const py = y ?? caja.clientHeight / 2;
		ancla.current = {
			cx: (caja.scrollLeft + px) / vieja,
			cy: (caja.scrollTop + py) / vieja,
			px,
			py
		};
		setEscala(z);
	}, []);

	useLayoutEffect(() => {
		const a = ancla.current;
		const caja = lienzo.current;
		if (!a || !caja) return;
		caja.scrollLeft = a.cx * escala - a.px;
		caja.scrollTop = a.cy * escala - a.py;
		ancla.current = null;
	}, [escala]);

	// Ctrl + rueda (y el pellizco del touchpad, que llega así) acerca y aleja.
	useEffect(() => {
		const caja = lienzo.current;
		if (!caja) return undefined;
		const rueda = (e) => {
			if (!e.ctrlKey && !e.metaKey) return;
			e.preventDefault();
			const r = caja.getBoundingClientRect();
			zoomEn(escalaRef.current * Math.exp(-e.deltaY * 0.0022), e.clientX - r.left, e.clientY - r.top);
		};
		caja.addEventListener('wheel', rueda, { passive: false });
		return () => caja.removeEventListener('wheel', rueda);
	}, [zoomEn]);

	// Arrastrar con el mouse. En el teléfono el dedo ya desplaza solo.
	const alBajar = (e) => {
		if (e.pointerType !== 'mouse' || e.button !== 0) return;
		const caja = lienzo.current;
		arrastre.current = { x: e.clientX, y: e.clientY, l: caja.scrollLeft, t: caja.scrollTop, movido: false };
	};
	const alMover = (e) => {
		const d = arrastre.current;
		if (!d) return;
		const dx = e.clientX - d.x;
		const dy = e.clientY - d.y;
		if (!d.movido && Math.hypot(dx, dy) < 5) return;
		if (!d.movido) {
			d.movido = true;
			lienzo.current.setPointerCapture?.(e.pointerId);
			lienzo.current.classList.add('lienzo--arrastrando');
		}
		lienzo.current.scrollLeft = d.l - dx;
		lienzo.current.scrollTop = d.t - dy;
	};
	const alSoltar = () => {
		lienzo.current?.classList.remove('lienzo--arrastrando');
		// El clic que llega al final de un arrastre no abre la llave.
		if (arrastre.current?.movido) {
			const tragar = (ev) => {
				ev.stopPropagation();
				ev.preventDefault();
			};
			window.addEventListener('click', tragar, { capture: true, once: true });
			setTimeout(() => window.removeEventListener('click', tragar, { capture: true }), 50);
		}
		arrastre.current = null;
	};

	// ---------------------------------------------------- pantalla completa
	const enCompleta = completa || sustituto;

	useEffect(() => {
		const cambio = () => {
			setCompleta(document.fullscreenElement === visor.current);
			requestAnimationFrame(() => ajustar());
		};
		const tecla = (e) => e.key === 'Escape' && setSustituto(false);
		document.addEventListener('fullscreenchange', cambio);
		document.addEventListener('keydown', tecla);
		return () => {
			document.removeEventListener('fullscreenchange', cambio);
			document.removeEventListener('keydown', tecla);
		};
	}, [ajustar]);

	useEffect(() => {
		if (!sustituto) return undefined;
		document.body.style.overflow = 'hidden';
		requestAnimationFrame(() => ajustar());
		return () => {
			document.body.style.overflow = '';
		};
	}, [sustituto, ajustar]);

	async function alternarCompleta() {
		if (enCompleta) {
			if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
			setSustituto(false);
			return;
		}
		try {
			await visor.current.requestFullscreen?.();
		} catch {
			/* el navegador la negó: se usa el sustituto */
		}
		// Safari en iPhone no pone en pantalla completa nada que no sea un video:
		// ahí el cuadro se clava sobre toda la ventana, que se ve igual.
		if (document.fullscreenElement !== visor.current) setSustituto(true);
	}

	// ---------------------------------------------------- descarga
	async function descargar() {
		if (!llaves.current || descargando) return;
		setDescargando(true);
		const anterior = escalaRef.current;
		try {
			setEscala(1);
			await new Promise((listo) => requestAnimationFrame(() => requestAnimationFrame(listo)));
			const { domToPng } = await import('modern-screenshot');
			const m = medidaNatural();
			const aumento = Math.max(1, Math.min(2, 12000 / Math.max(m.w, m.h)));
			const png = await domToPng(llaves.current, { scale: aumento, backgroundColor: '#0b1120' });
			const enlace = document.createElement('a');
			enlace.href = png;
			enlace.download = `fixture-copa-dm14-${modo}.png`;
			enlace.click();
		} finally {
			setEscala(anterior);
			setDescargando(false);
		}
	}

	// ---------------------------------------------------- buscador
	const jugadores = useMemo(() => {
		const lista = [];
		for (const p of cuadro.rondas[0]?.partidas ?? []) {
			if (p.a) lista.push(p.a);
			if (p.b) lista.push(p.b);
		}
		return lista.map((j) => ({ ...j, clave: normalizar(`${j.nombre} ${j.club ?? ''}`) }));
	}, [cuadro]);

	const sugerencias = useMemo(() => {
		const q = normalizar(consulta);
		if (!q) return [];
		const partes = q.split(' ');
		return jugadores.filter((j) => partes.every((p) => j.clave.includes(p))).slice(0, 8);
	}, [consulta, jugadores]);

	const info = useMemo(() => (resaltado ? rastro(cuadro, resaltado) : null), [cuadro, resaltado]);
	const elegido = jugadores.find((j) => j.id === resaltado);

	function elegir(j) {
		setResaltado(j.id);
		setConsulta(j.nombre);
		setAbiertas(false);
		const r = rastro(cuadro, j.id);
		if (r && r.partida.ronda < desde) setDesde(0);
		requestAnimationFrame(() =>
			requestAnimationFrame(() => {
				const el = lienzo.current?.querySelector(`[data-partida="${r?.partida.id}"]`);
				el?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
			})
		);
	}

	function limpiarBusqueda() {
		setResaltado(null);
		setConsulta('');
	}

	const rondasElegibles = cuadro.rondas.slice(0, ultimaDesde + 1);

	return (
		<section
			ref={visor}
			className={`visor ${enCompleta ? 'visor--completa' : ''} ${sustituto ? 'visor--sustituto' : ''}`}
			aria-label="Cuadro del torneo"
		>
			<div className="barra">
				<div className="segmentos" role="group" aria-label="Modo del cuadro">
					<button type="button" aria-pressed={modo === 'espejo'} onClick={() => setModo('espejo')}>
						<Columns2 size={15} aria-hidden="true" /> Espejo
					</button>
					<button type="button" aria-pressed={modo === 'lineal'} onClick={() => setModo('lineal')}>
						<StretchHorizontal size={15} aria-hidden="true" /> Lineal
					</button>
				</div>

				<div className="barra__desde">
					<span className="barra__rotulo">Desde</span>
					<div className="segmentos segmentos--desliza" role="group" aria-label="Mostrar desde la ronda">
						{rondasElegibles.map((r) => (
							<button
								type="button"
								key={r.indice}
								aria-pressed={desde === r.indice}
								onClick={() => setDesde(r.indice)}
								title={r.nombre}
							>
								{r.corto}
							</button>
						))}
					</div>
				</div>

				<div className="buscador">
					<Search className="buscador__icono" size={16} aria-hidden="true" />
					<input
						className="campo buscador__campo"
						type="search"
						placeholder="Buscar jugador…"
						value={consulta}
						onChange={(e) => {
							setConsulta(e.target.value);
							setAbiertas(true);
							if (!e.target.value) setResaltado(null);
						}}
						onFocus={() => setAbiertas(true)}
						onBlur={() => setTimeout(() => setAbiertas(false), 150)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && sugerencias[0]) elegir(sugerencias[0]);
							if (e.key === 'Escape') limpiarBusqueda();
						}}
						aria-label="Buscar jugador en el cuadro"
					/>
					{abiertas && sugerencias.length > 0 && (
						<ul className="buscador__lista panel" role="listbox">
							{sugerencias.map((j) => (
								<li key={j.id}>
									<button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => elegir(j)}>
										<span className="buscador__llave tabular">{j.llave}</span>
										<span className="buscador__nombre">{j.nombre}</span>
										{j.categoria && <span className="chip-cat">{j.categoria}</span>}
									</button>
								</li>
							))}
						</ul>
					)}
				</div>

				<div className="barra__acciones">
					<div className="zoom" role="group" aria-label="Zoom">
						<button type="button" className="boton boton--icono" onClick={() => zoomEn(escala / 1.2)} aria-label="Alejar">
							<Minus size={16} />
						</button>
						<button type="button" className="zoom__valor tabular" onClick={() => zoomEn(1)} title="Tamaño real">
							{Math.round(escala * 100)}%
						</button>
						<button type="button" className="boton boton--icono" onClick={() => zoomEn(escala * 1.2)} aria-label="Acercar">
							<Plus size={16} />
						</button>
					</div>
					<button type="button" className="boton" onClick={() => ajustar()} title="Ver el cuadro entero" aria-label="Ajustar a la pantalla">
						<ScanSearch size={16} aria-hidden="true" /> <span className="barra__texto">Ajustar</span>
					</button>
					<button type="button" className="boton" onClick={alternarCompleta} aria-label={enCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}>
						{enCompleta ? <Minimize size={16} aria-hidden="true" /> : <Maximize size={16} aria-hidden="true" />}
						<span className="barra__texto">{enCompleta ? 'Salir' : 'Pantalla completa'}</span>
					</button>
					<button type="button" className="boton boton--icono" onClick={descargar} disabled={descargando} title="Descargar el cuadro como imagen" aria-label="Descargar imagen">
						<Download size={16} />
					</button>
				</div>
			</div>

			{elegido && info && (
				<div className="rastro">
					<span className="rastro__nombre">{elegido.nombre}</span>
					<span className="rastro__texto">{info.texto}</span>
					<button type="button" className="rastro__cerrar" onClick={limpiarBusqueda} aria-label="Quitar búsqueda">
						<X size={15} />
					</button>
				</div>
			)}

			<div
				ref={lienzo}
				className="lienzo"
				onPointerDown={alBajar}
				onPointerMove={alMover}
				onPointerUp={alSoltar}
				onPointerCancel={alSoltar}
			>
				<div className="lienzo__zoom" style={{ zoom: escala }}>
					<Cuadro
						ref={llaves}
						cuadro={cuadro}
						modo={modo}
						desde={desde}
						resaltado={resaltado}
						recientes={recientes}
						onAbrir={onAbrir}
					/>
				</div>
			</div>
			{descargando && <p className="visor__aviso">Armando la imagen del cuadro…</p>}
		</section>
	);
}
