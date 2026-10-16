/**
 * Las llamadas a /api y el pase del panel.
 *
 * El pase se guarda en el navegador para no pedir el PIN cada vez que se
 * recarga la página en medio de la jornada. Vence solo (14 horas).
 */
const CLAVE_PASE = 'fixture128:pase';

export function leerPase() {
	try {
		const guardado = JSON.parse(localStorage.getItem(CLAVE_PASE) ?? 'null');
		if (guardado?.pase && guardado.vence > Date.now()) return guardado;
	} catch {
		/* almacenamiento bloqueado: se pide el PIN */
	}
	return null;
}

export function guardarPase(datos) {
	try {
		localStorage.setItem(CLAVE_PASE, JSON.stringify(datos));
	} catch {
		/* sin almacenamiento el pase vive mientras la pestaña esté abierta */
	}
}

export function olvidarPase() {
	try {
		localStorage.removeItem(CLAVE_PASE);
	} catch {
		/* nada que borrar */
	}
}

export class ErrorApi extends Error {
	constructor(mensaje, estado) {
		super(mensaje);
		this.estado = estado;
	}
}

async function pedir(ruta, opciones = {}) {
	let res;
	try {
		res = await fetch(ruta, { cache: 'no-store', ...opciones });
	} catch {
		throw new ErrorApi('Sin conexión. Revisa el internet e intenta de nuevo.', 0);
	}
	const datos = await res.json().catch(() => ({}));
	if (!res.ok) throw new ErrorApi(datos.error || `Error ${res.status}`, res.status);
	return datos;
}

export const obtenerTorneo = (fresco = false) =>
	pedir(fresco ? `/api/torneo?fresco=${Date.now()}` : '/api/torneo');

export const ingresar = (pin) =>
	pedir('/api/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ pin })
	});

function conPase(ruta, cuerpo) {
	return pedir(ruta, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${leerPase()?.pase ?? ''}`
		},
		body: JSON.stringify(cuerpo)
	});
}

/** La lista leída del Excel subido, o (desdeRepo) la del Excel que está en datos/ del repo. */
export const publicarJugadores = (jugadores, archivo, desdeRepo = false) =>
	conPase('/api/jugadores', desdeRepo ? { desdeRepo: true } : { jugadores, archivo });
export const editarJugador = (datos) => conPase('/api/jugador', datos);
export const guardarPartida = (datos) => conPase('/api/partida', datos);
