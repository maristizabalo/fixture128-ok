import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { normalizar, rondaActual } from '../../../shared/cuadro.js';

const FILTROS = [
	{ clave: 'pendientes', nombre: 'Por jugar', cumple: (p) => p.estado === 'lista' || p.estado === 'juego' },
	{ clave: 'juego', nombre: 'En juego', cumple: (p) => p.estado === 'juego' },
	{ clave: 'final', nombre: 'Jugadas', cumple: (p) => p.estado === 'final' },
	{ clave: 'todas', nombre: 'Todas', cumple: (p) => p.estado !== 'vacia' && p.estado !== 'bye' }
];

const ETIQUETA = { espera: 'Esperando rivales', lista: 'Por jugar', juego: 'En juego', final: 'Jugada' };

/**
 * Las partidas para cargar resultados. Arranca en lo que hay por jugar de la
 * ronda en curso, que es lo que se busca el 90 % de las veces.
 */
export default function Partidas({ cuadro, onEditar }) {
	const [filtro, setFiltro] = useState('pendientes');
	const [ronda, setRonda] = useState('todas');
	const [consulta, setConsulta] = useState('');

	const actual = rondaActual(cuadro);
	const todas = useMemo(() => [...cuadro.porId.values()], [cuadro]);
	const cuenta = (f) => todas.filter(f.cumple).length;

	const lista = useMemo(() => {
		const f = FILTROS.find((x) => x.clave === filtro);
		const q = normalizar(consulta);
		const numero = Number(q.replace(/^p/, ''));
		return todas.filter((p) => {
			if (!f.cumple(p)) return false;
			if (ronda !== 'todas' && p.ronda !== Number(ronda)) return false;
			if (!q) return true;
			if (Number.isInteger(numero) && numero > 0 && /^p?\d+$/.test(q)) return p.numero === numero || String(p.mesa ?? '') === q;
			return normalizar(`${p.a?.nombre ?? ''} ${p.b?.nombre ?? ''}`).includes(q);
		});
	}, [todas, filtro, ronda, consulta]);

	const porRonda = useMemo(() => {
		const grupos = new Map();
		for (const p of lista) {
			if (!grupos.has(p.ronda)) grupos.set(p.ronda, []);
			grupos.get(p.ronda).push(p);
		}
		return [...grupos];
	}, [lista]);

	return (
		<section className="partidas">
			<div className="partidas__filtros">
				<div className="segmentos" role="group" aria-label="Filtrar partidas">
					{FILTROS.map((f) => (
						<button key={f.clave} type="button" aria-pressed={filtro === f.clave} onClick={() => setFiltro(f.clave)}>
							{f.nombre} <span className="partidas__cuenta tabular">{cuenta(f)}</span>
						</button>
					))}
				</div>
				<select className="campo partidas__ronda" value={ronda} onChange={(e) => setRonda(e.target.value)} aria-label="Ronda">
					<option value="todas">Todas las rondas</option>
					{cuadro.rondas.map((r) => (
						<option key={r.indice} value={r.indice}>
							{r.nombre}
							{actual?.indice === r.indice ? ' (en curso)' : ''}
						</option>
					))}
				</select>
				<div className="partidas__buscar">
					<Search size={16} aria-hidden="true" />
					<input
						className="campo"
						type="search"
						placeholder="Jugador, P12 o mesa…"
						value={consulta}
						onChange={(e) => setConsulta(e.target.value)}
						aria-label="Buscar partida"
					/>
				</div>
			</div>

			{porRonda.length === 0 && <p className="partidas__vacio">No hay partidas con ese filtro.</p>}

			{porRonda.map(([r, partidas]) => (
				<div key={r} className="partidas__grupo">
					<h3 className="partidas__titulo ancha">
						{cuadro.rondas[r].nombre} <span className="tabular">{partidas.length}</span>
					</h3>
					<div className="partidas__lista">
						{partidas.map((p) => {
							const editable = p.a && p.b;
							return (
								<button
									key={p.id}
									type="button"
									className={`fila fila--${p.estado}`}
									onClick={() => editable && onEditar(p)}
									disabled={!editable}
								>
									<span className="fila__cabeza">
										<span className="fila__num ancha">P{p.numero}</span>
										{p.estado === 'juego' ? (
											<span className="vivo">{p.mesa ? `Mesa ${p.mesa}` : 'En juego'}</span>
										) : (
											<span className="fila__estado ancha">
												{ETIQUETA[p.estado]}
												{p.mesa && p.estado !== 'juego' ? ` · Mesa ${p.mesa}` : ''}
												{p.wo ? ' · W.O.' : ''}
											</span>
										)}
									</span>
									{[
										[p.a, p.pa, p.origenA],
										[p.b, p.pb, p.origenB]
									].map(([j, pts, origen], i) => (
										<span
											key={i}
											className={`fila__lado ${p.estado === 'final' && p.ganador === j?.id ? 'fila__lado--gana' : ''} ${p.estado === 'final' && p.ganador !== j?.id ? 'fila__lado--fuera' : ''}`}
										>
											<span className="fila__nombre">{j?.nombre ?? (origen ? `Ganador P${origen}` : 'Libre')}</span>
											{j?.categoria && <span className="chip-cat">{j.categoria}</span>}
											<span className="fila__pts tabular">{p.estado === 'final' ? (pts ?? '') : ''}</span>
										</span>
									))}
								</button>
							);
						})}
					</div>
				</div>
			))}
		</section>
	);
}
