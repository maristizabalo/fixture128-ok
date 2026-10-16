/**
 * Llena el torneo local (.datos/) con el Excel de ejemplo y resultados
 * inventados, para ver el cuadro "a mitad de jornada" sin cargar nada a mano.
 *
 *   npm run ejemplo      (una vez, crea el Excel)
 *   npm run simular      (juega la ronda de 128, parte de la de 64 y deja 3 mesas en juego)
 *
 * Solo escribe el archivo local; nunca toca Redis.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import * as XLSX from 'xlsx';
import { leerLibro } from '../shared/excel.js';
import { armarCuadro } from '../shared/cuadro.js';

const libro = XLSX.read(readFileSync('ejemplos/fixture-128-ejemplo.xlsx'), { type: 'buffer' });
const { cupos } = leerLibro(libro, XLSX);
const jugadores = cupos.map((j, i) => j && { id: `j${i + 1}`, llave: i + 1, nombre: j.nombre, categoria: j.categoria, club: j.club });

const partidas = {};
let reloj = Date.now() - 3 * 3600e3;
const hora = () => new Date((reloj += 90e3)).toISOString();

// Toda la primera ronda, veinte de la segunda y tres mesas en juego.
for (const cuantas of [Infinity, 20]) {
	const listas = [...armarCuadro({ jugadores, partidas }).porId.values()].filter((p) => p.estado === 'lista');
	listas.slice(0, cuantas).forEach((p, k) => {
		const ganaA = (p.numero * 7 + k) % 3 !== 0;
		partidas[p.id] = {
			a: p.a.id,
			b: p.b.id,
			estado: 'final',
			ganador: ganaA ? p.a.id : p.b.id,
			pa: ganaA ? 30 : 10 + ((k * 7) % 19),
			pb: ganaA ? 8 + ((k * 5) % 21) : 30,
			entradas: 30 + ((k * 3) % 25),
			wo: false,
			mesa: String(1 + (k % 12)),
			en: hora()
		};
	});
}
const listas = [...armarCuadro({ jugadores, partidas }).porId.values()].filter((p) => p.estado === 'lista');
listas.slice(0, 3).forEach((p, k) => {
	partidas[p.id] = { a: p.a.id, b: p.b.id, estado: 'juego', mesa: String(k + 3), en: hora() };
});

mkdirSync('.datos', { recursive: true });
writeFileSync(
	'.datos/fixture128.json',
	JSON.stringify({ version: Date.now(), actualizado: hora(), jugadores, meta: { archivo: 'fixture-128-ejemplo.xlsx', tamano: 128 }, partidas }, null, '\t')
);
const c = armarCuadro({ jugadores, partidas });
console.log(`Listo: ${c.jugadas}/${c.total} jugadas, ${c.enJuego} en juego (.datos/fixture128.json)`);
