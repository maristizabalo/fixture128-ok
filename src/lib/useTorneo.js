import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { armarCuadro } from '../../shared/cuadro.js';
import { obtenerTorneo } from './api.js';

/**
 * El torneo, pedido de nuevo cada cierto tiempo.
 *
 * Solo se vuelve a dibujar cuando cambia la versión: con el cuadro puesto en el
 * televisor del club toda la noche, cada refresco sin novedades no mueve nada.
 * Con la pestaña escondida no se pide nada, y al volver se pide enseguida.
 */
export function useTorneo({ segundos = 20, fresco = false } = {}) {
	const [estado, setEstadoCrudo] = useState(null);
	const [error, setError] = useState(null);
	const [ultima, setUltima] = useState(null);
	const version = useRef(null);

	const setEstado = useCallback((nuevo) => {
		version.current = nuevo?.version ?? null;
		setEstadoCrudo(nuevo);
		setUltima(Date.now());
	}, []);

	const cargar = useCallback(async () => {
		try {
			const datos = await obtenerTorneo(fresco);
			setError(null);
			setUltima(Date.now());
			if (datos.version !== version.current) {
				version.current = datos.version;
				setEstadoCrudo(datos);
			}
		} catch (e) {
			setError(e.message);
		}
	}, [fresco]);

	useEffect(() => {
		cargar();
		if (!segundos) return undefined;
		const reloj = setInterval(() => {
			if (document.visibilityState === 'visible') cargar();
		}, segundos * 1000);
		const alVolver = () => document.visibilityState === 'visible' && cargar();
		document.addEventListener('visibilitychange', alVolver);
		return () => {
			clearInterval(reloj);
			document.removeEventListener('visibilitychange', alVolver);
		};
	}, [cargar, segundos]);

	const cuadro = useMemo(() => armarCuadro(estado), [estado]);

	return { estado, cuadro, error, ultima, recargar: cargar, setEstado };
}

/** "hace 12 s", que se actualiza solo. */
export function useHace(momento) {
	const [, tic] = useState(0);
	useEffect(() => {
		const reloj = setInterval(() => tic((n) => n + 1), 1000);
		return () => clearInterval(reloj);
	}, []);
	return hace(momento);
}

export function hace(momento) {
	if (!momento) return '';
	const s = Math.max(0, Math.round((Date.now() - new Date(momento).getTime()) / 1000));
	if (s < 5) return 'ahora';
	if (s < 60) return `hace ${s} s`;
	const m = Math.round(s / 60);
	if (m < 60) return `hace ${m} min`;
	const h = Math.round(m / 60);
	if (h < 24) return `hace ${h} h`;
	return new Date(momento).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}
