import { Trophy } from 'lucide-react';

/**
 * El final del recorrido. Está desde el primer día como un marco vacío con
 * una interrogación: es la casilla que todos miran al entrar, y tenerla ahí
 * esperando es lo que hace que el cuadro se lea como un camino.
 */
export default function Campeon({ campeon }) {
	return (
		<div className={`campeon ${campeon ? 'campeon--listo' : ''}`}>
			<div className="campeon__marco">
				{campeon ? (
					<Trophy className="campeon__copa" strokeWidth={1.4} aria-hidden="true" />
				) : (
					<span className="campeon__interrogante display" aria-hidden="true">
						?
					</span>
				)}
			</div>
			<p className="campeon__rotulo cromo ancha">Campeón</p>
			{campeon ? (
				<>
					<p className="campeon__nombre display">{campeon.nombre}</p>
					{(campeon.categoria || campeon.club) && (
						<p className="campeon__extra">
							{campeon.categoria && <span className="chip-cat">{campeon.categoria}</span>}
							{campeon.club && <span>{campeon.club}</span>}
						</p>
					)}
				</>
			) : (
				<p className="campeon__espera">Por definir</p>
			)}
		</div>
	);
}
