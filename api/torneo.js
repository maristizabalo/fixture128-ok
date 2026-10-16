/**
 * GET /api/torneo — el estado completo del torneo, para la página pública y el
 * panel. El cuadro se arma en el navegador con shared/cuadro.js.
 *
 * La CDN de Vercel lo guarda unos segundos: con cien teléfonos mirando el
 * cuadro a la vez, a la base de datos le llega una lectura cada pocos segundos
 * y no cien. El panel pide `?fresco=...` para saltarse esa copia.
 */
import { responder, ruta, sinCache } from '../server/http.js';
import { leerTorneo } from '../server/torneo.js';

export default ruta(['GET'], async (req, res) => {
	const torneo = await leerTorneo();
	const fresco = String(req.url ?? '').includes('fresco=');
	responder(
		res,
		200,
		torneo,
		fresco ? sinCache : { 'Cache-Control': 'public, max-age=0, s-maxage=5, stale-while-revalidate=15' }
	);
});
