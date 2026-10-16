/**
 * El PIN del panel y el pase que se entrega al acertarlo.
 *
 * El PIN se compara solo en el servidor; al navegador nunca llega. Al
 * acertarlo se entrega un pase firmado que vale 14 horas (una jornada larga de
 * billar) y que el panel manda en cada cambio.
 *
 * Cambiar ADMIN_PIN en Vercel invalida todos los pases entregados: la firma
 * depende del PIN.
 */
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';

const PIN = String(process.env.ADMIN_PIN || '951209');
const SECRETO = `${process.env.AUTH_SECRET || 'fixture128'}:${PIN}`;
const DURACION = 14 * 60 * 60 * 1000;

const firmar = (texto) => createHmac('sha256', SECRETO).update(texto).digest('base64url');
const huella = (texto) => createHash('sha256').update(String(texto)).digest();

export function pinCorrecto(pin) {
	return timingSafeEqual(huella(pin), huella(PIN));
}

export function emitirPase() {
	const vence = Date.now() + DURACION;
	return { pase: `${vence}.${firmar(String(vence))}`, vence };
}

export function paseValido(pase) {
	const [vence, firma] = String(pase ?? '').split('.');
	if (!vence || !firma || Number(vence) < Date.now()) return false;
	const esperada = Buffer.from(firmar(vence));
	const recibida = Buffer.from(firma);
	return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
}

export function esAdmin(req) {
	const cabecera = req.headers?.authorization ?? '';
	return paseValido(cabecera.replace(/^Bearer\s+/i, ''));
}
