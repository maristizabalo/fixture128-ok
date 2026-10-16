import { useEffect } from 'react';
import { X } from 'lucide-react';
import { promedio } from '../../shared/cuadro.js';
import { hace } from '../lib/useTorneo.js';
import './DetallePartida.css';

const ESTADOS = {
	espera: 'Esperando rivales',
	lista: 'Por jugar',
	juego: 'En juego',
	final: 'Finalizada',
	bye: 'Pasa directo (BYE)',
	vacia: 'Sin jugadores'
};

/** Cierra con Escape y no deja que la página de atrás se desplace. */
export function useModal(onCerrar) {
	useEffect(() => {
		const tecla = (e) => e.key === 'Escape' && onCerrar();
		document.addEventListener('keydown', tecla);
		const antes = document.body.style.overflow;
		document.body.style.overflow = 'hidden';
		return () => {
			document.removeEventListener('keydown', tecla);
			document.body.style.overflow = antes;
		};
	}, [onCerrar]);
}

function Jugador({ jugador, libre, origen, puntos, gana, pierde, entradas }) {
	const prom = promedio(puntos, entradas);
	return (
		<div className={`detalle__jugador ${gana ? 'detalle__jugador--gana' : ''} ${pierde ? 'detalle__jugador--fuera' : ''}`}>
			{jugador ? (
				<>
					<span className="detalle__llave ancha">Llave {jugador.llave}</span>
					<span className="detalle__nombre display">{jugador.nombre}</span>
					<span className="detalle__extra">
						{jugador.categoria && <span className="chip-cat">{jugador.categoria}</span>}
						{jugador.club && <span>{jugador.club}</span>}
					</span>
				</>
			) : (
				<span className="detalle__nombre detalle__nombre--vacio">
					{libre ? 'Cupo libre' : origen ? `Ganador de la P${origen}` : 'Por definir'}
				</span>
			)}
			{puntos != null && (
				<span className="detalle__puntos">
					<strong className="display tabular">{puntos}</strong>
					{prom != null && <small className="tabular">prom. {prom.toFixed(3)}</small>}
				</span>
			)}
		</div>
	);
}

export default function DetallePartida({ p, cuadro, onCerrar }) {
	useModal(onCerrar);
	if (!p) return null;
	const ronda = cuadro.rondas[p.ronda];
	const jugada = p.estado === 'final';

	return (
		<div className="modal" onClick={onCerrar} role="presentation">
			<div className="modal__caja panel detalle" role="dialog" aria-modal="true" aria-labelledby="detalle-titulo" onClick={(e) => e.stopPropagation()}>
				<div className="modal__cabeza">
					<div>
						<h2 id="detalle-titulo" className="modal__titulo">
							Partida {p.numero}
						</h2>
						<p className="modal__sub">
							{ronda.nombre}
							{p.mesa ? ` · Mesa ${p.mesa}` : ''}
						</p>
					</div>
					<button type="button" className="boton boton--icono" onClick={onCerrar} aria-label="Cerrar">
						<X size={18} />
					</button>
				</div>

				<p className={`detalle__estado detalle__estado--${p.estado}`}>
					{p.estado === 'juego' ? <span className="vivo">En juego</span> : ESTADOS[p.estado]}
					{jugada && p.wo && <span className="detalle__wo">W.O.</span>}
					{(jugada || p.estado === 'juego') && p.en && <span className="detalle__hace">{hace(p.en)}</span>}
				</p>

				<div className="detalle__cruce">
					<Jugador
						jugador={p.a}
						libre={p.libreA}
						origen={p.origenA}
						puntos={jugada ? p.pa : null}
						entradas={p.entradas}
						gana={(jugada || p.estado === 'bye') && p.ganador === p.a?.id}
						pierde={jugada && p.ganador !== p.a?.id}
					/>
					<span className="detalle__vs display">vs</span>
					<Jugador
						jugador={p.b}
						libre={p.libreB}
						origen={p.origenB}
						puntos={jugada ? p.pb : null}
						entradas={p.entradas}
						gana={(jugada || p.estado === 'bye') && p.ganador === p.b?.id}
						pierde={jugada && p.ganador !== p.b?.id}
					/>
				</div>

				{jugada && p.entradas != null && (
					<p className="detalle__entradas">
						<span className="tabular">{p.entradas}</span> entradas
					</p>
				)}
			</div>
		</div>
	);
}
