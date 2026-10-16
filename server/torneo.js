/**
 * El torneo tal como se muestra: lo publicado y, si todavía no se ha publicado
 * nada, la lista del Excel que está en el repo.
 *
 * En cuanto se carga el primer resultado sobre la lista del repo, esa lista se
 * fija en la base de datos. Así un cambio posterior del archivo no mueve a
 * nadie de llave con partidas ya jugadas; para cambiarla está el panel.
 */
import { leerEstado, reemplazarJugadores } from './almacen.js';
import { excelDelRepo } from './excelRepo.js';
import { limpiarJugador } from './validar.js';

function resumenRepo(repo) {
	if (!repo) return null;
	if (repo.error) return { archivo: repo.archivo, error: repo.error };
	const { archivo, tamano, inscritos, libres, avisos, formato, hoja } = repo;
	return { archivo, tamano, inscritos, libres, avisos, formato, hoja };
}

export async function leerTorneo() {
	const [estado, repo] = await Promise.all([leerEstado(), excelDelRepo().catch(() => null)]);
	const excelRepo = resumenRepo(repo);

	if (estado.jugadores.length) return { ...estado, origen: 'publicado', excelRepo };
	if (!repo || repo.error) return { ...estado, origen: 'vacio', excelRepo };

	return {
		...estado,
		origen: 'repo',
		jugadores: repo.cupos.map((j, i) => limpiarJugador(j, i)),
		meta: { archivo: repo.archivo, tamano: repo.tamano, cargado: null },
		excelRepo
	};
}

/** Antes de escribir sobre la lista del repo, se publica tal cual. */
export async function fijarSiVieneDelRepo(estado) {
	if (estado.origen !== 'repo') return;
	await reemplazarJugadores(estado.jugadores, { ...estado.meta, cargado: new Date().toISOString() });
}
