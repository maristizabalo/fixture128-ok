import { useCallback, useEffect, useState } from 'react';
import { Delete, Eye } from 'lucide-react';
import Encabezado from '../Encabezado.jsx';
import { ingresar } from '../../lib/api.js';

const LARGO = 6;

/**
 * La puerta del panel: seis dígitos con teclado grande, para escribirlo con el
 * pulgar de pie junto a la mesa. También funciona con el teclado del
 * computador. Al completar el sexto dígito se envía solo.
 */
export default function Pin({ onIngreso }) {
	const [pin, setPin] = useState('');
	const [error, setError] = useState('');
	const [enviando, setEnviando] = useState(false);
	const [sacude, setSacude] = useState(false);

	const pulsar = useCallback(
		(d) => {
			if (enviando) return;
			setError('');
			setPin((antes) => (antes.length >= LARGO ? antes : antes + d));
		},
		[enviando]
	);
	const borrar = useCallback(() => !enviando && setPin((antes) => antes.slice(0, -1)), [enviando]);

	useEffect(() => {
		if (pin.length !== LARGO) return;
		let vigente = true;
		setEnviando(true);
		ingresar(pin)
			.then((pase) => vigente && onIngreso(pase))
			.catch((e) => {
				if (!vigente) return;
				setError(e.message);
				setPin('');
				setSacude(true);
				setTimeout(() => setSacude(false), 500);
			})
			.finally(() => vigente && setEnviando(false));
		return () => {
			vigente = false;
		};
	}, [pin, onIngreso]);

	useEffect(() => {
		const tecla = (e) => {
			if (/^\d$/.test(e.key)) pulsar(e.key);
			else if (e.key === 'Backspace') borrar();
		};
		window.addEventListener('keydown', tecla);
		return () => window.removeEventListener('keydown', tecla);
	}, [pulsar, borrar]);

	return (
		<>
			<Encabezado compacto />
			<main className="pin">
				<div className={`pin__caja panel ${sacude ? 'pin__caja--sacude' : ''}`}>
					<p className="pin__titulo display cromo">Panel de resultados</p>
					<p className="pin__sub">Ingresa el PIN de 6 dígitos</p>

					<div className="pin__puntos" aria-live="polite" aria-label={`${pin.length} de ${LARGO} dígitos`}>
						{Array.from({ length: LARGO }, (_, i) => (
							<span key={i} className={i < pin.length ? 'lleno' : ''} />
						))}
					</div>

					<p className="pin__error" role="alert">
						{enviando ? 'Verificando…' : error}
					</p>

					<div className="teclado">
						{['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
							<button key={d} type="button" onClick={() => pulsar(d)}>
								{d}
							</button>
						))}
						<a className="teclado__link" href="/" aria-label="Ver el fixture público">
							<Eye size={20} />
						</a>
						<button type="button" onClick={() => pulsar('0')}>
							0
						</button>
						<button type="button" onClick={borrar} aria-label="Borrar">
							<Delete size={22} />
						</button>
					</div>
				</div>
			</main>
		</>
	);
}
