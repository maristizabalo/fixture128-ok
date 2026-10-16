/**
 * POST /api/login { pin } — entrega el pase del panel si el PIN es correcto.
 */
import { emitirPase, pinCorrecto } from '../server/auth.js';
import { cuerpo, fallo, responder, ruta, sinCache } from '../server/http.js';

const espera = (ms) => new Promise((listo) => setTimeout(listo, ms));

export default ruta(['POST'], async (req, res) => {
	const { pin } = cuerpo(req);
	if (!pinCorrecto(String(pin ?? '').trim())) {
		// Un respiro antes de contestar: probar el millón de PIN posibles uno por uno
		// deja de ser una tarde de trabajo.
		await espera(700);
		return fallo(res, 401, 'PIN incorrecto');
	}
	responder(res, 200, emitirPase(), sinCache);
});
