/**
 * POST /api/jugadores — publica la lista del cuadro.
 *
 *   { jugadores, archivo }   la lista leída del Excel subido en el panel
 *   { desdeRepo: true }      la lista del Excel que está en `datos/` del repo
 *
 * `jugadores` va en el orden de las llaves: la posición 1 juega contra la 2, la
 * 3 contra la 4, y así. Un `null` es un cupo libre: su rival pasa directo.
 * Publicar una lista nueva borra los resultados cargados.
 */
import { reemplazarJugadores } from '../server/almacen.js';
import { excelDelRepo } from '../server/excelRepo.js';
import { cuerpo, fallo, responder, ruta, sinCache } from '../server/http.js';
import { torneoDesde } from '../server/torneo.js';
import { limpiarJugador } from '../server/validar.js';

export default ruta(
	['POST'],
	async (req, res) => {
		const datos = cuerpo(req);
		let { jugadores, archivo } = datos;

		if (datos.desdeRepo) {
			const repo = await excelDelRepo();
			if (!repo) return fallo(res, 404, 'No hay ningún Excel en la carpeta datos/ del repo');
			if (repo.error) return fallo(res, 400, `${repo.archivo}: ${repo.error}`);
			jugadores = repo.cupos;
			archivo = repo.archivo;
		}

		if (!Array.isArray(jugadores)) return fallo(res, 400, 'Falta la lista de jugadores');
		const n = jugadores.length;
		if (n < 2 || n > 256 || (n & (n - 1)) !== 0) {
			return fallo(res, 400, `El cuadro tiene que ser de 2, 4, 8 … 128 o 256 cupos (llegaron ${n})`);
		}
		const lista = jugadores.map((j, i) => limpiarJugador(j, i));
		if (lista.filter(Boolean).length < 2) return fallo(res, 400, 'Hacen falta al menos dos jugadores');

		const estado = await reemplazarJugadores(lista, {
			archivo: String(archivo ?? '').slice(0, 120) || null,
			cargado: new Date().toISOString(),
			tamano: n
		});
		responder(res, 200, await torneoDesde(estado), sinCache);
	},
	{ admin: true }
);
