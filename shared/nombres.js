/**
 * Los nombres como caben en una casilla del cuadro.
 *
 * En el cuadro compiten 128 nombres por el mismo ancho. En vez de cortar con
 * puntos suspensivos ("Juan Carlos Pérez G…") se abrevia por el medio, que es
 * como se escriben a mano en una planilla de torneo: "Juan C. Pérez G.". El
 * nombre completo sigue en el detalle de la partida y al pasar el mouse.
 */
const PARTICULAS = new Set(['de', 'del', 'la', 'las', 'los', 'y', 'da', 'van', 'von']);

const inicial = (palabra) => `${[...palabra][0].toUpperCase()}.`;

export function nombreCorto(nombre, maximo = 19) {
	const limpio = String(nombre ?? '').trim();
	if (limpio.length <= maximo) return limpio;
	const partes = limpio.split(/\s+/).filter((p) => !PARTICULAS.has(p.toLowerCase()));
	if (partes.length < 2) return limpio;

	// Orden de sacrificio: el último apellido, después los segundos nombres. El
	// primer nombre y el primer apellido se quedan enteros mientras se pueda.
	const orden = [];
	if (partes.length >= 3) orden.push(partes.length - 1);
	for (let i = 1; i < partes.length - (partes.length >= 3 ? 2 : 1); i++) orden.push(i);
	if (partes.length === 2) orden.push(0);

	const resultado = [...partes];
	for (const i of orden) {
		if (resultado.join(' ').length <= maximo) break;
		resultado[i] = inicial(partes[i]);
	}
	return resultado.join(' ');
}

/** NOMBRES EN MAYÚSCULA (como suelen venir del Excel) pasan a Nombre Propio. */
export function nombrePropio(texto) {
	const t = String(texto ?? '')
		.replace(/\s+/g, ' ')
		.trim();
	if (!t) return '';
	const mayus = t === t.toUpperCase();
	const minus = t === t.toLowerCase();
	if (!mayus && !minus) return t;
	return t
		.toLowerCase()
		.split(' ')
		.map((p, i) => (i > 0 && PARTICULAS.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
		.join(' ');
}
