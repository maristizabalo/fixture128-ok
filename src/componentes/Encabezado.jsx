import { PATROCINADORES, TORNEO } from '../config.js';
import './Encabezado.css';

/**
 * La cabeza de la página: el título tal cual sale en el afiche, recortado de
 * la imagen y fundido con el fondo, con la fecha encima como en el afiche.
 */
export default function Encabezado({ compacto = false, children }) {
	return (
		<header className={`hero ${compacto ? 'hero--compacto' : ''}`}>
			<p className="hero__fecha ancha">{TORNEO.fechas}</p>
			<h1 className="hero__titulo">
				<img
					src="/marca/titulo-copa.jpg"
					alt={`${TORNEO.categorias} · ${TORNEO.nombre}`}
					width="1079"
					height="385"
					fetchPriority="high"
				/>
			</h1>
			{!compacto && (
				<p className="hero__bajada">
					<span className="hero__etiqueta ancha">Fixture oficial</span>
					<span className="hero__dato ancha">
						{TORNEO.cupos} jugadores · {TORNEO.sede}
					</span>
				</p>
			)}
			{children}
		</header>
	);
}

/** Los logos del pie del afiche, recortados de la imagen original. */
export function Patrocinadores() {
	return (
		<footer className="patrocinadores">
			<ul className="patrocinadores__lista">
				{PATROCINADORES.map((p) => (
					<li key={p.logo}>
						<img src={p.logo} alt={p.nombre} loading="lazy" />
					</li>
				))}
			</ul>
		</footer>
	);
}
