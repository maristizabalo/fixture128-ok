/**
 * El cuadro de eliminación directa, armado a partir de lo guardado.
 *
 * Lo guardado es poco: la lista de jugadores en el orden de las llaves y un
 * registro por partida jugada (o en juego). Todo lo demás —quién juega contra
 * quién en cada ronda, quién pasa por BYE, quién es campeón— se deduce aquí.
 *
 * Lo usan la página pública, el panel y la API. Que sea el mismo código en los
 * tres sitios es lo que garantiza que el servidor valida exactamente el cuadro
 * que se ve en pantalla.
 *
 * Forma de lo guardado:
 *   jugadores: Array<{ id, nombre, categoria?, club?, llave } | null>
 *              (null = cupo libre, el rival pasa directo)
 *   partidas:  { [id]: { a, b, estado: 'juego'|'final', ganador?, pa?, pb?,
 *                        entradas?, wo?, mesa?, en? } }
 *
 * Cada registro guarda también quiénes jugaban (a y b). Si después se corrige
 * un resultado anterior y por esa llave ya no llegan los mismos, el registro deja
 * de valer solo: nunca se le apunta un resultado a quien no jugó esa partida.
 */

export const idPartida = (ronda, indice) => `${ronda}-${indice}`;

export function tamanoCuadro(n) {
	let t = 2;
	while (t < n) t *= 2;
	return t;
}

export function nombreRonda(partidas) {
	if (partidas === 1) return 'Final';
	if (partidas === 2) return 'Semifinal';
	if (partidas === 4) return 'Cuartos de final';
	if (partidas === 8) return 'Octavos de final';
	if (partidas === 16) return 'Dieciseisavos';
	return `Ronda de ${partidas * 2}`;
}

export function nombreCortoRonda(partidas) {
	if (partidas === 1) return 'Final';
	if (partidas === 2) return 'Semis';
	if (partidas === 4) return 'Cuartos';
	if (partidas === 8) return 'Octavos';
	if (partidas === 16) return '16avos';
	return `R${partidas * 2}`;
}

/** La partida siguiente: a dónde va el ganador. */
export function siguienteDe(ronda, indice) {
	return { ronda: ronda + 1, indice: Math.floor(indice / 2), lado: indice % 2 === 0 ? 'a' : 'b' };
}

export function armarCuadro(estado) {
	const jugadores = estado?.jugadores ?? [];
	const registros = estado?.partidas ?? {};
	const vacio = { rondas: [], porId: new Map(), campeon: null, total: 0, jugadas: 0, enJuego: 0 };
	if (jugadores.length < 2) return vacio;

	const porId = new Map();
	const rondas = [];
	// Lo que entra a cada llave de la ronda: un jugador, un cupo libre o nada
	// todavía (la partida de la que sale no se ha jugado).
	let entradas = jugadores.map((j) => ({ jugador: j ?? null, libre: !j, origen: null }));
	let numero = 0;
	let r = 0;

	while (entradas.length >= 2) {
		const n = entradas.length / 2;
		const partidas = [];
		const siguientes = [];

		for (let i = 0; i < n; i++) {
			numero++;
			const A = entradas[2 * i];
			const B = entradas[2 * i + 1];
			const p = {
				id: idPartida(r, i),
				ronda: r,
				indice: i,
				numero,
				a: A.jugador,
				b: B.jugador,
				libreA: A.libre,
				libreB: B.libre,
				origenA: A.origen,
				origenB: B.origen,
				estado: 'espera',
				ganador: null,
				pa: null,
				pb: null,
				entradas: null,
				wo: false,
				mesa: null,
				en: null
			};

			if (A.libre && B.libre) p.estado = 'vacia';
			else if (A.libre && B.jugador) Object.assign(p, { estado: 'bye', ganador: B.jugador.id });
			else if (B.libre && A.jugador) Object.assign(p, { estado: 'bye', ganador: A.jugador.id });
			else if (A.jugador && B.jugador) {
				p.estado = 'lista';
				const reg = registros[p.id];
				if (reg && reg.a === A.jugador.id && reg.b === B.jugador.id) {
					p.mesa = reg.mesa ?? null;
					p.en = reg.en ?? null;
					if (reg.estado === 'final' && (reg.ganador === reg.a || reg.ganador === reg.b)) {
						Object.assign(p, {
							estado: 'final',
							ganador: reg.ganador,
							pa: reg.pa ?? null,
							pb: reg.pb ?? null,
							entradas: reg.entradas ?? null,
							wo: !!reg.wo
						});
					} else if (reg.estado === 'juego') {
						p.estado = 'juego';
					}
				}
			}

			const ganador = p.ganador ? (p.a?.id === p.ganador ? p.a : p.b) : null;
			siguientes.push({ jugador: ganador, libre: p.estado === 'vacia', origen: numero });
			partidas.push(p);
			porId.set(p.id, p);
		}

		rondas.push({ indice: r, nombre: nombreRonda(n), corto: nombreCortoRonda(n), partidas });
		entradas = siguientes;
		r++;
	}

	const final = rondas.at(-1).partidas[0];
	const campeon = final.ganador ? (final.a?.id === final.ganador ? final.a : final.b) : null;

	let jugadas = 0;
	let enJuego = 0;
	for (const p of porId.values()) {
		if (p.estado === 'final') jugadas++;
		if (p.estado === 'juego') enJuego++;
	}
	// Cada partida de verdad elimina a uno y un BYE a nadie, así que las
	// partidas que se van a jugar son siempre una menos que los inscritos.
	const inscritos = jugadores.filter(Boolean).length;
	const total = Math.max(inscritos - 1, 0);

	return { rondas, porId, campeon, total, jugadas, enJuego, inscritos };
}

/** La primera ronda con algo pendiente: es la que se está jugando. */
export function rondaActual(cuadro) {
	return (
		cuadro.rondas.find((r) => r.partidas.some((p) => p.estado === 'lista' || p.estado === 'juego' || p.estado === 'espera')) ??
		cuadro.rondas.at(-1) ??
		null
	);
}

/**
 * Los registros que ya no corresponden al cuadro: los de partidas cuyos
 * jugadores cambiaron porque se corrigió algo antes. Se borran para que no
 * resuciten si la corrección se deshace.
 */
export function registrosHuerfanos(estado) {
	const cuadro = armarCuadro(estado);
	const huerfanos = [];
	for (const [id, reg] of Object.entries(estado?.partidas ?? {})) {
		const p = cuadro.porId.get(id);
		if (!p || !reg || p.a?.id !== reg.a || p.b?.id !== reg.b) huerfanos.push(id);
	}
	return huerfanos;
}

/**
 * Lo que se pierde al cambiar o borrar el resultado de una partida: las
 * partidas siguientes del mismo camino que ya tienen registro. Para avisar
 * antes de tocar nada.
 */
export function partidasAfectadas(cuadro, id) {
	const p = cuadro.porId.get(id);
	if (!p) return [];
	const afectadas = [];
	let { ronda, indice } = p;
	for (;;) {
		const sig = siguienteDe(ronda, indice);
		const q = cuadro.porId.get(idPartida(sig.ronda, sig.indice));
		if (!q || (q.estado !== 'final' && q.estado !== 'juego')) break;
		afectadas.push(q);
		({ ronda, indice } = q);
	}
	return afectadas;
}

export function ganadorDe(p) {
	if (!p?.ganador) return null;
	return p.a?.id === p.ganador ? p.a : p.b;
}

export function promedio(puntos, entradas) {
	if (puntos == null || !entradas) return null;
	return puntos / entradas;
}

/** Para buscar sin que importen tildes ni mayúsculas. */
export function normalizar(texto) {
	return String(texto ?? '')
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.toLowerCase()
		.replace(/\s+/g, ' ')
		.trim();
}
