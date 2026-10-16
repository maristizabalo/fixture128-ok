/** Limpieza de lo que llega del panel antes de guardarlo. */

export function texto(valor, maximo) {
	const t = String(valor ?? '')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, maximo);
	return t || null;
}

/** Un número de carambolas o de entradas: entero, sin signo, o nada. */
export function entero(valor) {
	if (valor === '' || valor == null) return null;
	const n = Number(valor);
	if (!Number.isFinite(n) || n < 0) return null;
	return Math.min(Math.round(n), 9999);
}

/** Un cupo del cuadro: el jugador con su llave, o null si el cupo va libre. */
export function limpiarJugador(j, i) {
	const nombre = texto(j?.nombre, 80);
	if (!nombre) return null;
	return {
		id: `j${i + 1}`,
		llave: i + 1,
		nombre,
		categoria: texto(j.categoria, 20),
		club: texto(j.club, 60)
	};
}
