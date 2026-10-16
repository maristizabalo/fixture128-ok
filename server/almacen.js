/**
 * Dónde vive el torneo.
 *
 * En Vercel, en Redis de Upstash (se conecta desde el Marketplace de Vercel y
 * las variables llegan solas). Se le habla por su API REST con `fetch`, así que
 * no hace falta ninguna librería.
 *
 * En la computadora, sin Redis configurado, en un archivo JSON dentro de
 * `.datos/`. Así `npm run dev` funciona sin cuentas ni claves.
 *
 * Tres claves por torneo:
 *   <prefijo>:jugadores   la lista en orden de llaves, con su meta (JSON)
 *   <prefijo>:partidas    un hash: un campo por partida registrada
 *   <prefijo>:version     contador que sube con cada cambio
 *
 * Las partidas van en un hash y no dentro de un solo JSON para que dos personas
 * cargando resultados de mesas distintas a la vez no se pisen.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN_REDIS = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const PREFIJO = process.env.FIXTURE_PREFIJO || 'fixture128';

const K = {
	jugadores: `${PREFIJO}:jugadores`,
	partidas: `${PREFIJO}:partidas`,
	version: `${PREFIJO}:version`
};

export const usaRedis = Boolean(URL_REDIS && TOKEN_REDIS);

const vacio = () => ({ version: 0, actualizado: null, jugadores: [], meta: {}, partidas: {} });

// ------------------------------------------------------------------ Redis

async function redis(ruta, cuerpo) {
	const res = await fetch(`${URL_REDIS.replace(/\/$/, '')}${ruta}`, {
		method: 'POST',
		headers: { Authorization: `Bearer ${TOKEN_REDIS}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(cuerpo)
	});
	const datos = await res.json().catch(() => null);
	if (!res.ok) throw new Error(`Redis respondió ${res.status}: ${datos?.error ?? 'sin detalle'}`);
	return datos;
}

const lote = (comandos) => redis('/pipeline', comandos);
const transaccion = async (comandos) => deResultados(await redis('/multi-exec', comandos));

function deResultados(respuestas) {
	return respuestas.map((r) => {
		if (r?.error) throw new Error(`Redis: ${r.error}`);
		return r?.result;
	});
}

async function leerRedis() {
	const [jugadoresTxt, plano, version] = deResultados(
		await lote([['GET', K.jugadores], ['HGETALL', K.partidas], ['GET', K.version]])
	);
	const guardado = jugadoresTxt ? JSON.parse(jugadoresTxt) : null;
	const partidas = {};
	for (let i = 0; i + 1 < (plano?.length ?? 0); i += 2) partidas[plano[i]] = JSON.parse(plano[i + 1]);
	return {
		...vacio(),
		version: Number(version ?? 0),
		actualizado: guardado?.actualizado ?? null,
		jugadores: guardado?.jugadores ?? [],
		meta: guardado?.meta ?? {},
		partidas,
		// La fecha del último cambio va con los jugadores y con cada partida; la
		// más nueva de todas es la del torneo.
		...ultimaFecha(guardado?.actualizado, partidas)
	};
}

function ultimaFecha(base, partidas) {
	let ultima = base ?? null;
	for (const p of Object.values(partidas)) if (p?.en && (!ultima || p.en > ultima)) ultima = p.en;
	return { actualizado: ultima };
}

// ---------------------------------------------------------------- archivo

const ARCHIVO = path.join(process.cwd(), '.datos', `${PREFIJO}.json`);

async function leerArchivo() {
	try {
		const estado = { ...vacio(), ...JSON.parse(await fs.readFile(ARCHIVO, 'utf8')) };
		return { ...estado, ...ultimaFecha(estado.actualizado, estado.partidas) };
	} catch {
		return vacio();
	}
}

async function escribirArchivo(estado) {
	if (process.env.VERCEL) {
		throw new Error(
			'Falta conectar la base de datos: en Vercel ve a Storage → Upstash (Redis) y conéctala a este proyecto.'
		);
	}
	await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
	await fs.writeFile(ARCHIVO, JSON.stringify(estado, null, '\t'));
}

// ------------------------------------------------------------------- API

export async function leerEstado() {
	return usaRedis ? leerRedis() : leerArchivo();
}

/** Publica una lista nueva. Los resultados anteriores se borran. */
export async function reemplazarJugadores(jugadores, meta) {
	const ahora = new Date().toISOString();
	if (usaRedis) {
		await transaccion([
			['SET', K.jugadores, JSON.stringify({ jugadores, meta, actualizado: ahora })],
			['DEL', K.partidas],
			['INCR', K.version]
		]);
		return;
	}
	const estado = await leerArchivo();
	await escribirArchivo({
		...estado,
		jugadores,
		meta,
		partidas: {},
		version: estado.version + 1,
		actualizado: ahora
	});
}

/** Corrige los datos de un jugador sin tocar resultados. */
export async function actualizarJugadores(jugadores) {
	const ahora = new Date().toISOString();
	if (usaRedis) {
		const [txt] = deResultados(await lote([['GET', K.jugadores]]));
		const guardado = txt ? JSON.parse(txt) : {};
		await transaccion([
			['SET', K.jugadores, JSON.stringify({ ...guardado, jugadores, actualizado: ahora })],
			['INCR', K.version]
		]);
		return;
	}
	const estado = await leerArchivo();
	await escribirArchivo({ ...estado, jugadores, version: estado.version + 1, actualizado: ahora });
}

/**
 * Guarda o borra registros de partidas: `{ [id]: registro | null }`.
 * Solo toca los campos indicados, así que dos mesas distintas no se pisan.
 */
export async function escribirPartidas(cambios) {
	const poner = Object.entries(cambios).filter(([, v]) => v);
	const quitar = Object.entries(cambios)
		.filter(([, v]) => !v)
		.map(([id]) => id);

	if (usaRedis) {
		const comandos = [];
		if (poner.length) comandos.push(['HSET', K.partidas, ...poner.flatMap(([id, v]) => [id, JSON.stringify(v)])]);
		if (quitar.length) comandos.push(['HDEL', K.partidas, ...quitar]);
		comandos.push(['INCR', K.version]);
		await transaccion(comandos);
		return;
	}
	const estado = await leerArchivo();
	const partidas = { ...estado.partidas };
	for (const [id, v] of poner) partidas[id] = v;
	for (const id of quitar) delete partidas[id];
	await escribirArchivo({ ...estado, partidas, version: estado.version + 1 });
}
