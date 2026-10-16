import { useCallback, useRef, useState } from 'react';
import { ExternalLink, ListChecks, LogOut, Users } from 'lucide-react';
import { useTorneo } from '../lib/useTorneo.js';
import { editarJugador, guardarPartida, guardarPase, leerPase, olvidarPase, publicarJugadores } from '../lib/api.js';
import { TORNEO } from '../config.js';
import Pin from '../componentes/admin/Pin.jsx';
import Partidas from '../componentes/admin/Partidas.jsx';
import Jugadores from '../componentes/admin/Jugadores.jsx';
import EditorPartida from '../componentes/admin/EditorPartida.jsx';
import '../componentes/Encabezado.css';
import './Admin.css';

/**
 * El panel de quien carga los resultados. Detrás del PIN; una vez dentro, el
 * pase dura la jornada entera y la página no lo vuelve a pedir al recargar.
 */
export default function Admin() {
	const [pase, setPase] = useState(() => leerPase());
	const entrar = useCallback((nuevo) => {
		guardarPase(nuevo);
		setPase(nuevo);
	}, []);
	const salir = useCallback(() => {
		olvidarPase();
		setPase(null);
	}, []);

	if (!pase) return <Pin onIngreso={entrar} />;
	return <Panel onSalir={salir} />;
}

function Panel({ onSalir }) {
	// El panel se salta la copia de la CDN: lo que se ve es lo último guardado.
	const { estado, cuadro, error, setEstado } = useTorneo({ segundos: 15, fresco: true });
	const [pestana, setPestana] = useState('partidas');
	const [editando, setEditando] = useState(null);
	const [aviso, setAviso] = useState(null);
	const reloj = useRef(null);

	const avisar = useCallback((texto, tipo = 'ok') => {
		clearTimeout(reloj.current);
		setAviso({ texto, tipo });
		reloj.current = setTimeout(() => setAviso(null), 3800);
	}, []);

	/** Corre un cambio contra la API: pinta lo que vuelve o explica qué falló. */
	const ejecutar = useCallback(
		async (llamada, mensaje) => {
			try {
				setEstado(await llamada());
				avisar(mensaje);
				return true;
			} catch (e) {
				avisar(e.message, 'error');
				if (e.estado === 401) onSalir();
				return false;
			}
		},
		[avisar, onSalir, setEstado]
	);

	const pendientes = [...cuadro.porId.values()].filter((p) => p.estado === 'lista' || p.estado === 'juego').length;

	return (
		<div className="admin">
			<header className="admin__barra">
				<img className="admin__logo" src="/marca/titulo-copa.jpg" alt={TORNEO.nombre} />
				<div className="admin__titulos">
					<p className="admin__titulo ancha">Panel de resultados</p>
					<p className="admin__sub">
						{TORNEO.nombre} · {cuadro.jugadas}/{cuadro.total} jugadas
						{cuadro.enJuego ? ` · ${cuadro.enJuego} en juego` : ''}
					</p>
				</div>
				<div className="admin__botones">
					<a className="boton" href="/" target="_blank" rel="noreferrer">
						<ExternalLink size={15} /> <span className="admin__ocultable">Ver fixture</span>
					</a>
					<button type="button" className="boton boton--icono" onClick={onSalir} aria-label="Salir" title="Salir">
						<LogOut size={16} />
					</button>
				</div>
			</header>

			<main className="admin__cuerpo">
				{estado && !estado.donde && (
					<p className="aviso aviso--error">
						Los resultados no se están guardando: en Vercel falta la variable GITHUB_TOKEN (Settings → Environment
						Variables) y volver a desplegar. Los pasos están en el README.
					</p>
				)}
				{estado?.donde && <p className="admin__donde">Guardando en: {estado.donde}</p>}
				{error && <p className="aviso aviso--error">{error}</p>}

				<div className="segmentos admin__pestanas" role="tablist">
					<button type="button" role="tab" aria-pressed={pestana === 'partidas'} aria-selected={pestana === 'partidas'} onClick={() => setPestana('partidas')}>
						<ListChecks size={15} /> Partidas <span className="partidas__cuenta tabular">{pendientes}</span>
					</button>
					<button type="button" role="tab" aria-pressed={pestana === 'jugadores'} aria-selected={pestana === 'jugadores'} onClick={() => setPestana('jugadores')}>
						<Users size={15} /> Jugadores y Excel
					</button>
				</div>

				{!estado && <p className="admin__cargando">Cargando…</p>}

				{estado && pestana === 'partidas' && (
					cuadro.rondas.length ? (
						<Partidas cuadro={cuadro} onEditar={(p) => setEditando(p.id)} />
					) : (
						<div className="tarjeta panel admin__vacio">
							<p className="display">Primero sube el Excel con los jugadores</p>
							<button type="button" className="boton boton--primario" onClick={() => setPestana('jugadores')}>
								Ir a Jugadores y Excel
							</button>
						</div>
					)
				)}

				{estado && pestana === 'jugadores' && (
					<Jugadores
						estado={estado}
						cuadro={cuadro}
						onPublicar={(cupos, archivo) => ejecutar(() => publicarJugadores(cupos, archivo), 'Fixture publicado')}
						onPublicarRepo={() => ejecutar(() => publicarJugadores(undefined, undefined, true), 'Fixture del repo publicado')}
						onEditar={(datos) => ejecutar(() => editarJugador(datos), 'Jugador actualizado')}
					/>
				)}
			</main>

			{editando && cuadro.porId.get(editando) && (
				<EditorPartida
					p={cuadro.porId.get(editando)}
					cuadro={cuadro}
					onGuardar={(datos) =>
						ejecutar(
							() => guardarPartida(datos),
							datos.accion === 'final' ? 'Resultado guardado' : datos.accion === 'juego' ? 'Partida en juego' : 'Partida liberada'
						)
					}
					onCerrar={() => setEditando(null)}
				/>
			)}

			{aviso && (
				<div className={`toast ${aviso.tipo === 'error' ? 'toast--error' : ''}`} role="status">
					{aviso.texto}
				</div>
			)}
		</div>
	);
}
