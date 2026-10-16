/**
 * POST /api/partida — lo que pasa en una mesa.
 *
 *   { id, accion: 'juego', mesa }                         la partida empieza
 *   { id, accion: 'final', ganador, pa, pb, entradas,
 *     wo, mesa }                                          resultado
 *   { id, accion: 'limpiar' }                             se borra lo cargado
 *
 * Se valida contra el cuadro armado con lo guardado, el mismo que se ve en
 * pantalla: solo se carga una partida que ya tiene a sus dos jugadores, y solo
 * puede ganar uno de ellos. Si un cambio deja sin efecto partidas siguientes
 * (se corrigió quién pasó), esos registros se borran en el mismo paso.
 */
import { armarCuadro, registrosHuerfanos } from '../shared/cuadro.js';
import { escribirPartidas } from '../server/almacen.js';
import { cuerpo, fallo, responder, ruta, sinCache } from '../server/http.js';
import { fijarSiVieneDelRepo, leerTorneo, torneoDesde } from '../server/torneo.js';
import { entero, texto } from '../server/validar.js';

export default ruta(
	['POST'],
	async (req, res) => {
		const datos = cuerpo(req);
		const estado = await leerTorneo();
		const p = armarCuadro(estado).porId.get(String(datos.id ?? ''));
		if (!p) return fallo(res, 404, 'Esa partida no existe');
		if (!p.a || !p.b || p.estado === 'bye' || p.estado === 'vacia') {
			return fallo(res, 409, 'Esta partida todavía no tiene a sus dos jugadores');
		}

		const ahora = new Date().toISOString();
		const base = { a: p.a.id, b: p.b.id, mesa: texto(datos.mesa, 12), en: ahora };
		let registro;

		if (datos.accion === 'limpiar') {
			registro = null;
		} else if (datos.accion === 'juego') {
			registro = { ...base, estado: 'juego' };
		} else if (datos.accion === 'final') {
			if (datos.ganador !== p.a.id && datos.ganador !== p.b.id) {
				return fallo(res, 400, 'Indica quién ganó la partida');
			}
			registro = {
				...base,
				estado: 'final',
				ganador: datos.ganador,
				pa: entero(datos.pa),
				pb: entero(datos.pb),
				entradas: entero(datos.entradas),
				wo: Boolean(datos.wo)
			};
		} else {
			return fallo(res, 400, 'Acción desconocida');
		}

		const partidas = { ...estado.partidas, [p.id]: registro };
		if (!registro) delete partidas[p.id];
		const cambios = { [p.id]: registro };
		for (const id of registrosHuerfanos({ ...estado, partidas })) cambios[id] = null;

		const que = { final: 'resultado', juego: 'en juego', limpiar: 'borrada' }[datos.accion];
		const marcador = registro?.estado === 'final' ? ` ${registro.pa ?? '-'}-${registro.pb ?? '-'}` : '';
		const motivo = `P${p.numero} ${que}: ${p.a.nombre} vs ${p.b.nombre}${marcador}`;

		await fijarSiVieneDelRepo(estado);
		const nuevo = await escribirPartidas(cambios, motivo);
		responder(res, 200, await torneoDesde(nuevo), sinCache);
	},
	{ admin: true }
);
