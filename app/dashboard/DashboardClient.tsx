'use client'
import { useState } from 'react'

interface Props {
  empresa: any
  sesiones: any[]
  conexiones: any[]
  today: string
}

export default function DashboardClient({ empresa, sesiones, conexiones, today }: Props) {
  const [tab, setTab] = useState<'hoy'|'conexiones'>('hoy')

  const pendientes = sesiones.filter(s => !s.started_at)
  const enCurso    = sesiones.filter(s => s.started_at && !s.completed_at)
  const completadas = sesiones.filter(s => s.completed_at)

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg">ialimp</h1>
          <p className="text-indigo-200 text-xs">{empresa.nombre}</p>
        </div>
        <div className="flex items-center gap-3">
          <a href="/admin/clientes" className="text-indigo-200 hover:text-white text-sm">👥 Clientes</a>
          <a href="/admin" className="text-indigo-200 hover:text-white text-sm">⚙️ Admin</a>
          <button onClick={logout} className="text-indigo-200 hover:text-white text-sm">Salir</button>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 p-4">
        {[
          { label: 'Pendientes', value: pendientes.length, color: 'bg-yellow-100 text-yellow-700' },
          { label: 'En curso',   value: enCurso.length,    color: 'bg-blue-100 text-blue-700' },
          { label: 'Completadas', value: completadas.length, color: 'bg-green-100 text-green-700' },
        ].map(s => (
          <div key={s.label} className={`rounded-xl p-3 text-center ${s.color}`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-xs mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 px-4">
        {[['hoy','Hoy'],['conexiones','PMS']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as any)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition ${
              tab === id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500'
            }`}>{label}
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {tab === 'hoy' && (
          <>
            {sesiones.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <div className="text-4xl mb-2">🧹</div>
                <p>No hay limpiezas para hoy</p>
                {conexiones.length === 0 && (
                  <button onClick={() => setTab('conexiones')}
                    className="mt-3 text-indigo-600 text-sm underline">
                    Conecta tu primer PMS →
                  </button>
                )}
              </div>
            )}
            {sesiones.map(s => (
              <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{s.property_name || s.property_id}</p>
                    <p className="text-sm text-gray-500">{s.limpiadora_nombre || 'Sin asignar'}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    s.completed_at ? 'bg-green-100 text-green-700' :
                    s.started_at   ? 'bg-blue-100 text-blue-700' :
                                     'bg-yellow-100 text-yellow-700'
                  }`}>
                    {s.completed_at ? '✓ Completada' : s.started_at ? '⟳ En curso' : '○ Pendiente'}
                  </span>
                </div>
              </div>
            ))}
          </>
        )}

        {tab === 'conexiones' && (
          <>
            <a href="/pms/nuevo"
              className="block w-full bg-indigo-600 hover:bg-indigo-700 text-white text-center font-semibold py-3 rounded-xl transition">
              + Conectar nuevo PMS
            </a>
            {conexiones.length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm">
                Sin conexiones. Añade tu primer cliente.
              </p>
            )}
            {conexiones.map(c => (
              <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-gray-800">{c.cliente_nombre}</p>
                    <p className="text-xs text-gray-400 uppercase mt-0.5">{c.pms_tipo}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${
                    c.sync_error ? 'bg-red-100 text-red-600' :
                    c.activa     ? 'bg-green-100 text-green-600' :
                                   'bg-gray-100 text-gray-500'
                  }`}>
                    {c.sync_error ? '⚠ Error' : c.activa ? '● Activo' : '○ Inactivo'}
                  </span>
                </div>
                {c.ultimo_sync && (
                  <p className="text-xs text-gray-400 mt-1">
                    Último sync: {new Date(c.ultimo_sync).toLocaleString('es-ES')}
                  </p>
                )}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
