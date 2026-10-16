import { useEffect, useRef, useState } from 'react';

const COLORES = ['#21abf4', '#65bdf2', '#eef9fc', '#236cca', '#ffffff', '#b7d3e2'];

/**
 * Confeti cuando aparece el campeón. Con el refresco automático puede pasar
 * sin que nadie toque nada: entra el último resultado y el televisor del club
 * se pone a celebrar solo. Una vez por campeón, no en cada refresco.
 */
export default function Confeti({ campeon }) {
	const [piezas, setPiezas] = useState([]);
	const celebrado = useRef(null);

	useEffect(() => {
		const id = campeon?.id ?? null;
		if (!id) {
			celebrado.current = null;
			return;
		}
		if (id === celebrado.current) return;
		celebrado.current = id;
		setPiezas(
			Array.from({ length: 110 }, (_, i) => ({
				i,
				x: Math.random() * 100,
				color: COLORES[i % COLORES.length],
				giro: Math.random() * 720 - 360,
				retraso: Math.random() * 2.2,
				duracion: 3.6 + Math.random() * 2.6,
				deriva: Math.random() * 160 - 80
			}))
		);
	}, [campeon?.id]);

	// Se retiran solas: el televisor queda encendido toda la noche.
	useEffect(() => {
		if (!piezas.length) return undefined;
		const fin = setTimeout(() => setPiezas([]), 9500);
		return () => clearTimeout(fin);
	}, [piezas]);

	if (!piezas.length) return null;
	return (
		<div className="confeti" aria-hidden="true">
			{piezas.map((p) => (
				<span
					key={p.i}
					style={{
						left: `${p.x}%`,
						background: p.color,
						'--giro': `${p.giro}deg`,
						'--deriva': `${p.deriva}px`,
						animationDelay: `${p.retraso}s`,
						animationDuration: `${p.duracion}s`
					}}
				/>
			))}
		</div>
	);
}
