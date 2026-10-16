import { useMemo, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FolderGit2, Pencil, Search, Upload } from 'lucide-react';
import { normalizar } from '../../../shared/cuadro.js';
import { descargarPlantilla, exportarResultados, leerArchivo } from '../../lib/excel.js';
import { hace } from '../../lib/useTorneo.js';

/**
 * La lista del cuadro: subir el Excel, ver cómo quedan los cruces antes de
 * publicar, corregir un nombre y bajar todo en Excel.
 */
export default function Jugadores({ estado, cuadro, onPublicar, onPublicarRepo, onEditar }) {
	const [vista, setVista] = useState(null);
	const [archivo, setArchivo] = useState('');
	const [error, setError] = useState('');
	const [leyendo, setLeyendo] = useState(false);
	const [encima, setEncima] = useState(false);
	const entrada = useRef(null);

	async function leer(file) {
		if (!file) return;
		setError('');
		setVista(null);
		setLeyendo(true);
		try {
			setVista(await leerArchivo(file));
			setArchivo(file.name);
		} catch (e) {
			setError(e.message || 'No se pudo leer el archivo');
		} finally {
			setLeyendo(false);
			if (entrada.current) entrada.current.value = '';
		}
	}

	async function publicar() {
		if (cuadro.jugadas > 0 && !window.confirm(`Publicar una lista nueva borra los ${cuadro.jugadas} resultados cargados. ¿Seguir?`)) return;
		const ok = await onPublicar(vista.cupos, archivo);
		if (ok) setVista(null);
	}

	async function publicarRepo() {
		if (cuadro.jugadas > 0 && !window.confirm(`Publicar el Excel del repo borra los ${cuadro.jugadas} resultados cargados. ¿Seguir?`)) return;
		await onPublicarRepo();
	}

	const repo = estado.excelRepo;
	const meta = estado.meta ?? {};

	return (
		<section className="jugadores">
			<div className="tarjeta panel">
				<div className="tarjeta__cabeza">
					<FileSpreadsheet size={22} aria-hidden="true" />
					<div>
						<h2 className="tarjeta__titulo ancha">Excel del fixture</h2>
						<p className="tarjeta__sub">
							{estado.origen === 'publicado' && (
								<>
									Publicado: <strong>{meta.archivo ?? 'lista'}</strong> · {cuadro.inscritos} jugadores
									{meta.cargado ? ` · ${hace(meta.cargado)}` : ''}
								</>
							)}
							{estado.origen === 'repo' && (
								<>
									Se está mostrando <strong>{meta.archivo}</strong> del repo · {cuadro.inscritos} jugadores. Se fija
									solo al cargar el primer resultado.
								</>
							)}
							{estado.origen === 'vacio' && 'Todavía no hay lista publicada.'}
						</p>
					</div>
				</div>

				<div
					className={`soltar ${encima ? 'soltar--encima' : ''}`}
					onDragOver={(e) => {
						e.preventDefault();
						setEncima(true);
					}}
					onDragLeave={() => setEncima(false)}
					onDrop={(e) => {
						e.preventDefault();
						setEncima(false);
						leer(e.dataTransfer.files?.[0]);
					}}
				>
					<Upload size={26} aria-hidden="true" />
					<p>
						<strong>Arrastra aquí el Excel</strong> con los {estado.meta?.tamano ?? 128} cupos
						<br />
						<span>.xlsx, .xls o .csv · una fila por jugador en orden de llaves, o una fila por partida</span>
					</p>
					<button type="button" className="boton boton--primario" onClick={() => entrada.current?.click()} disabled={leyendo}>
						{leyendo ? 'Leyendo…' : 'Elegir archivo'}
					</button>
					<input
						ref={entrada}
						type="file"
						accept=".xlsx,.xlsm,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel,text/csv"
						hidden
						onChange={(e) => leer(e.target.files?.[0])}
					/>
				</div>

				{error && <p className="aviso aviso--error">{error}</p>}

				<div className="tarjeta__acciones">
					<button type="button" className="boton" onClick={() => descargarPlantilla(128)}>
						<Download size={15} /> Plantilla 128
					</button>
					{cuadro.rondas.length > 0 && (
						<button type="button" className="boton" onClick={() => exportarResultados(cuadro)}>
							<FileSpreadsheet size={15} /> Exportar con resultados
						</button>
					)}
					{repo && estado.origen !== 'repo' && !repo.error && (
						<button type="button" className="boton" onClick={publicarRepo}>
							<FolderGit2 size={15} /> Publicar {repo.archivo} del repo
						</button>
					)}
				</div>
				{repo?.error && (
					<p className="aviso aviso--error">
						{repo.archivo}: {repo.error}
					</p>
				)}
			</div>

			{vista && <Vista vista={vista} archivo={archivo} onPublicar={publicar} onDescartar={() => setVista(null)} />}

			{cuadro.rondas.length > 0 && <Lista cuadro={cuadro} onEditar={onEditar} />}
		</section>
	);
}

/** Cómo queda el cuadro con el archivo leído, antes de publicarlo. */
function Vista({ vista, archivo, onPublicar, onDescartar }) {
	const [publicando, setPublicando] = useState(false);
	const cruces = [];
	for (let i = 0; i < vista.cupos.length; i += 2) cruces.push([vista.cupos[i], vista.cupos[i + 1], i / 2 + 1]);

	return (
		<div className="tarjeta panel vista">
			<div className="tarjeta__cabeza">
				<div>
					<h2 className="tarjeta__titulo ancha">Vista previa · {archivo}</h2>
					<p className="tarjeta__sub">
						Hoja «{vista.hoja}» · formato {vista.formato === 'parejas' ? 'una fila por partida' : 'una fila por jugador'} ·
						cuadro de {vista.tamano} · {vista.inscritos} jugadores
						{vista.libres ? ` · ${vista.libres} libres` : ''}
					</p>
				</div>
			</div>
			{vista.avisos.length > 0 && (
				<ul className="aviso vista__avisos">
					{vista.avisos.map((a) => (
						<li key={a}>{a}</li>
					))}
				</ul>
			)}
			<ol className="vista__cruces">
				{cruces.map(([a, b, n]) => (
					<li key={n}>
						<span className="vista__num tabular">P{n}</span>
						<span className={a ? '' : 'vista__libre'}>{a?.nombre ?? 'Libre'}</span>
						{a?.categoria && <span className="chip-cat">{a.categoria}</span>}
						<span className="vista__vs">vs</span>
						<span className={b ? '' : 'vista__libre'}>{b?.nombre ?? 'Libre'}</span>
						{b?.categoria && <span className="chip-cat">{b.categoria}</span>}
					</li>
				))}
			</ol>
			<div className="tarjeta__acciones">
				<button
					type="button"
					className="boton boton--primario"
					disabled={publicando}
					onClick={async () => {
						setPublicando(true);
						await onPublicar();
						setPublicando(false);
					}}
				>
					<Upload size={15} /> {publicando ? 'Publicando…' : 'Publicar fixture'}
				</button>
				<button type="button" className="boton" onClick={onDescartar}>
					Descartar
				</button>
			</div>
		</div>
	);
}

/** Los jugadores publicados, con el lápiz para corregir un nombre mal escrito. */
function Lista({ cuadro, onEditar }) {
	const [consulta, setConsulta] = useState('');
	const [editando, setEditando] = useState(null);

	const jugadores = useMemo(() => {
		const lista = [];
		for (const p of cuadro.rondas[0].partidas) for (const j of [p.a, p.b]) if (j) lista.push(j);
		return lista;
	}, [cuadro]);

	const q = normalizar(consulta);
	const visibles = q ? jugadores.filter((j) => normalizar(`${j.llave} ${j.nombre} ${j.club ?? ''}`).includes(q)) : jugadores;

	async function guardar(e) {
		e.preventDefault();
		const ok = await onEditar(editando);
		if (ok) setEditando(null);
	}

	return (
		<div className="tarjeta panel">
			<div className="tarjeta__cabeza tarjeta__cabeza--fila">
				<h2 className="tarjeta__titulo ancha">Jugadores · {jugadores.length}</h2>
				<div className="partidas__buscar">
					<Search size={16} aria-hidden="true" />
					<input className="campo" type="search" placeholder="Buscar…" value={consulta} onChange={(e) => setConsulta(e.target.value)} />
				</div>
			</div>
			<ul className="lista-jugadores">
				{visibles.map((j) =>
					editando?.id === j.id ? (
						<li key={j.id} className="lista-jugadores__edita">
							<form onSubmit={guardar}>
								<span className="vista__num tabular">{j.llave}</span>
								<input className="campo" value={editando.nombre} onChange={(e) => setEditando({ ...editando, nombre: e.target.value })} autoFocus aria-label="Nombre" />
								<input className="campo lista-jugadores__cat" value={editando.categoria ?? ''} onChange={(e) => setEditando({ ...editando, categoria: e.target.value })} placeholder="Cat." aria-label="Categoría" />
								<input className="campo" value={editando.club ?? ''} onChange={(e) => setEditando({ ...editando, club: e.target.value })} placeholder="Club" aria-label="Club" />
								<button type="submit" className="boton boton--primario boton--chico">
									Guardar
								</button>
								<button type="button" className="boton boton--chico" onClick={() => setEditando(null)}>
									Cancelar
								</button>
							</form>
						</li>
					) : (
						<li key={j.id}>
							<span className="vista__num tabular">{j.llave}</span>
							<span className="lista-jugadores__nombre">{j.nombre}</span>
							{j.categoria && <span className="chip-cat">{j.categoria}</span>}
							<span className="lista-jugadores__club">{j.club}</span>
							<button
								type="button"
								className="lista-jugadores__lapiz"
								onClick={() => setEditando({ id: j.id, nombre: j.nombre, categoria: j.categoria, club: j.club })}
								aria-label={`Editar ${j.nombre}`}
							>
								<Pencil size={14} />
							</button>
						</li>
					)
				)}
			</ul>
		</div>
	);
}
