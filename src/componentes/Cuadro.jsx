import { forwardRef } from 'react';
import Llave from './Llave.jsx';
import Campeon from './Campeon.jsx';

const clases = (...c) => c.filter(Boolean).join(' ');

/**
 * El cuadro de llaves, en sus dos modos.
 *
 * Lineal: una columna por ronda y todo en la misma dirección, de la ronda de
 * 128 a la final y el campeón al final del recorrido. Se sigue con el dedo sin
 * saber de qué mitad se es, y en el teléfono es el que mejor se entiende.
 *
 * Espejo: las dos mitades enfrentadas, la de arriba a la izquierda y la de
 * abajo a la derecha, con la final y el campeón en el centro. Es el cuadro de
 * toda la vida, el que se ve bien proyectado en el televisor del club, y con
 * 128 jugadores es la mitad de alto que el lineal.
 *
 * Todas las llaves de una columna miden lo mismo y cada columna reparte su
 * alto en partes iguales: así cada llave queda sola a mitad de camino entre
 * las dos de las que sale, y las líneas se dibujan sin calcular coordenadas.
 *
 * `desde` recorta las primeras rondas: con el torneo avanzado, en el
 * televisor basta con ver de octavos en adelante.
 */
const Cuadro = forwardRef(function Cuadro({ cuadro, modo, desde = 0, resaltado, recientes, onAbrir }, ref) {
	const rondas = cuadro.rondas.slice(desde);
	if (rondas.length === 0) return null;

	const llave = (p) => (
		<Llave
			p={p}
			primera={p.ronda === 0}
			resaltado={resaltado}
			reciente={recientes?.has(p.id)}
			onAbrir={onAbrir}
		/>
	);

	const columna = ({ ronda, partidas, lado, entrada, salida, borde }) => (
		<div
			key={`${lado}-${ronda.indice}`}
			className={clases(
				'columna',
				`columna--${lado}`,
				entrada && 'con-entrada',
				salida && 'con-salida',
				borde && 'columna--borde'
			)}
		>
			{partidas.map((p) => (
				<div className="nodo" key={p.id}>
					<div className="nodo__cuerpo">{llave(p)}</div>
				</div>
			))}
		</div>
	);

	const rotulo = (ronda, extra = '') => {
		const jugadas = ronda.partidas.filter((p) => p.estado === 'final').length;
		const reales = ronda.partidas.filter((p) => p.estado !== 'bye' && p.estado !== 'vacia').length;
		return (
			<div key={`r-${ronda.indice}-${extra}`} className={clases('rotulo', ronda.partidas.length === 1 && 'rotulo--final')}>
				<span className="rotulo__nombre ancha">{ronda.nombre}</span>
				<span className="rotulo__cuenta tabular">
					{jugadas}/{reales || ronda.partidas.length} jugadas
				</span>
			</div>
		);
	};

	// ------------------------------------------------------------- lineal
	if (modo === 'lineal' || rondas.length < 2) {
		const filas = rondas[0].partidas.length;
		const columnas = rondas.map((ronda, i) => ({
			ronda,
			partidas: ronda.partidas,
			lado: 'izq',
			entrada: i > 0,
			salida: i < rondas.length - 1,
			borde: i === 0
		}));
		return (
			<div
				ref={ref}
				className={clases('llaves llaves--lineal', resaltado && 'llaves--buscando')}
				style={{
					'--filas': filas,
					gridTemplateColumns: `var(--ancho-primera) repeat(${rondas.length - 1}, var(--ancho)) var(--ancho-campeon)`
				}}
			>
				{rondas.map((r) => rotulo(r))}
				<div className="rotulo rotulo--final">
					<span className="rotulo__nombre ancha">Campeón</span>
					<span className="rotulo__cuenta">2da Copa DM14</span>
				</div>
				{columnas.map(columna)}
				<div className="columna-campeon">
					<Campeon campeon={cuadro.campeon} />
				</div>
			</div>
		);
	}

	// ------------------------------------------------------------- espejo
	const previas = rondas.slice(0, -1);
	const final = rondas.at(-1);
	const mitad = (r) => Math.ceil(r.partidas.length / 2);
	const filas = mitad(previas[0]);

	const izquierda = previas.map((ronda, i) => ({
		ronda,
		partidas: ronda.partidas.slice(0, mitad(ronda)),
		lado: 'izq',
		entrada: i > 0,
		salida: i < previas.length - 1,
		borde: i === 0
	}));
	// De dentro hacia fuera: la semifinal pegada al centro y la primera ronda
	// en el borde derecho.
	const derecha = previas
		.map((ronda, i) => ({
			ronda,
			partidas: ronda.partidas.slice(mitad(ronda)),
			lado: 'der',
			entrada: i > 0,
			salida: i < previas.length - 1,
			borde: i === 0
		}))
		.reverse();

	const n = previas.length;
	return (
		<div
			ref={ref}
			className={clases('llaves llaves--espejo', resaltado && 'llaves--buscando')}
			style={{
				'--filas': filas,
				gridTemplateColumns: [
					'var(--ancho-primera)',
					n > 1 ? `repeat(${n - 1}, var(--ancho))` : '',
					'var(--ancho-centro)',
					n > 1 ? `repeat(${n - 1}, var(--ancho))` : '',
					'var(--ancho-primera)'
				]
					.filter(Boolean)
					.join(' ')
			}}
		>
			{previas.map((r) => rotulo(r, 'izq'))}
			{rotulo(final)}
			{[...previas].reverse().map((r) => rotulo(r, 'der'))}

			{izquierda.map(columna)}
			<div className="centro">
				<div className="centro__marca">
					<img src="/marca/titulo-copa.jpg" alt="" aria-hidden="true" />
				</div>
				<div className="centro__final">{llave(final.partidas[0])}</div>
				<div className="centro__campeon">
					<Campeon campeon={cuadro.campeon} />
				</div>
			</div>
			{derecha.map(columna)}
		</div>
	);
});

export default Cuadro;
