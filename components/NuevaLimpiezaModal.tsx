'use client'
import { useState } from 'react'

const TIPOS_SERVICIO = [
  { id: 'rotacion',     label: 'Rotación',     icon: '🔄', desc: 'Entre huéspedes' },
  { id: 'profunda',     label: 'Profunda',     icon: '🧽', desc: 'Limpieza a fondo' },
  { id: 'comunidad',   label: 'Comunidad',    icon: '🏢', desc: 'Zonas comunes' },
  { id: 'obra',        label: 'Final obra',   icon: '🏗️', desc: 'Post-construcción' },
  { id: 'mantenimiento',label:'Mantenimiento', icon: '🔧', desc: 'Revisión y orden' },
]

interface Props {
  clientes: any[]
  limpiadoras: any[]
  onCreada: (sesion: any) => void
  onClose: () => void
}

export default function NuevaLimpiezaModal({ clientes, limpiadoras, onCreada, onClose }: Props) {
  const hoy = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    cliente_id: '',
    property_name: '',
    session_date: hoy,
    hora_inicio: '',
    limpiadora_id: '',
    tipo_servicio: 'rotacion',
    hora_checkout: '',
    hora_checkin_siguiente: '',
    num_huespedes: '',
    notas: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/admin/sesiones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cliente_id:    form.cliente_id    || null,
          limpiadora_id: form.limpiadora_id || null,
          hora_inicio:   form.hora_inicio   || null,
        })
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      onCreada(data.sesion)
      onClose()
    } catch { setError('Error de conexión') }
    finally  { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-800 text-base">Nueva limpieza</h2>
            <p className="text-xs text-gray-400 mt-0.5">Introducida manualmente</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-5">

          {/* Tipo de servicio */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Tipo de servicio</label>
            <div className="grid grid-cols-3 gap-2">
              {TIPOS_SERVICIO.map(t => (
                <button key={t.id} type="button"
                  onClick={() => f('tipo_servicio', t.id)}
                  className="p-2.5 rounded-xl border-2 text-center transition"
                  style={{
                    borderColor: form.tipo_servicio === t.id ? '#6366f1' : '#e5e7eb',
                    background:  form.tipo_servicio === t.id ? '#eef2ff' : 'white',
                  }}>
                  <div className="text-xl mb-0.5">{t.icon}</div>
                  <div className="text-xs font-semibold" style={{ color: form.tipo_servicio === t.id ? '#6366f1' : '#374151' }}>{t.label}</div>
                  <div className="text-xs text-gray-400 leading-tight">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Propiedad */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Propiedad / Descripción <span className="text-red-400">*</span>
            </label>
            <input
              value={form.property_name}
              onChange={e => f('property_name', e.target.value)}
              placeholder="Ej: Piso Triana 3º B, Portal A escalera 2, Obra C/ Betis…"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Fecha <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={form.session_date}
                onChange={e => f('session_date', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Hora aprox.</label>
              <input
                type="time"
                value={form.hora_inicio}
                onChange={e => f('hora_inicio', e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Cliente */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cliente</label>
            <select
              value={form.cliente_id}
              onChange={e => f('cliente_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">— Sin asignar —</option>
              {clientes.map((c: any) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>

          {/* Limpiadora */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Limpiadora</label>
            <select
              value={form.limpiadora_id}
              onChange={e => f('limpiadora_id', e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
              <option value="">— Sin asignar —</option>
              {limpiadoras.map((l: any) => (
                <option key={l.id} value={l.id}>{l.nombre}</option>
              ))}
            </select>
          </div>

          {/* Nº huéspedes */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nº huéspedes
              <span className="font-normal text-gray-400 ml-1">— para calcular toallas</span>
            </label>
            <input type="number" min="1" max="20"
              value={form.num_huespedes}
              onChange={e => setForm(p => ({ ...p, num_huespedes: e.target.value }))}
              placeholder="2"
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>

          {/* Ventana horaria para pisos turísticos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Checkout</label>
              <input type="time" value={form.hora_checkout}
                onChange={e => setForm(p => ({ ...p, hora_checkout: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Próximo checkin</label>
              <input type="time" value={form.hora_checkin_siguiente}
                onChange={e => setForm(p => ({ ...p, hora_checkin_siguiente: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            {form.hora_checkout && form.hora_checkin_siguiente && (() => {
              const [hO,mO] = form.hora_checkout.split(':').map(Number)
              const [hI,mI] = form.hora_checkin_siguiente.split(':').map(Number)
              const v = (hI*60+mI)-(hO*60+mO)
              return (
                <div className="col-span-2 text-xs">
                  <span className={v >= 120 ? 'text-green-600' : 'text-red-500'}>
                    {v >= 120 ? '✅' : '⚠️'} Ventana disponible: {v} min ({(v/60).toFixed(1)}h)
                  </span>
                </div>
              )
            })()}
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Notas
              <span className="font-normal text-gray-400 ml-1">(lo que dijo por WhatsApp)</span>
            </label>
            <textarea
              value={form.notas}
              onChange={e => f('notas', e.target.value)}
              placeholder="Ej: Cambiar sábanas cama grande, llave bajo felpudo, entrada 15h…"
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          {/* Botones */}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl text-sm font-medium">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-sm font-bold transition disabled:opacity-50">
              {loading ? 'Guardando…' : '✓ Crear limpieza'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
