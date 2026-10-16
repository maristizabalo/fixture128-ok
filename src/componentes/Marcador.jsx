import { rondaActual } from '../../shared/cuadro.js';
import { nombreCorto } from '../../shared/nombres.js';
import { useHace } from '../lib/useTorneo.js';
import './Marcador.css';

/**
 * Cómo va el torneo, de un vistazo: partidas jugadas, mesas en juego, la ronda
 * que se está jugando y si la página está al día.
 */
export default function Marcador({ cuadro, ultima, error }) {
	const ronda = rondaActual(cuadro);
	const avance = cuadro.total ? Math.round((cuadro.jugadas / cuadro.total) * 100) : 0;
	const hace = useHace(ultima);

	return (
		<div className="marcador">
			<div className="marcador__dato marcador__dato--avance">
				<span className="marcador__rotulo">Partidas jugadas</span>
				<span className="marcador__valor tabular">
					{cuadro.jugadas}
					<small>/{cuadro.total}</small>
				</span>
				<span className="marcador__barra" aria-hidden="true">
					<span style={{ width: `${avance}%` }} />
				</span>
			</div>
			<div className="marcador__dato">
				<span className="marcador__rotulo">En juego</span>
				<span className="marcador__valor tabular">{cuadro.enJuego}</span>
			</div>
			<div className="marcador__dato">
				<span className="marcador__rotulo">Ronda actual</span>
				<span className="marcador__valor marcador__valor--texto">{cuadro.campeon ? 'Terminado' : (ronda?.nombre ?? '—')}</span>
			</div>
			<div className="marcador__dato marcador__dato--vivo">
				{error ? (
					<span className="marcador__error">Sin conexión · reintentando</span>
				) : (
					<span className="vivo">En vivo</span>
				)}
				<span className="marcador__hace">Actualizado {hace}</span>
			</div>
		</div>
	);
}

/**
 * La cinta de lo último que pasó: primero las mesas en juego, después los
 * resultados más recientes. En el televisor corre sola; en el teléfono se
 * desliza con el dedo.
 */
export function UltimosResultados({ cuadro, onAbrir }) {
	const partidas = [...cuadro.porId.values()];
	const enJuego = partidas.filter((p) => p.estado === 'juego');
	const jugadas = partidas
		.filter((p) => p.estado === 'final')
		.sort((x, y) => String(y.en ?? '').localeCompare(String(x.en ?? '')))
		.slice(0, 12);
	const items = [...enJuego, ...jugadas];
	if (!items.length) return null;

	const item = (p, copia) => {
		const ronda = cuadro.rondas[p.ronda].corto;
		const ganaA = p.ganador === p.a?.id;
		return (
			<li key={`${copia}-${p.id}`}>
				<button type="button" className={`cinta__item cinta__item--${p.estado}`} onClick={() => onAbrir?.(p)} tabIndex={copia ? -1 : 0}>
					{p.estado === 'juego' ? (
						<span className="vivo">{p.mesa ? `Mesa ${p.mesa}` : 'En juego'}</span>
					) : (
						<span className="cinta__ronda">{ronda}</span>
					)}
					<span className={p.estado === 'final' && ganaA ? 'cinta__gana' : ''}>{nombreCorto(p.a?.nombre, 18)}</span>
					{p.estado === 'final' ? (
						<span className="cinta__tanteo tabular">
							{p.wo ? 'W.O.' : `${p.pa ?? '–'} – ${p.pb ?? '–'}`}
						</span>
					) : (
						<span className="cinta__vs">vs</span>
					)}
					<span className={p.estado === 'final' && !ganaA ? 'cinta__gana' : ''}>{nombreCorto(p.b?.nombre, 18)}</span>
				</button>
			</li>
		);
	};

	const corre = items.length > 3;
	return (
		<div className={`cinta ${corre ? 'cinta--corre' : ''}`} aria-label="Últimos resultados">
			<span className="cinta__titulo ancha">Últimos</span>
			<div className="cinta__ventana">
				<ul className="cinta__pista" style={{ '--duracion': `${items.length * 6}s` }}>
					{items.map((p) => item(p, false))}
					{corre && items.map((p) => item(p, true))}
				</ul>
			</div>
		</div>
	);
}
