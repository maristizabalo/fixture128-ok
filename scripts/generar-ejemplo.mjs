/**
 * Genera un Excel de ejemplo con 128 jugadores inventados, para probar la
 * carga sin tener todavía la lista real.
 *
 *   npm run ejemplo
 *
 * Sale en ejemplos/fixture-128-ejemplo.xlsx. No se deja en datos/ a propósito:
 * lo que hay en datos/ es lo que se publica.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';

const NOMBRES = [
	'Juan', 'Carlos', 'Andrés', 'Luis', 'Jorge', 'Diego', 'Óscar', 'Fabián', 'Miguel', 'Hernán',
	'Jhon', 'Wilson', 'Édgar', 'Mauricio', 'Camilo', 'Alexander', 'Fernando', 'Ricardo', 'Iván', 'Nelson',
	'Gustavo', 'Javier', 'Sebastián', 'Alberto', 'Julián', 'Freddy', 'Henry', 'Rubén', 'Orlando', 'Germán'
];
const SEGUNDOS = ['', '', '', 'Felipe', 'David', 'Eduardo', 'Alberto', 'José', 'Iván', 'Mario'];
const APELLIDOS = [
	'Rodríguez', 'Gómez', 'González', 'Martínez', 'García', 'López', 'Hernández', 'Sánchez', 'Ramírez', 'Pérez',
	'Díaz', 'Muñoz', 'Rojas', 'Moreno', 'Jiménez', 'Vargas', 'Castro', 'Ortiz', 'Romero', 'Suárez',
	'Mahecha', 'Cárdenas', 'Quintero', 'Ospina', 'Arango', 'Bermúdez', 'Cifuentes', 'Zapata', 'Restrepo', 'Galvis'
];
const CLUBES = ['Club OK', 'Club 8', 'Billares La 70', 'Club Bolívar', 'Billares El Dorado', 'Club Ases'];

// Siempre los mismos nombres: un generador con semilla fija.
let semilla = 128;
const azar = (n) => {
	semilla = (semilla * 1103515245 + 12345) % 2147483648;
	return semilla % n;
};

const usados = new Set();
const filas = [['Llave', 'Jugador', 'Categoría', 'Club']];
for (let llave = 1; llave <= 128; llave++) {
	let nombre;
	do {
		const segundo = SEGUNDOS[azar(SEGUNDOS.length)];
		nombre = [NOMBRES[azar(NOMBRES.length)], segundo, APELLIDOS[azar(APELLIDOS.length)], APELLIDOS[azar(APELLIDOS.length)]]
			.filter(Boolean)
			.join(' ')
			.toUpperCase();
	} while (usados.has(nombre));
	usados.add(nombre);
	filas.push([llave, nombre, azar(3) === 0 ? '2da' : '3ra', CLUBES[azar(CLUBES.length)]]);
}

const hoja = XLSX.utils.aoa_to_sheet(filas);
hoja['!cols'] = [{ wch: 7 }, { wch: 36 }, { wch: 11 }, { wch: 22 }];
const libro = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(libro, hoja, 'Fixture');

mkdirSync('ejemplos', { recursive: true });
writeFileSync('ejemplos/fixture-128-ejemplo.xlsx', XLSX.write(libro, { type: 'buffer', bookType: 'xlsx' }));
console.log('Listo: ejemplos/fixture-128-ejemplo.xlsx (128 jugadores)');
