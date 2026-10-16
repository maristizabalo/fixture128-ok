import { useEffect, useRef, useState } from 'react';
import { REFRESCO_SEGUNDOS, TORNEO } from '../config.js';
import { useTorneo } from '../lib/useTorneo.js';
import Encabezado, { Patrocinadores } from '../componentes/Encabezado.jsx';
import Marcador, { UltimosResultados } from '../componentes/Marcador.jsx';
import Visor from '../componentes/Visor.jsx';
import DetallePartida from '../componentes/DetallePartida.jsx';
import Confeti from '../componentes/Confeti.jsx';
import './Publico.css';

/** Cómo está cada partida, en una línea, para saber qué cambió entre refrescos. */
const firma = (p) => `${p.estado}|${p.ganador ?? ''}|${p.pa ?? ''}|${p.pb ?? ''}|${p.mesa ?? ''}|${p.a?.id ?? ''}|${p.b?.id ?? ''}`;

/** Las partidas que cambiaron con el último refresco, durante unos segundos. */
function useRecientes(cuadro) {
	const antes = useRef(null);
	const [recientes, setRecientes] = useState(() => new Set());

	useEffect(() => {
		const ahora = new Map([...cuadro.porId.values()].map((p) => [p.id, firma(p)]));
		const previo = antes.current;
		antes.current = ahora;
		if (!previo || previo.size !== ahora.size) return undefined;
		const cambiadas = new Set([...ahora].filter(([id, f]) => previo.get(id) !== f).map(([id]) => id));
		if (!cambiadas.size) return undefined;
		setRecientes(cambiadas);
		const fin = setTimeout(() => setRecientes(new Set()), 6000);
		return () => clearTimeout(fin);
	}, [cuadro]);

	return recientes;
}

export default function Publico() {
	const { estado, cuadro, error, ultima } = useTorneo({ segundos: REFRESCO_SEGUNDOS });
	const [abierta, setAbierta] = useState(null);
	const recientes = useRecientes(cuadro);
	const hay = cuadro.rondas.length > 0;

	return (
		<>
			<Encabezado />
			<main className="publico">
				{!estado && !error && <p className="publico__cargando">Cargando el fixture…</p>}

				{!estado && error && (
					<div className="publico__vacio panel">
						<p className="display">No se pudo cargar el fixture</p>
						<p>{error}</p>
					</div>
				)}

				{estado && !hay && (
					<div className="publico__vacio panel">
						<p className="publico__vacio-titulo display cromo">El fixture se publica muy pronto</p>
						<p>
							Aquí vas a ver el cuadro de los {TORNEO.cupos} jugadores de la {TORNEO.nombre} y los resultados
							en vivo, mesa por mesa. La página se actualiza sola.
						</p>
					</div>
				)}

				{hay && (
					<>
						<Marcador cuadro={cuadro} ultima={ultima} error={error} />
						<UltimosResultados cuadro={cuadro} onAbrir={(p) => setAbierta(p.id)} />
						<Visor cuadro={cuadro} recientes={recientes} onAbrir={(p) => setAbierta(p.id)} />
					</>
				)}
			</main>
			<Patrocinadores />

			{abierta && cuadro.porId.get(abierta) && (
				<DetallePartida p={cuadro.porId.get(abierta)} cuadro={cuadro} onCerrar={() => setAbierta(null)} />
			)}
			<Confeti campeon={cuadro.campeon} />
		</>
	);
}
