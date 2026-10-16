/**
 * El Excel en el navegador del panel: leer el archivo subido, bajar la
 * plantilla y exportar el fixture con los resultados.
 *
 * SheetJS se carga solo al usarlo: pesa más que toda la página pública.
 * La lectura en sí es la de shared/excel.js, la misma que usa el servidor con
 * el Excel que está en el repo.
 */
import { leerLibro } from '../../shared/excel.js';
import { ganadorDe, promedio } from '../../shared/cuadro.js';

let modulo = null;
const sheetjs = async () => (modulo ??= await import('xlsx'));

export async function leerArchivo(archivo) {
	const XLSX = await sheetjs();
	const libro = XLSX.read(await archivo.arrayBuffer(), { type: 'array' });
	return leerLibro(libro, XLSX);
}

export async function descargarPlantilla(cupos = 128) {
	const XLSX = await sheetjs();
	const filas = [['Llave', 'Jugador', 'Categoría', 'Club'], ...Array.from({ length: cupos }, (_, i) => [i + 1, '', '', ''])];
	const hoja = XLSX.utils.aoa_to_sheet(filas);
	hoja['!cols'] = [{ wch: 7 }, { wch: 36 }, { wch: 11 }, { wch: 24 }];

	const ayuda = XLSX.utils.aoa_to_sheet([
		['Cómo llenar el fixture'],
		[''],
		['1. Una fila por jugador, en la hoja "Fixture".'],
		['2. La llave es la posición en el cuadro: la 1 juega contra la 2, la 3 contra la 4, y así.'],
		['3. Un cupo sin jugador se deja vacío o con BYE: su rival pasa directo.'],
		['4. Categoría: 2da o 3ra. Club es opcional.'],
		['5. Súbelo en el panel (/admin → Jugadores) o déjalo como datos/fixture.xlsx en el repo.'],
		[''],
		['También se acepta una fila por partida: Partida | Jugador 1 | Categoría | Jugador 2 | Categoría.']
	]);
	ayuda['!cols'] = [{ wch: 90 }];

	const libro = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(libro, hoja, 'Fixture');
	XLSX.utils.book_append_sheet(libro, ayuda, 'Instrucciones');
	XLSX.writeFile(libro, `plantilla-fixture-${cupos}.xlsx`);
}

const ESTADO = { espera: 'Esperando', lista: 'Por jugar', juego: 'En juego', final: 'Finalizada', bye: 'BYE', vacia: 'Vacía' };

/** Todo el torneo en un Excel: una hoja de partidas y una de jugadores. */
export async function exportarResultados(cuadro, nombre = 'fixture-copa-dm14') {
	const XLSX = await sheetjs();

	const partidas = [
		['Partida', 'Ronda', 'Mesa', 'Estado', 'Llave A', 'Jugador A', 'Cat. A', 'Carambolas A', 'Llave B', 'Jugador B', 'Cat. B', 'Carambolas B', 'Entradas', 'Prom. A', 'Prom. B', 'Ganador', 'W.O.', 'Hora']
	];
	for (const ronda of cuadro.rondas) {
		for (const p of ronda.partidas) {
			if (p.estado === 'vacia') continue;
			const pa = promedio(p.pa, p.entradas);
			const pb = promedio(p.pb, p.entradas);
			partidas.push([
				p.numero,
				ronda.nombre,
				p.mesa ?? '',
				ESTADO[p.estado],
				p.a?.llave ?? '',
				p.a?.nombre ?? (p.libreA ? 'BYE' : ''),
				p.a?.categoria ?? '',
				p.pa ?? '',
				p.b?.llave ?? '',
				p.b?.nombre ?? (p.libreB ? 'BYE' : ''),
				p.b?.categoria ?? '',
				p.pb ?? '',
				p.entradas ?? '',
				pa != null ? Number(pa.toFixed(3)) : '',
				pb != null ? Number(pb.toFixed(3)) : '',
				ganadorDe(p)?.nombre ?? '',
				p.wo ? 'Sí' : '',
				p.en ? new Date(p.en).toLocaleString('es-CO') : ''
			]);
		}
	}

	// Hasta dónde llegó cada uno: su última partida.
	const ultima = new Map();
	for (const ronda of cuadro.rondas) for (const p of ronda.partidas) for (const j of [p.a, p.b]) if (j) ultima.set(j.id, p);
	const jugadores = [['Llave', 'Jugador', 'Categoría', 'Club', 'Ronda alcanzada', 'Situación']];
	const lista = [];
	for (const p of cuadro.rondas[0]?.partidas ?? []) for (const j of [p.a, p.b]) if (j) lista.push(j);
	for (const j of lista.sort((x, y) => x.llave - y.llave)) {
		const p = ultima.get(j.id);
		const situacion =
			cuadro.campeon?.id === j.id
				? 'Campeón'
				: p?.estado === 'final' && p.ganador !== j.id
					? 'Eliminado'
					: 'Sigue en carrera';
		jugadores.push([j.llave, j.nombre, j.categoria ?? '', j.club ?? '', cuadro.rondas[p?.ronda ?? 0]?.nombre ?? '', situacion]);
	}

	const libro = XLSX.utils.book_new();
	const h1 = XLSX.utils.aoa_to_sheet(partidas);
	h1['!cols'] = [6, 16, 6, 11, 7, 30, 7, 12, 7, 30, 7, 12, 9, 8, 8, 30, 6, 18].map((wch) => ({ wch }));
	const h2 = XLSX.utils.aoa_to_sheet(jugadores);
	h2['!cols'] = [6, 34, 10, 22, 18, 16].map((wch) => ({ wch }));
	XLSX.utils.book_append_sheet(libro, h1, 'Partidas');
	XLSX.utils.book_append_sheet(libro, h2, 'Jugadores');
	const fecha = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
	XLSX.writeFile(libro, `${nombre}-${fecha}.xlsx`);
}
