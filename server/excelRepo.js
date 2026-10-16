/**
 * El Excel que vive dentro del repo, en `datos/`.
 *
 * Basta con dejar ahí `fixture.xlsx` (o cualquier .xlsx/.xls/.csv) y desplegar:
 * mientras no se haya publicado otra lista desde el panel, el cuadro sale de
 * ese archivo. Se lee con el mismo lector que usa el panel (shared/excel.js).
 *
 * vercel.json incluye la carpeta `datos/` en las funciones; sin eso el archivo
 * no viajaría con ellas.
 */
import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import * as XLSX from 'xlsx';
import { leerLibro } from '../shared/excel.js';

const CARPETA = path.join(process.cwd(), 'datos');
const EXCEL = /\.(xlsx|xlsm|xls|csv)$/i;

let memoria = null;

async function buscarArchivo() {
	let archivos;
	try {
		archivos = await readdir(CARPETA);
	} catch {
		return null;
	}
	// Los "~$fixture.xlsx" son el candado que deja Excel con el archivo abierto.
	const validos = archivos.filter((a) => EXCEL.test(a) && !a.startsWith('~$'));
	return validos.find((a) => /^fixture\./i.test(a)) ?? validos.sort()[0] ?? null;
}

/** Lo leído del Excel del repo, o null si no hay. Los errores de lectura se devuelven, no se lanzan. */
export async function excelDelRepo() {
	const nombre = await buscarArchivo();
	if (!nombre) return null;
	const ruta = path.join(CARPETA, nombre);
	const { mtimeMs } = await stat(ruta);
	if (memoria?.ruta === ruta && memoria.mtimeMs === mtimeMs) return memoria.datos;

	let datos;
	try {
		const libro = XLSX.read(await readFile(ruta), { type: 'buffer' });
		datos = { ...leerLibro(libro, XLSX), archivo: `datos/${nombre}` };
	} catch (e) {
		datos = { archivo: `datos/${nombre}`, error: e.message };
	}
	memoria = { ruta, mtimeMs, datos };
	return datos;
}
