'use client'
import { useState } from 'react'

const TIPO_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  piso_turistico: { label: 'Piso turístico', icon: '🏠', color: '#6366f1' },
  comunidad:      { label: 'Comunidad',      icon: '🏢', color: '#0ea5e9' },
  local:          { label: 'Local',          icon: '🏪', color: '#10b981' },
  oficina:        { label: 'Oficina',        icon: '💼', color: '#8b5cf6' },
  obra:           { label: 'Obra',           icon: '🏗️', color: '#f59e0b' },
  otro:           { label: 'Otro',           icon: '📋', color: '#64748b' },
}

const ZONAS_COMUNIDAD = ['Portal','Escaleras','Garaje','Jardín','Piscina','Ascensor','Local social','Trasteros']

const EMPTY = {
  nombre: '', tipo: 'piso_turistico', direccion: '',
  m2: '', habitaciones: '', pms_propiedad_id: '',
  precio_limpieza: '', notas: '', zonas: [] as string[]
}

interface Props {
  cliente: any
  propiedadesIniciales: any[]
  conexiones: any[]
}

export default function PropiedadesClient({ cliente, propiedadesIniciales, conexiones }: Props) {
  const [props, setProps]       = useState<any[]>(propiedadesIniciales)
  const [showModal, setShowModal] = useState(false)
  const [editando, setEditando]   = useState<any>(null)
  const [form, setForm]           = useState({ ...EMPTY })
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')

  const t = (tipo: string) => TIPO_CONFIG[tipo] || TIPO_CONFIG.otro
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  function abrirNueva() {
    setEditando(null)
    setForm({ ...EMPTY })
    setError('')
    setShowModal(true)
  }

  function abrirEditar(p: any) {
    setEditando(p)
    setForm({
      nombre: p.nombre || '', tipo: p.tipo || 'piso_turistico',
      direccion: p.direccion || '', m2: p.m2 || '',
      habitaciones: p.habitaciones || '',
      pms_propiedad_id: p.pms_propiedad_id || '',
      precio_limpieza: p.precio_limpieza || '',
      notas: p.notas || '', zonas: p.zonas || []
    })
    setError('')
    setShowModal(true)
  }

  function toggleZona(zona: string) {
    setForm(p => ({
      ...p,
      zonas: p.zonas.includes(zona)
        ? p.zonas.filter((z: string) => z !== zona)
        : [...p.zonas, zona]
    }))
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const body = {
        cliente_id:       cliente.id,
        nombre:           form.nombre,
        tipo:             form.tipo,
        direccion:        form.direccion     || null,
        m2:               form.m2            ? Number(form.m2)          : null,
        habitaciones:     form.habitaciones  ? Number(form.habitaciones) : null,
        pms_propiedad_id: form.pms_propiedad_id || null,
        precio_limpieza:  form.precio_limpieza ? Number(form.precio_limpieza) : null,
        zonas:            form.zonas.length > 0 ? form.zonas : null,
        notas:            form.notas || null,
      }
      const url    = editando ? '/api/admin/propiedades/' + editando.id : '/api/admin/propiedades'
      const method = editando ? 'PATCH' : 'POST'
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      if (editando) {
        setProps(ps => ps.map(p => p.id === editando.id ? { ...p, ...data.propiedad } : p))
      } else {
        setProps(ps => [...ps, { ...data.propiedad, sesiones_hoy: 0, total_completadas: 0 }])
      }
      setShowModal(false)
    } catch { setError('Error de conexión') }
    finally   { setLoading(false) }
  }

  async function desactivar(p: any) {
    if (!confirm('¿Desactivar ' + p.nombre + '?')) return
    const res = await fetch('/api/admin/propiedades/' + p.id, { method: 'DELETE' })
    if (res.ok) setProps(ps => ps.map(x => x.id === p.id ? { ...x, activa: false } : x))
    else { const d = await res.json(); alert(d.error) }
  }

  const cfg = t(cliente.tipo)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/admin/clientes" className="text-indigo-200 hover:text-white text-sm">← Clientes</a>
            <div>
              <div className="flex items-center gap-1.5">
                <span>{cfg.icon}</span>
                <h1 className="font-bold">{cliente.nombre}</h1>
              </div>
              <p className="text-indigo-200 text-xs">{props.length} propiedades</p>
            </div>
          </div>
          <button onClick={abrirNueva}
            className="bg-white text-indigo-600 font-semibold text-sm px-3 py-1.5 rounded-lg">
            + Añadir
          </button>
        </div>
      </header>

      {/* Resumen tarifas */}
      {props.some((p: any) => p.precio_limpieza) && (
        <div className="mx-4 mt-4 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Facturación mensual estimada</p>
          <div className="space-y-1.5">
            {props.filter((p: any) => p.precio_limpieza && p.activa).map((p: any) => (
              <div key={p.id} className="flex justify-between text-sm">
                <span className="text-gray-600">{t(p.tipo).icon} {p.nombre}</span>
                <span className="font-medium text-gray-800">{Number(p.precio_limpieza).toFixed(2)} €/limpieza</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lista propiedades */}
      <div className="p-4 space-y-3 pb-20">
        {props.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-2">🏠</div>
            <p className="font-medium">Sin propiedades</p>
            <button onClick={abrirNueva} className="mt-2 text-indigo-600 text-sm underline">
              Añadir primera propiedad →
            </button>
          </div>
        )}

        {props.map((p: any) => {
          const cfg = t(p.tipo)
          return (
            <div key={p.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
              style={{ borderLeft: '4px solid ' + (p.activa ? cfg.color : '#e5e7eb') }}>
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{cfg.icon}</span>
                      <h3 className="font-bold text-gray-800 text-sm">{p.nombre}</h3>
                      {!p.activa && <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">inactiva</span>}
                    </div>
                    <p className="text-xs mt-0.5 font-medium" style={{ color: cfg.color }}>{cfg.label}</p>
                    {p.direccion && <p className="text-xs text-gray-400 mt-0.5 truncate">📍 {p.direccion}</p>}
                    {p.zonas?.length > 0 && (
                      <div className="flex gap-1 flex-wrap mt-1.5">
                        {p.zonas.map((z: string) => (
                          <span key={z} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">{z}</span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-3 mt-1.5 text-xs text-gray-400">
                      {p.m2 && <span>📐 {p.m2} m²</span>}
                      {p.habitaciones && <span>🛏 {p.habitaciones} hab</span>}
                      {p.pms_propiedad_id && <span>🔌 ID: {p.pms_propiedad_id}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {p.precio_limpieza && (
                      <p className="font-bold text-indigo-600 text-lg">{Number(p.precio_limpieza).toFixed(0)}€</p>
                    )}
                    {Number(p.sesiones_hoy) > 0 && (
                      <span className="text-xs bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full">🧹 hoy</span>
                    )}
                    {p.ultima_limpieza && (
                      <p className="text-xs text-gray-400 mt-1">{p.ultima_limpieza}</p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button onClick={() => abrirEditar(p)}
                    className="flex-1 text-xs border border-indigo-200 text-indigo-600 rounded-lg py-1.5 hover:bg-indigo-50">
                    Editar
                  </button>
                  <a href={'/admin/sesiones?propiedad_id=' + p.id}
                    className="flex-1 text-xs border border-gray-200 text-gray-600 rounded-lg py-1.5 text-center hover:bg-gray-50">
                    Ver limpiezas
                  </a>
                  {p.activa && (
                    <button onClick={() => desactivar(p)}
                      className="text-xs border border-gray-200 text-gray-400 rounded-lg px-3 py-1.5">⊘</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-800">{editando ? 'Editar propiedad' : 'Nueva propiedad'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 text-2xl">✕</button>
            </div>
            <form onSubmit={guardar} className="p-5 space-y-4">

              {/* Tipo */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(TIPO_CONFIG).map(([key, val]) => (
                    <button key={key} type="button" onClick={() => f('tipo', key)}
                      className="p-2.5 rounded-xl border-2 text-center transition"
                      style={{
                        borderColor: form.tipo === key ? val.color : '#e5e7eb',
                        background:  form.tipo === key ? val.color + '15' : 'white'
                      }}>
                      <div className="text-xl">{val.icon}</div>
                      <div className="text-xs font-medium mt-0.5"
                        style={{ color: form.tipo === key ? val.color : '#374151' }}>
                        {val.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Nombre */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre *</label>
                <input value={form.nombre} onChange={e => f('nombre', e.target.value)}
                  placeholder="Ej: Casa Socorro, Portal C/ Betis 12, Oficina 3ºA…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required />
              </div>

              {/* Precio limpieza */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Precio por limpieza (€)
                  <span className="font-normal text-gray-400 ml-1">— para factura cliente</span>
                </label>
                <input type="number" step="0.01" value={form.precio_limpieza}
                  onChange={e => f('precio_limpieza', e.target.value)}
                  placeholder="Ej: 28.00"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* Dirección */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Dirección</label>
                <input value={form.direccion} onChange={e => f('direccion', e.target.value)}
                  placeholder="Calle, número, piso…"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>

              {/* M² y habitaciones */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">M²</label>
                  <input type="number" value={form.m2} onChange={e => f('m2', e.target.value)}
                    placeholder="90"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Habitaciones</label>
                  <input type="number" value={form.habitaciones} onChange={e => f('habitaciones', e.target.value)}
                    placeholder="3"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>

              {/* ID en PMS (solo pisos turísticos) */}
              {form.tipo === 'piso_turistico' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    ID en PMS
                    <span className="font-normal text-gray-400 ml-1">— para sincronización automática</span>
                  </label>
                  <input value={form.pms_propiedad_id}
                    onChange={e => f('pms_propiedad_id', e.target.value)}
                    placeholder="Ej: 352007 (Smoobu), apt-abc123 (Octorate)…"
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono" />
                </div>
              )}

              {/* Zonas (solo comunidades) */}
              {form.tipo === 'comunidad' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Zonas a limpiar</label>
                  <div className="flex flex-wrap gap-2">
                    {ZONAS_COMUNIDAD.map(zona => (
                      <button key={zona} type="button" onClick={() => toggleZona(zona)}
                        className="px-3 py-1.5 rounded-full border text-sm transition"
                        style={{
                          borderColor: form.zonas.includes(zona) ? '#0ea5e9' : '#e5e7eb',
                          background:  form.zonas.includes(zona) ? '#e0f2fe'  : 'white',
                          color:       form.zonas.includes(zona) ? '#0369a1'  : '#6b7280'
                        }}>
                        {zona}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Notas */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Notas</label>
                <textarea value={form.notas} onChange={e => f('notas', e.target.value)}
                  placeholder="Acceso, instrucciones especiales…"
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm">
                  Cancelar
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-50">
                  {loading ? 'Guardando…' : editando ? 'Guardar' : '+ Añadir propiedad'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
