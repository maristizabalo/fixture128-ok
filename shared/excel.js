/**
 * Lectura del Excel del fixture.
 *
 * El mismo código lee el archivo que se sube desde el panel (en el navegador)
 * y el que se deja en `datos/` dentro del repo (en el servidor). No depende de
 * la librería de Excel: recibe las filas ya sacadas de la hoja, así cada lado
 * trae SheetJS a su manera.
 *
 * Se aceptan dos formas, y se reconocen solas por los encabezados:
 *
 *  1. Lista: una fila por jugador, en el orden de las llaves (la 1 juega
 *     contra la 2, la 3 contra la 4…). Si hay una columna Llave / Posición /
 *     N°, se respeta ese número en lugar del orden de las filas.
 *        Llave | Jugador | Categoría | Club
 *
 *  2. Parejas: una fila por partida de la primera ronda.
 *        Partida | Jugador 1 | Cat | Jugador 2 | Cat
 *
 * Un cupo vacío o escrito BYE / LIBRE queda libre: su rival pasa directo.
 */
import { tamanoCuadro, normalizar } from './cuadro.js';
import { nombrePropio } from './nombres.js';

const LIBRE = /^(bye|libre|vacio|-+|—|–|w\.?\s?o\.?|x|n\/a)$/;

const ES = {
	// "N° jugador", "Cédula jugador" o "Teléfono" no son la columna de nombres.
	nombre: (t) =>
		/(jugador|nombre|participante|deportista|competidor|player)/.test(t) &&
		!/(n[°º]|\bno\.|\bnum|numero|#|\bid\b|cedula|documento|telefono|celular|edad|correo|email)/.test(t),
	llave: (t) => /^(llave|posicion|pos\.?|n[°ºo]?\.?|#|orden|cupo|sorteo|puesto|seed|siembra|numero|num\.?)$/.test(t),
	categoria: (t) => /(categor|^cat\.?\b)/.test(t),
	club: (t) => /(club|ciudad|liga|equipo|departamento|region|sede)/.test(t),
	partida: (t) => /^(partida|match|juego|cruce|llave|n[°ºo]?\.?|#|orden)$/.test(t)
};

export const MAXIMO = 256;

/** "2", "2a", "segunda", "Categoría 2" → "2da". Lo demás queda como venga. */
export function categoriaCorta(valor) {
	const t = normalizar(valor);
	if (!t) return null;
	const tabla = [
		[/\b(1|1a|1ra|1era|primera)\b/, '1ra'],
		[/\b(2|2a|2da|segunda)\b/, '2da'],
		[/\b(3|3a|3ra|3era|tercera)\b/, '3ra'],
		[/\b(4|4a|4ta|cuarta)\b/, '4ta'],
		[/\b(5|5a|5ta|quinta)\b/, '5ta']
	];
	for (const [patron, corta] of tabla) if (patron.test(t)) return corta;
	return String(valor).trim().slice(0, 20);
}

const celda = (v) => (v == null ? '' : String(v).replace(/\s+/g, ' ').trim());

function esLibre(v) {
	const t = normalizar(v);
	return !t || LIBRE.test(t);
}

function aEntero(v) {
	const n = Number(String(v).replace(/[^\d.]/g, ''));
	return Number.isInteger(n) && n > 0 ? n : null;
}

/** La fila de encabezados: la primera, entre las quince de arriba, que nombre a los jugadores. */
function buscarEncabezado(filas) {
	for (let f = 0; f < Math.min(filas.length, 15); f++) {
		const textos = filas[f].map((v) => normalizar(v));
		if (textos.some(ES.nombre)) return { fila: f, textos };
	}
	return null;
}

/** Sin encabezados: la columna de nombres es la que trae texto; la de números, la llave. */
function adivinarColumnas(filas) {
	const ancho = Math.max(...filas.map((f) => f.length), 0);
	let nombre = -1;
	let llave = -1;
	for (let c = 0; c < ancho; c++) {
		const valores = filas.map((f) => celda(f[c])).filter(Boolean);
		if (!valores.length) continue;
		const numericos = valores.filter((v) => aEntero(v) != null).length;
		if (nombre < 0 && numericos / valores.length < 0.3) nombre = c;
		if (llave < 0 && numericos / valores.length > 0.9) llave = c;
	}
	return { nombre, llave };
}

/** La columna de categoría o club que le corresponde a una columna de nombre. */
function columnaJunto(textos, desde, hasta, prueba) {
	for (let c = desde + 1; c < hasta; c++) if (prueba(textos[c])) return c;
	return -1;
}

export function leerFilas(filasCrudas) {
	const filas = (filasCrudas ?? []).map((f) => (Array.isArray(f) ? f : []));
	const avisos = [];
	const encabezado = buscarEncabezado(filas);
	let datos;
	let formato;
	let cupos;

	if (encabezado) {
		const { textos } = encabezado;
		datos = filas.slice(encabezado.fila + 1);
		const nombres = textos.map((t, c) => (ES.nombre(t) ? c : -1)).filter((c) => c >= 0);

		if (nombres.length >= 2) {
			// Parejas: cada fila es una partida de la primera ronda.
			formato = 'parejas';
			const [c1, c2] = nombres;
			const lados = [
				{ nombre: c1, cat: columnaJunto(textos, c1, c2, ES.categoria), club: columnaJunto(textos, c1, c2, ES.club) },
				{
					nombre: c2,
					cat: columnaJunto(textos, c2, textos.length, ES.categoria),
					club: columnaJunto(textos, c2, textos.length, ES.club)
				}
			];
			const colPartida = textos.findIndex((t, c) => c < c1 && ES.partida(t));
			let parejas = datos
				.filter((f) => celda(f[c1]) || celda(f[c2]))
				.map((f, i) => ({ orden: colPartida >= 0 ? (aEntero(f[colPartida]) ?? i + 1) : i + 1, f }));
			parejas.sort((x, y) => x.orden - y.orden);
			cupos = parejas.flatMap(({ f }) => lados.map((l) => cupoDe(f, l.nombre, l.cat, l.club)));
		} else {
			formato = 'lista';
			const cNombre = nombres[0];
			const cLlave = textos.findIndex((t, c) => c !== cNombre && ES.llave(t));
			const cCat = textos.findIndex(ES.categoria);
			const cClub = textos.findIndex((t, c) => c !== cNombre && ES.club(t));
			cupos = lista(datos, { nombre: cNombre, llave: cLlave, cat: cCat, club: cClub }, avisos);
		}
	} else {
		formato = 'lista';
		datos = filas;
		const { nombre, llave } = adivinarColumnas(filas);
		if (nombre < 0) throw new Error('No encontré una columna con nombres de jugadores.');
		avisos.push('El archivo no tiene encabezados: tomé la primera columna con texto como nombres.');
		cupos = lista(datos, { nombre, llave, cat: -1, club: -1 }, avisos);
	}

	// Sin cupos de sobra al final: las filas vacías de abajo no son cupos libres.
	while (cupos.length && cupos.at(-1) === null) cupos.pop();

	const inscritos = cupos.filter(Boolean).length;
	if (inscritos < 2) throw new Error('El archivo necesita al menos dos jugadores.');
	if (cupos.length > MAXIMO) throw new Error(`El cuadro admite hasta ${MAXIMO} cupos y el archivo trae ${cupos.length}.`);

	const tamano = tamanoCuadro(cupos.length);
	while (cupos.length < tamano) cupos.push(null);
	const libres = tamano - inscritos;

	const vistos = new Map();
	for (const j of cupos) {
		if (!j) continue;
		const clave = normalizar(j.nombre);
		vistos.set(clave, (vistos.get(clave) ?? 0) + 1);
	}
	const repetidos = [...vistos].filter(([, n]) => n > 1).map(([k]) => cupos.find((j) => j && normalizar(j.nombre) === k).nombre);
	if (repetidos.length) avisos.push(`Nombres repetidos: ${repetidos.join(', ')}.`);
	if (libres > 0) avisos.push(`${libres} cupo${libres === 1 ? '' : 's'} libre${libres === 1 ? '' : 's'} (BYE): su rival pasa directo.`);

	return { cupos, tamano, inscritos, libres, avisos, formato };
}

function cupoDe(fila, cNombre, cCat, cClub) {
	const nombre = celda(fila[cNombre]);
	if (esLibre(nombre)) return null;
	return {
		nombre: nombrePropio(nombre).slice(0, 80),
		categoria: cCat >= 0 ? categoriaCorta(fila[cCat]) : null,
		club: cClub >= 0 ? celda(fila[cClub]).slice(0, 60) || null : null
	};
}

function lista(datos, col, avisos) {
	const filas = datos.filter((f) => celda(f[col.nombre]) || (col.llave >= 0 && aEntero(f[col.llave])));
	const conLlave = col.llave >= 0 ? filas.map((f) => aEntero(f[col.llave])) : [];
	const llavesValidas =
		col.llave >= 0 &&
		conLlave.every((n) => n != null && n <= MAXIMO) &&
		new Set(conLlave).size === conLlave.length;

	if (col.llave >= 0 && !llavesValidas) {
		avisos.push('La columna de llave tiene números repetidos o vacíos: usé el orden de las filas.');
	}

	if (!llavesValidas) return filas.map((f) => cupoDe(f, col.nombre, col.cat, col.club));

	const cupos = [];
	filas.forEach((f, i) => {
		cupos[conLlave[i] - 1] = cupoDe(f, col.nombre, col.cat, col.club);
	});
	return Array.from({ length: cupos.length }, (_, i) => cupos[i] ?? null);
}

/**
 * Un libro entero: se queda con la primera hoja que tenga jugadores. `XLSX` es
 * la librería SheetJS que traiga quien llama.
 */
export function leerLibro(libro, XLSX) {
	let primerError = null;
	for (const nombre of libro.SheetNames) {
		const filas = XLSX.utils.sheet_to_json(libro.Sheets[nombre], { header: 1, defval: '', raw: false });
		try {
			return { ...leerFilas(filas), hoja: nombre };
		} catch (e) {
			primerError ??= e;
		}
	}
	throw primerError ?? new Error('El archivo no tiene hojas con datos.');
}
