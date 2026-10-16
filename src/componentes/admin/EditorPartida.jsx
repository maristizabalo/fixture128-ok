import { useMemo, useState } from 'react';
import { Check, Play, Trash2, X } from 'lucide-react';
import { partidasAfectadas } from '../../../shared/cuadro.js';
import { useModal } from '../DetallePartida.jsx';

const numero = (v) => (v === '' || v == null ? null : Number(v));

/**
 * Cargar lo que pasó en una mesa.
 *
 * Lo más rápido es escribir las carambolas: el ganador se marca solo con el
 * marcador más alto. Para un W.O. o un empate definido de otra forma, se toca
 * el nombre de quien pasa.
 */
export default function EditorPartida({ p, cuadro, onGuardar, onCerrar }) {
	useModal(onCerrar);
	const ronda = cuadro.rondas[p.ronda];
	const [ganador, setGanador] = useState(p.ganador ?? null);
	const [pa, setPa] = useState(p.pa ?? '');
	const [pb, setPb] = useState(p.pb ?? '');
	const [entradas, setEntradas] = useState(p.entradas ?? '');
	const [mesa, setMesa] = useState(p.mesa ?? '');
	const [wo, setWo] = useState(p.wo ?? false);
	const [enviando, setEnviando] = useState(false);

	const afectadas = useMemo(() => partidasAfectadas(cuadro, p.id), [cuadro, p.id]);
	const cambiaGanador = p.estado === 'final' && ganador && ganador !== p.ganador;

	function marcador(lado, valor) {
		const limpio = valor.replace(/\D/g, '').slice(0, 4);
		const a = lado === 'a' ? limpio : pa;
		const b = lado === 'b' ? limpio : pb;
		lado === 'a' ? setPa(limpio) : setPb(limpio);
		if (a !== '' && b !== '' && Number(a) !== Number(b) && !wo) {
			setGanador(Number(a) > Number(b) ? p.a.id : p.b.id);
		}
	}

	async function enviar(accion) {
		if (accion === 'limpiar' && afectadas.length) {
			const lista = afectadas.map((q) => `P${q.numero}`).join(', ');
			if (!window.confirm(`Esto también borra lo cargado en ${lista}. ¿Seguir?`)) return;
		}
		if (accion === 'final' && cambiaGanador && afectadas.length) {
			const lista = afectadas.map((q) => `P${q.numero}`).join(', ');
			if (!window.confirm(`Cambiar el ganador borra lo cargado en ${lista}. ¿Seguir?`)) return;
		}
		setEnviando(true);
		const ok = await onGuardar({
			id: p.id,
			accion,
			ganador,
			pa: numero(pa),
			pb: numero(pb),
			entradas: numero(entradas),
			mesa: String(mesa).trim(),
			wo
		});
		setEnviando(false);
		if (ok) onCerrar();
	}

	const jugador = (j, lado) => {
		const elegido = ganador === j.id;
		return (
			<div className={`editor__lado ${elegido ? 'editor__lado--gana' : ''}`}>
				<button type="button" className="editor__jugador" onClick={() => setGanador(j.id)} aria-pressed={elegido}>
					<span className="editor__llave ancha">Llave {j.llave}</span>
					<span className="editor__nombre display">{j.nombre}</span>
					<span className="editor__extra">
						{j.categoria && <span className="chip-cat">{j.categoria}</span>}
						{j.club && <span>{j.club}</span>}
					</span>
					<span className="editor__marca ancha">
						{elegido ? (
							<>
								<Check size={14} /> Gana
							</>
						) : (
							'Tocar si gana'
						)}
					</span>
				</button>
				<label className="editor__campo">
					<span>Carambolas</span>
					<input
						className="campo editor__numero tabular"
						inputMode="numeric"
						pattern="[0-9]*"
						value={lado === 'a' ? pa : pb}
						onChange={(e) => marcador(lado, e.target.value)}
						placeholder="0"
					/>
				</label>
			</div>
		);
	};

	return (
		<div className="modal" onClick={onCerrar} role="presentation">
			<div className="modal__caja panel editor" role="dialog" aria-modal="true" aria-labelledby="editor-titulo" onClick={(e) => e.stopPropagation()}>
				<div className="modal__cabeza">
					<div>
						<h2 id="editor-titulo" className="modal__titulo">
							Partida {p.numero}
						</h2>
						<p className="modal__sub">
							{ronda.nombre}
							{p.estado === 'final' ? ' · ya tiene resultado' : p.estado === 'juego' ? ' · en juego' : ''}
						</p>
					</div>
					<button type="button" className="boton boton--icono" onClick={onCerrar} aria-label="Cerrar">
						<X size={18} />
					</button>
				</div>

				<div className="editor__cruce">
					{jugador(p.a, 'a')}
					{jugador(p.b, 'b')}
				</div>

				<div className="editor__fila">
					<label className="editor__campo">
						<span>Entradas</span>
						<input
							className="campo tabular"
							inputMode="numeric"
							pattern="[0-9]*"
							value={entradas}
							onChange={(e) => setEntradas(e.target.value.replace(/\D/g, '').slice(0, 4))}
							placeholder="—"
						/>
					</label>
					<label className="editor__campo">
						<span>Mesa</span>
						<input className="campo" value={mesa} onChange={(e) => setMesa(e.target.value.slice(0, 12))} placeholder="—" />
					</label>
					<label className="editor__wo">
						<input type="checkbox" checked={wo} onChange={(e) => setWo(e.target.checked)} />
						<span>W.O.</span>
					</label>
				</div>

				{cambiaGanador && afectadas.length > 0 && (
					<p className="aviso">
						Cambiar el ganador borra lo ya cargado en {afectadas.map((q) => `P${q.numero}`).join(', ')}.
					</p>
				)}

				<div className="editor__acciones">
					<button type="button" className="boton boton--primario editor__guardar" disabled={!ganador || enviando} onClick={() => enviar('final')}>
						<Check size={17} /> {enviando ? 'Guardando…' : 'Guardar resultado'}
					</button>
					{p.estado !== 'final' && (
						<button type="button" className="boton" disabled={enviando} onClick={() => enviar('juego')}>
							<Play size={15} /> {p.estado === 'juego' ? 'Actualizar mesa' : 'Iniciar en mesa'}
						</button>
					)}
					{(p.estado === 'final' || p.estado === 'juego') && (
						<button type="button" className="boton boton--peligro" disabled={enviando} onClick={() => enviar('limpiar')}>
							<Trash2 size={15} /> {p.estado === 'final' ? 'Borrar resultado' : 'Quitar de la mesa'}
						</button>
					)}
				</div>
			</div>
		</div>
	);
}
