/**
 * Dónde vive el torneo. Tres opciones, todas gratis; se elige sola según las
 * variables de entorno que haya:
 *
 *  1. GitHub (GITHUB_TOKEN): un JSON dentro del mismo repo, en la rama
 *     `datos-torneo` (archivo `torneo.json`). No hace falta ningún servicio
 *     más: cada cambio es un commit en esa rama, así que además queda el
 *     historial de todo lo que se cargó. vercel.json desactiva los despliegues
 *     de esa rama para que un resultado no redespliegue la página.
 *
 *  2. Redis de Upstash (KV_REST_API_URL + KV_REST_API_TOKEN): se conecta desde
 *     Storage en Vercel. Plan gratis.
 *
 *  3. Archivo local en `.datos/`: es lo que se usa en la computadora con
 *     `npm run dev`. En Vercel no sirve, porque ahí no se pueden escribir
 *     archivos.
 *
 * Con GitHub y con el archivo, todo el torneo es un solo JSON. Cada cambio lee
 * el JSON, lo modifica y lo escribe; si alguien más escribió en el medio (dos
 * mesas cargando a la vez), GitHub rechaza la escritura y se vuelve a intentar
 * sobre lo más nuevo, así que nadie pisa a nadie.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';

const PREFIJO = process.env.FIXTURE_PREFIJO || 'fixture128';

const GH_TOKEN = process.env.GITHUB_TOKEN || process.env.FIXTURE_GITHUB_TOKEN || '';
const GH_REPO =
	process.env.GITHUB_REPO ||
	(process.env.VERCEL_GIT_REPO_OWNER && process.env.VERCEL_GIT_REPO_SLUG
		? `${process.env.VERCEL_GIT_REPO_OWNER}/${process.env.VERCEL_GIT_REPO_SLUG}`
		: 'maristizabalo/fixture128-ok');
const GH_RAMA = process.env.GITHUB_RAMA || 'datos-torneo';
const GH_RUTA = `${PREFIJO === 'fixture128' ? 'torneo' : PREFIJO}.json`;

const URL_REDIS = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const TOKEN_REDIS = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

export const almacen = GH_TOKEN ? 'github' : URL_REDIS && TOKEN_REDIS ? 'redis' : 'archivo';

/** Lo que se muestra en el panel para saber dónde se está guardando. */
export const donde =
	almacen === 'github'
		? `JSON en GitHub: ${GH_REPO} · rama ${GH_RAMA} · ${GH_RUTA}`
		: almacen === 'redis'
			? 'Redis de Upstash'
			: process.env.VERCEL
				? null
				: 'Archivo local .datos/';

const vacio = () => ({ version: 0, actualizado: null, jugadores: [], meta: {}, partidas: {} });

function ultimaFecha(estado) {
	let ultima = estado.actualizado ?? null;
	for (const p of Object.values(estado.partidas ?? {})) if (p?.en && (!ultima || p.en > ultima)) ultima = p.en;
	return { ...estado, actualizado: ultima };
}

const espera = (ms) => new Promise((listo) => setTimeout(listo, ms));

class Conflicto extends Error {}

// ================================================================= GitHub

const API = 'https://api.github.com';

async function gh(ruta, opciones = {}) {
	const res = await fetch(`${API}${ruta}`, {
		...opciones,
		headers: {
			Authorization: `Bearer ${GH_TOKEN}`,
			Accept: 'application/vnd.github+json',
			'X-GitHub-Api-Version': '2022-11-28',
			'User-Agent': 'fixture128',
			...(opciones.body ? { 'Content-Type': 'application/json' } : {}),
			...opciones.headers
		}
	});
	return res;
}

async function errorGh(res, que) {
	const datos = await res.json().catch(() => ({}));
	if (res.status === 401) return new Error('GitHub rechazó el token (GITHUB_TOKEN vencido o mal copiado).');
	if (res.status === 403 || res.status === 404) {
		return new Error(
			`GitHub no deja ${que} en ${GH_REPO}. Revisa que el token tenga acceso a ese repo con permiso Contents: Read and write.`
		);
	}
	return new Error(`GitHub respondió ${res.status} al ${que}: ${datos.message ?? 'sin detalle'}`);
}

// Lo último leído, con su ETag: si nada cambió, GitHub contesta 304 y esa
// respuesta no gasta del límite de peticiones.
let enMemoria = null;

async function leerGithub() {
	const url = `/repos/${GH_REPO}/contents/${encodeURIComponent(GH_RUTA)}?ref=${encodeURIComponent(GH_RAMA)}`;
	const res = await gh(url, { headers: enMemoria?.etag ? { 'If-None-Match': enMemoria.etag } : {} });
	if (res.status === 304 && enMemoria) return { estado: structuredClone(enMemoria.estado), sha: enMemoria.sha };
	if (res.status === 404) {
		// Ni la rama ni el archivo existen todavía: es el primer día.
		enMemoria = null;
		return { estado: vacio(), sha: null };
	}
	if (!res.ok) throw await errorGh(res, 'leer los datos');
	const datos = await res.json();
	const estado = { ...vacio(), ...JSON.parse(Buffer.from(datos.content ?? '', 'base64').toString('utf8') || '{}') };
	enMemoria = { etag: res.headers.get('etag'), sha: datos.sha, estado };
	return { estado: structuredClone(estado), sha: datos.sha };
}

/** La rama de datos sale de la rama principal la primera vez que se escribe. */
async function crearRama() {
	const repo = await gh(`/repos/${GH_REPO}`);
	if (!repo.ok) throw await errorGh(repo, 'leer el repo');
	const { default_branch: principal } = await repo.json();
	const ref = await gh(`/repos/${GH_REPO}/git/ref/heads/${encodeURIComponent(principal)}`);
	if (!ref.ok) throw await errorGh(ref, 'leer la rama principal');
	const { object } = await ref.json();
	const nueva = await gh(`/repos/${GH_REPO}/git/refs`, {
		method: 'POST',
		body: JSON.stringify({ ref: `refs/heads/${GH_RAMA}`, sha: object.sha })
	});
	// 422: otra petición la creó en el mismo instante. Da igual quién gane.
	if (!nueva.ok && nueva.status !== 422) throw await errorGh(nueva, 'crear la rama de datos');
}

async function escribirGithub(estado, sha, motivo) {
	const cuerpo = {
		message: `${motivo} [skip ci]`,
		content: Buffer.from(`${JSON.stringify(estado, null, '\t')}\n`).toString('base64'),
		branch: GH_RAMA,
		...(sha ? { sha } : {})
	};
	const ruta = `/repos/${GH_REPO}/contents/${encodeURIComponent(GH_RUTA)}`;
	const poner = () => gh(ruta, { method: 'PUT', body: JSON.stringify(cuerpo) });
	let res = await poner();

	// La primera vez la rama de datos no existe todavía.
	if (!sha && (res.status === 404 || res.status === 422)) {
		const { message = '' } = await res.clone().json().catch(() => ({}));
		if (res.status === 404 || /branch/i.test(message)) {
			await crearRama();
			res = await poner();
		}
	}
	// 409: el archivo cambió desde que se leyó. 422 sin sha: ya lo creó otro.
	if (res.status === 409 || (res.status === 422 && !sha)) throw new Conflicto();
	if (!res.ok) throw await errorGh(res, 'guardar los datos');

	const datos = await res.json();
	enMemoria = { etag: null, sha: datos.content?.sha, estado };
}

// ================================================================= archivo

const ARCHIVO = path.join(process.cwd(), '.datos', `${PREFIJO}.json`);

async function leerArchivo() {
	try {
		return { ...vacio(), ...JSON.parse(await fs.readFile(ARCHIVO, 'utf8')) };
	} catch {
		return vacio();
	}
}

async function escribirArchivo(estado) {
	if (process.env.VERCEL) {
		throw new Error(
			'Vercel no deja guardar archivos. Agrega GITHUB_TOKEN en Settings → Environment Variables y redespliega (ver README).'
		);
	}
	await fs.mkdir(path.dirname(ARCHIVO), { recursive: true });
	await fs.writeFile(ARCHIVO, JSON.stringify(estado, null, '\t'));
}

/**
 * Leer, cambiar y escribir el JSON del torneo. Si otra persona escribió en el
 * medio, se repite con lo más nuevo.
 */
async function modificar(cambio, motivo) {
	if (almacen === 'archivo') {
		const nuevo = cambio(await leerArchivo());
		await escribirArchivo(nuevo);
		return ultimaFecha(nuevo);
	}
	for (let intento = 0; ; intento++) {
		// Lo que esta misma función acaba de escribir sirve de punto de partida:
		// si otro escribió después, GitHub rechaza el sha viejo y se relee.
		const { estado, sha } =
			intento === 0 && enMemoria?.sha
				? { estado: structuredClone(enMemoria.estado), sha: enMemoria.sha }
				: await leerGithub();
		const nuevo = cambio(estado);
		try {
			await escribirGithub(nuevo, sha, motivo);
			return ultimaFecha(nuevo);
		} catch (e) {
			if (!(e instanceof Conflicto) || intento >= 5) {
				throw e instanceof Conflicto ? new Error('Muchos cambios a la vez. Intenta de nuevo.') : e;
			}
			enMemoria = null;
			await espera(250 + Math.random() * 400 * (intento + 1));
		}
	}
}

// =================================================================== Redis

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

function deResultados(respuestas) {
	return respuestas.map((r) => {
		if (r?.error) throw new Error(`Redis: ${r.error}`);
		return r?.result;
	});
}

const lote = async (comandos) => deResultados(await redis('/pipeline', comandos));
const transaccion = async (comandos) => deResultados(await redis('/multi-exec', comandos));

// Con Redis las partidas van en un hash, un campo por partida: dos mesas
// distintas escriben campos distintos y no se pisan.
const K = {
	jugadores: `${PREFIJO}:jugadores`,
	partidas: `${PREFIJO}:partidas`,
	version: `${PREFIJO}:version`
};

async function leerRedis() {
	const [jugadoresTxt, plano, version] = await lote([['GET', K.jugadores], ['HGETALL', K.partidas], ['GET', K.version]]);
	const guardado = jugadoresTxt ? JSON.parse(jugadoresTxt) : null;
	const partidas = {};
	for (let i = 0; i + 1 < (plano?.length ?? 0); i += 2) partidas[plano[i]] = JSON.parse(plano[i + 1]);
	return {
		...vacio(),
		version: Number(version ?? 0),
		actualizado: guardado?.actualizado ?? null,
		jugadores: guardado?.jugadores ?? [],
		meta: guardado?.meta ?? {},
		partidas
	};
}

// ===================================================================== API

export async function leerEstado() {
	if (almacen === 'redis') return ultimaFecha(await leerRedis());
	if (almacen === 'github') return ultimaFecha((await leerGithub()).estado);
	return ultimaFecha(await leerArchivo());
}

/** Publica una lista nueva. Los resultados anteriores se borran. Devuelve el estado nuevo. */
export async function reemplazarJugadores(jugadores, meta) {
	const ahora = new Date().toISOString();
	if (almacen === 'redis') {
		await transaccion([
			['SET', K.jugadores, JSON.stringify({ jugadores, meta, actualizado: ahora })],
			['DEL', K.partidas],
			['INCR', K.version]
		]);
		return leerEstado();
	}
	return modificar(
		(e) => ({ ...e, jugadores, meta, partidas: {}, version: e.version + 1, actualizado: ahora }),
		`Lista publicada: ${meta?.archivo ?? 'Excel'}`
	);
}

/** Corrige los datos de los jugadores sin tocar resultados. */
export async function actualizarJugadores(jugadores, motivo = 'Jugador corregido') {
	const ahora = new Date().toISOString();
	if (almacen === 'redis') {
		const [txt] = await lote([['GET', K.jugadores]]);
		const guardado = txt ? JSON.parse(txt) : {};
		await transaccion([
			['SET', K.jugadores, JSON.stringify({ ...guardado, jugadores, actualizado: ahora })],
			['INCR', K.version]
		]);
		return leerEstado();
	}
	return modificar((e) => ({ ...e, jugadores, version: e.version + 1, actualizado: ahora }), motivo);
}

/** Guarda o borra registros de partidas: `{ [id]: registro | null }`. */
export async function escribirPartidas(cambios, motivo = 'Resultado') {
	const poner = Object.entries(cambios).filter(([, v]) => v);
	const quitar = Object.entries(cambios)
		.filter(([, v]) => !v)
		.map(([id]) => id);

	if (almacen === 'redis') {
		const comandos = [];
		if (poner.length) comandos.push(['HSET', K.partidas, ...poner.flatMap(([id, v]) => [id, JSON.stringify(v)])]);
		if (quitar.length) comandos.push(['HDEL', K.partidas, ...quitar]);
		comandos.push(['INCR', K.version]);
		await transaccion(comandos);
		return leerEstado();
	}
	return modificar((e) => {
		const partidas = { ...e.partidas };
		for (const [id, v] of poner) partidas[id] = v;
		for (const id of quitar) delete partidas[id];
		return { ...e, partidas, version: e.version + 1 };
	}, motivo);
}
