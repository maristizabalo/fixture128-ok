/**
 * POST /api/jugador { id, nombre, categoria, club } — corrige los datos de un
 * jugador (un apellido mal escrito, la categoría) sin tocar resultados.
 */
import { actualizarJugadores } from '../server/almacen.js';
import { cuerpo, fallo, responder, ruta, sinCache } from '../server/http.js';
import { fijarSiVieneDelRepo, leerTorneo, torneoDesde } from '../server/torneo.js';
import { limpiarJugador } from '../server/validar.js';

export default ruta(
	['POST'],
	async (req, res) => {
		const datos = cuerpo(req);
		const estado = await leerTorneo();
		const i = estado.jugadores.findIndex((j) => j?.id === datos.id);
		if (i < 0) return fallo(res, 404, 'Ese jugador no está en el cuadro');
		const nuevo = limpiarJugador({ ...estado.jugadores[i], ...datos }, i);
		if (!nuevo) return fallo(res, 400, 'El nombre no puede quedar vacío');

		await fijarSiVieneDelRepo(estado);
		const jugadores = [...estado.jugadores];
		jugadores[i] = nuevo;
		const nuevoEstado = await actualizarJugadores(jugadores, `Jugador corregido: llave ${nuevo.llave} ${nuevo.nombre}`);
		responder(res, 200, await torneoDesde(nuevoEstado), sinCache);
	},
	{ admin: true }
);
