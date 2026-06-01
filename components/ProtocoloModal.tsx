'use client'
import { useEffect, useState } from 'react'

type Item = { estancia: string; descripcion: string; requiere_foto: boolean }

// Editor de protocolo de un piso. 100% editable:
//  - Subir foto de la ficha o pegar su texto → IA devuelve un borrador (aiExtractProtocol).
//  - La dueña revisa/edita la lista de tareas (estancia, descripción, si requiere foto).
//  - Guardar persiste el protocolo (POST /api/admin/protocolos).
export default function ProtocoloModal({ propiedad, onClose }: { propiedad: any; onClose: () => void }) {
  const [loading, setLoading]       = useState(true)
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')
  const [msg, setMsg]               = useState('')

  const [nombre, setNombre] = useState(`Protocolo ${propiedad?.nombre || ''}`.trim())
  const [notas, setNotas]   = useState('')
  const [rows, setRows]     = useState<Item[]>([])

  const [modo, setModo]   = useState<'imagen' | 'texto'>('imagen')
  const [texto, setTexto] = useState('')

  // Cargar protocolo existente (si lo hay)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/admin/protocolos?propiedad_id=${propiedad.id}`)
        const d = await r.json()
        if (d.protocolo) {
          setNombre(d.protocolo.nombre || nombre)
          setNotas(d.protocolo.datos?.notas || '')
          setRows((d.protocolo.items || []).map((i: any) => ({
            estancia: i.estancia || 'General',
            descripcion: i.descripcion || '',
            requiere_foto: !!i.requiere_foto,
          })))
        }
      } catch { /* sin protocolo previo */ }
      setLoading(false)
    })()
  }, [propiedad.id])

  function fileToBase64(file: File): Promise<{ base64: string; type: string }> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const res = String(reader.result || '')
        resolve({ base64: res.split(',')[1] || '', type: file.type || 'image/jpeg' })
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  function mergeBorrador(borrador: any) {
    if (borrador?.nombre && !rows.length) setNombre(borrador.nombre)
    if (borrador?.notas) setNotas(n => n ? `${n}\n${borrador.notas}` : borrador.notas)
    const nuevas: Item[] = []
    for (const e of (borrador?.estancias || [])) {
      for (const it of (e.items || [])) {
        nuevas.push({ estancia: e.estancia || 'General', descripcion: it.descripcion || '', requiere_foto: !!it.requiere_foto })
      }
    }
    setRows(r => [...r, ...nuevas])
  }

  async function extraerImagen(file: File) {
    setError(''); setMsg(''); setExtracting(true)
    try {
      const { base64, type } = await fileToBase64(file)
      const r = await fetch('/api/admin/protocolos/extraer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_base64: base64, media_type: type }),
      })
      const d = await r.json()
      if (!d.borrador) { setError(d.error || 'No se pudo interpretar la ficha'); return }
      mergeBorrador(d.borrador)
      setMsg(`Añadidas ${d.total_items} tareas (certeza ${d.nivel_certeza}). Revísalas y guarda.`)
    } catch (e: any) { setError(e.message) } finally { setExtracting(false) }
  }

  async function extraerTexto() {
    if (!texto.trim()) { setError('Pega el texto de la ficha'); return }
    setError(''); setMsg(''); setExtracting(true)
    try {
      const r = await fetch('/api/admin/protocolos/extraer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      })
      const d = await r.json()
      if (!d.borrador) { setError(d.error || 'No se pudo interpretar la ficha'); return }
      mergeBorrador(d.borrador)
      setTexto('')
      setMsg(`Añadidas ${d.total_items} tareas (certeza ${d.nivel_certeza}). Revísalas y guarda.`)
    } catch (e: any) { setError(e.message) } finally { setExtracting(false) }
  }

  function setRow(i: number, patch: Partial<Item>) {
    setRows(r => { const a = [...r]; a[i] = { ...a[i], ...patch }; return a })
  }
  function delRow(i: number) { setRows(r => r.filter((_, j) => j !== i)) }
  function addRow() { setRows(r => [...r, { estancia: 'General', descripcion: '', requiere_foto: false }]) }

  async function guardar() {
    const items = rows.filter(r => r.descripcion.trim())
    if (!items.length) { setError('Añade al menos una tarea'); return }
    setError(''); setMsg(''); setSaving(true)
    try {
      const r = await fetch('/api/admin/protocolos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propiedad_id: propiedad.id, nombre, datos: { notas }, items }),
      })
      const d = await r.json()
      if (!r.ok) { setError(d.error || 'Error al guardar'); return }
      setMsg(`Protocolo guardado (${d.items} tareas).`)
      setTimeout(onClose, 900)
    } catch (e: any) { setError(e.message) } finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="font-bold text-gray-800">📋 Protocolo · {propiedad?.nombre}</h2>
          <button onClick={onClose} className="text-gray-400 text-2xl">✕</button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">Cargando…</div>
        ) : (
          <div className="p-5 space-y-5">
            {/* Ingesta IA */}
            <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
              <p className="text-sm font-semibold text-indigo-700 mb-1">Crear desde una ficha</p>
              <p className="text-xs text-gray-500 mb-3">Sube una foto de la ficha de limpieza o pega su texto y la IA la convierte en tareas. Luego revisas y guardas.</p>
              <div className="flex gap-2 mb-3">
                <button onClick={() => setModo('imagen')} type="button"
                  className={`text-xs rounded-lg px-3 py-1.5 border ${modo === 'imagen' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 text-indigo-600'}`}>📷 Foto</button>
                <button onClick={() => setModo('texto')} type="button"
                  className={`text-xs rounded-lg px-3 py-1.5 border ${modo === 'texto' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-indigo-200 text-indigo-600'}`}>📝 Texto</button>
              </div>
              {modo === 'imagen' ? (
                <input type="file" accept="image/*" disabled={extracting}
                  onChange={e => { const f = e.target.files?.[0]; if (f) extraerImagen(f) }}
                  className="block w-full text-xs text-gray-600" />
              ) : (
                <div className="space-y-2">
                  <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={4}
                    placeholder="Pega aquí el texto de la ficha…"
                    className="w-full border border-gray-200 rounded-lg p-2 text-xs" />
                  <button onClick={extraerTexto} disabled={extracting} type="button"
                    className="text-xs bg-indigo-600 text-white rounded-lg px-3 py-1.5 disabled:opacity-60">
                    {extracting ? 'Analizando…' : 'Analizar texto'}
                  </button>
                </div>
              )}
              {extracting && modo === 'imagen' && <p className="text-xs text-indigo-600 mt-2">Analizando la ficha…</p>}
            </div>

            {/* Nombre */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre del protocolo</label>
              <input value={nombre} onChange={e => setNombre(e.target.value)}
                className="w-full border border-gray-200 rounded-lg p-2 text-sm" />
            </div>

            {/* Tareas */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-semibold text-gray-700">Tareas ({rows.length})</label>
                <button onClick={addRow} type="button" className="text-xs text-indigo-600 underline">+ Añadir tarea</button>
              </div>
              <div className="space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="flex gap-2 items-start bg-gray-50 rounded-lg p-2">
                    <input value={row.estancia} onChange={e => setRow(i, { estancia: e.target.value })}
                      placeholder="Estancia" className="w-24 border border-gray-200 rounded-md p-1.5 text-xs" />
                    <input value={row.descripcion} onChange={e => setRow(i, { descripcion: e.target.value })}
                      placeholder="Tarea…" className="flex-1 border border-gray-200 rounded-md p-1.5 text-xs" />
                    <button type="button" onClick={() => setRow(i, { requiere_foto: !row.requiere_foto })}
                      title="¿Requiere foto?"
                      className={`text-xs rounded-md px-2 py-1.5 border ${row.requiere_foto ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-200 text-gray-400'}`}>📷</button>
                    <button type="button" onClick={() => delRow(i)} className="text-xs text-red-400 px-1.5 py-1.5">✕</button>
                  </div>
                ))}
                {!rows.length && <p className="text-xs text-gray-400 italic">Sin tareas todavía. Sube una ficha o añádelas a mano.</p>}
              </div>
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Instrucciones generales (acceso, llaves, wifi…)</label>
              <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={3}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs" />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
            {msg && <p className="text-xs text-green-600">{msg}</p>}

            <div className="flex gap-2 pt-1">
              <button onClick={onClose} type="button" className="flex-1 text-sm border border-gray-200 text-gray-600 rounded-lg py-2">Cancelar</button>
              <button onClick={guardar} disabled={saving} type="button"
                className="flex-1 text-sm bg-indigo-600 text-white rounded-lg py-2 disabled:opacity-60">
                {saving ? 'Guardando…' : 'Guardar protocolo'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
