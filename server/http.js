/**
 * Lo común a todas las funciones de /api: responder JSON, leer el cuerpo y
 * exigir el pase del panel.
 *
 * Las funciones usan la firma clásica de Vercel `(req, res)`. En Vercel el
 * cuerpo ya llega leído en `req.body`; en desarrollo lo lee el middleware de
 * vite.config.js, así que aquí se cubren los dos casos.
 */
import { esAdmin } from './auth.js';

export function responder(res, estado, datos, cabeceras = {}) {
	res.statusCode = estado;
	res.setHeader('Content-Type', 'application/json; charset=utf-8');
	for (const [k, v] of Object.entries(cabeceras)) res.setHeader(k, v);
	res.end(JSON.stringify(datos));
}

export const sinCache = { 'Cache-Control': 'no-store' };

export function fallo(res, estado, mensaje) {
	responder(res, estado, { error: mensaje }, sinCache);
}

export function cuerpo(req) {
	const b = req.body;
	if (!b) return {};
	if (typeof b === 'string') {
		try {
			return JSON.parse(b);
		} catch {
			return {};
		}
	}
	return b;
}

/**
 * Envuelve un manejador: solo los métodos indicados, con el pase si hace falta,
 * y cualquier error sale como JSON legible en vez de una página de error.
 */
export function ruta(metodos, manejador, { admin = false } = {}) {
	return async (req, res) => {
		if (!metodos.includes(req.method)) {
			res.setHeader('Allow', metodos.join(', '));
			return fallo(res, 405, 'Método no permitido');
		}
		if (admin && !esAdmin(req)) return fallo(res, 401, 'La sesión venció. Vuelve a ingresar el PIN.');
		try {
			await manejador(req, res);
		} catch (e) {
			console.error(e);
			fallo(res, 500, e?.message || 'Error inesperado');
		}
	};
}
