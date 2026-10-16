import { nombreCorto } from '../../shared/nombres.js';

const clases = (...c) => c.filter(Boolean).join(' ');

/**
 * Un lado de la llave. Sin jugador dice de dónde va a salir ("Ganador P12") o
 * que el cupo va libre: un hueco por llenar, nunca una casilla en blanco.
 */
function Lado({ jugador, libre, origen, puntos, gana, pierde, llave, resaltado }) {
	const texto = jugador ? nombreCorto(jugador.nombre) : libre ? 'Libre' : origen ? `Ganador P${origen}` : 'Por definir';
	return (
		<span
			className={clases(
				'lado',
				gana && 'lado--gana',
				pierde && 'lado--fuera',
				!jugador && 'lado--vacio',
				resaltado && jugador?.id === resaltado && 'lado--buscado'
			)}
			title={jugador?.nombre ?? texto}
		>
			{llave != null && <span className="lado__llave tabular">{llave}</span>}
			<span className="lado__nombre">{texto}</span>
			{jugador?.categoria && <span className="chip-cat">{jugador.categoria}</span>}
			<span className="lado__pts tabular">{puntos ?? ''}</span>
		</span>
	);
}

export default function Llave({ p, primera = false, resaltado, reciente, onAbrir }) {
	const jugada = p.estado === 'final';
	const pasa = jugada || p.estado === 'bye';
	const buscada = resaltado && (p.a?.id === resaltado || p.b?.id === resaltado);
	const etiqueta = [
		`Partida ${p.numero}`,
		p.a?.nombre ?? 'por definir',
		'contra',
		p.b?.nombre ?? 'por definir',
		p.estado === 'juego' ? `en juego${p.mesa ? `, mesa ${p.mesa}` : ''}` : ''
	].join(' ');

	return (
		<button
			type="button"
			className={clases('llave', `llave--${p.estado}`, primera && 'llave--primera', buscada && 'llave--buscada', reciente && 'llave--reciente')}
			data-partida={p.id}
			onClick={() => onAbrir?.(p)}
			aria-label={etiqueta}
		>
			<span className="llave__num tabular">P{p.numero}</span>
			{p.estado === 'juego' && <span className="llave__vivo vivo">{p.mesa ? `Mesa ${p.mesa}` : 'En juego'}</span>}
			{p.estado === 'lista' && p.mesa && <span className="llave__mesa">Mesa {p.mesa}</span>}
			{jugada && p.wo && <span className="llave__mesa llave__mesa--wo">W.O.</span>}
			<span className="llave__lados">
				<Lado
					jugador={p.a}
					libre={p.libreA}
					origen={p.origenA}
					puntos={jugada ? p.pa : null}
					gana={pasa && p.ganador === p.a?.id}
					pierde={jugada && p.ganador !== p.a?.id}
					llave={primera ? p.indice * 2 + 1 : null}
					resaltado={resaltado}
				/>
				<Lado
					jugador={p.b}
					libre={p.libreB}
					origen={p.origenB}
					puntos={jugada ? p.pb : null}
					gana={pasa && p.ganador === p.b?.id}
					pierde={jugada && p.ganador !== p.b?.id}
					llave={primera ? p.indice * 2 + 2 : null}
					resaltado={resaltado}
				/>
			</span>
		</button>
	);
}
