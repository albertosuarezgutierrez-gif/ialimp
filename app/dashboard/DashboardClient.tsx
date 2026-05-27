'use client'
import { useState } from 'react'
import NuevaLimpiezaModal from '@/components/NuevaLimpiezaModal'
import AlertasBadge from '@/components/AlertasBadge'

interface Props {
  empresa: any
  sesionesIniciales: any[]
  conexiones: any[]
  clientes: any[]
  limpiadoras: any[]
  today: string
}

const TIPO_COLOR: Record<string, string> = {
  rotacion: '#6366f1', profunda: '#0ea5e9',
  comunidad: '#10b981', obra: '#f59e0b', mantenimiento: '#64748b'
}
const TIPO_ICON: Record<string, string> = {
  rotacion: '🔄', profunda: '🧽',
  comunidad: '🏢', obra: '🏗️', mantenimiento: '🔧'
}

export default function DashboardClient({
  empresa, sesionesIniciales, conexiones, clientes, limpiadoras, today
}: Props) {
  const [sesiones, setSesiones]   = useState<any[]>(sesionesIniciales)
  const [tab, setTab]             = useState<'hoy'|'pms'>('hoy')
  const [showNueva, setShowNueva] = useState(false)
  const [fecha, setFecha]         = useState(today)

  const pendientes  = sesiones.filter(s => !s.started_at)
  const enCurso     = sesiones.filter(s => s.started_at && !s.completed_at)
  const completadas = sesiones.filter(s => s.completed_at)

  async function cambiarFecha(f: string) {
    setFecha(f)
    const res  = await fetch('/api/admin/sesiones?date=' + f)
    const data = await res.json()
    setSesiones(data.sesiones || [])
  }

  function onSesionCreada(sesion: any) {
    if (sesion.session_date === fecha) {
      setSesiones(s => [...s, { ...sesion, limpiadora_nombre: null, cliente_nombre: null }])
    }
  }

  async function eliminarSesion(id: string) {
    if (!confirm('¿Eliminar esta limpieza?')) return
    const res = await fetch('/api/admin/sesiones/' + id, { method: 'DELETE' })
    if (res.ok) setSesiones(s => s.filter(x => x.id !== id))
    else {
      const d = await res.json()
      alert(d.error || 'Error')
    }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg leading-tight">ialimp</h1>
            <p className="text-indigo-200 text-xs">{empresa.nombre}</p>
          </div>
          <div className="flex items-center gap-3">
            <a href="/admin/clientes" className="text-indigo-200 hover:text-white text-sm">👥</a>
            <a href="/admin/crm" className="text-indigo-200 hover:text-white text-sm">📋</a>
            <a href="/admin/stock" className="text-indigo-200 hover:text-white text-sm">📦</a>
            <a href="/admin/ia" className="text-indigo-200 hover:text-white text-sm">🤖</a>
            <a href="/admin/rrhh" className="text-indigo-200 hover:text-white text-sm">👤</a>
            <AlertasBadge />
            <a href="/admin/facturas" className="text-indigo-200 hover:text-white text-sm">🧾</a>
            <a href="/admin" className="text-indigo-200 hover:text-white text-sm">⚙️</a>
            <button onClick={logout} className="text-indigo-200 hover:text-white text-sm">Salir</button>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4 pb-0">
        {[
          { label: 'Pendientes', value: pendientes.length,  color: 'bg-yellow-50 text-yellow-700' },
          { label: 'En curso',   value: enCurso.length,     color: 'bg-blue-50 text-blue-700' },
          { label: 'Hechas',     value: completadas.length, color: 'bg-green-50 text-green-700' },
        ].map(s => (
          <div key={s.label} className={'rounded-xl p-3 text-center ' + s.color}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Selector fecha + botón nueva */}
      <div className="flex items-center gap-2 px-4 pt-3">
        <input type="date" value={fecha} onChange={e => cambiarFecha(e.target.value)}
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />
        <button onClick={() => setShowNueva(true)}
          className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition">
          + Nueva
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 border-b border-gray-200">
        {[['hoy','Limpiezas'],['pms','PMS']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={'px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition ' +
              (tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400')}>
            {label}
            {id === 'hoy' && sesiones.length > 0 &&
              <span className="ml-1.5 bg-indigo-100 text-indigo-600 text-xs px-1.5 py-0.5 rounded-full">
                {sesiones.length}
              </span>
            }
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3 pb-20">

        {/* ── TAB LIMPIEZAS ── */}
        {tab === 'hoy' && (
          <>
            {sesiones.length === 0 && (
              <div className="text-center py-14 text-gray-400">
                <div className="text-4xl mb-2">🧹</div>
                <p className="font-medium">Sin limpiezas para este día</p>
                <button onClick={() => setShowNueva(true)}
                  className="mt-3 text-indigo-600 text-sm underline">
                  + Añadir limpieza manualmente
                </button>
              </div>
            )}

            {sesiones.map(s => {
              const color  = TIPO_COLOR[s.tipo_servicio] || '#6366f1'
              const icon   = TIPO_ICON[s.tipo_servicio]  || '🧹'
              const manual = s.origen === 'manual'
              return (
                <div key={s.id}
                  className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                  style={{ borderLeft: '4px solid ' + color }}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{icon}</span>
                          <p className="font-bold text-gray-800 text-sm truncate">{s.property_name}</p>
                          {manual && (
                            <span className="text-xs bg-purple-50 text-purple-500 px-1.5 py-0.5 rounded-full">manual</span>
                          )}
                        </div>
                        {s.cliente_nombre && (
                          <p className="text-xs text-gray-400 mt-0.5">👥 {s.cliente_nombre}</p>
                        )}
                        {s.limpiadora_nombre && (
                          <p className="text-sm text-gray-600 mt-1">👤 {s.limpiadora_nombre}</p>
                        )}
                        {s.hora_inicio && (
                          <p className="text-xs text-gray-400 mt-0.5">🕐 {s.hora_inicio}</p>
                        )}
                        {s.notas && (
                          <p className="text-xs text-gray-400 mt-1 line-clamp-1 italic">"{s.notas}"</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <span className={'text-xs px-2 py-1 rounded-full font-medium ' +
                          (s.completed_at ? 'bg-green-100 text-green-700' :
                           s.started_at   ? 'bg-blue-100 text-blue-700' :
                                            'bg-yellow-100 text-yellow-700')}>
                          {s.completed_at ? '✓ Hecha' : s.started_at ? '⟳ En curso' : '○ Pendiente'}
                        </span>
                        {manual && !s.started_at && (
                          <button onClick={() => eliminarSesion(s.id)}
                            className="text-xs text-red-400 hover:text-red-600">
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </>
        )}

        {/* ── TAB PMS ── */}
        {tab === 'pms' && (
          <>
            <a href="/pms/nuevo"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-bold py-3 rounded-xl text-sm transition">
              + Conectar nuevo PMS
            </a>
            {conexiones.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">Sin conexiones PMS.</p>
            )}
            {conexiones.map((c: any) => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{c.cliente_nombre}</p>
                    <p className="text-xs text-gray-400 uppercase mt-0.5">{c.pms_tipo}</p>
                  </div>
                  <span className={'text-xs px-2 py-1 rounded-full ' +
                    (c.sync_error ? 'bg-red-100 text-red-600' :
                     c.activa     ? 'bg-green-100 text-green-600' :
                                    'bg-gray-100 text-gray-500')}>
                    {c.sync_error ? '⚠ Error' : c.activa ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>
                {c.ultimo_sync && (
                  <p className="text-xs text-gray-400 mt-1.5">
                    Sync: {new Date(c.ultimo_sync).toLocaleString('es-ES', { dateStyle:'short', timeStyle:'short' })}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>

      {/* Modal nueva limpieza */}
      {showNueva && (
        <NuevaLimpiezaModal
          clientes={clientes}
          limpiadoras={limpiadoras}
          onCreada={onSesionCreada}
          onClose={() => setShowNueva(false)}
        />
      )}
    </div>
  )
}
