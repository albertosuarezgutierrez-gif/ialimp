'use client'
import { useState, useEffect } from 'react'
import ChatSesion from '@/components/ChatSesion'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb'
}

type Vista = 'reservas' | 'equipo'

export default function AdminChatPage() {
  const [vista, setVista]         = useState<Vista>('reservas')
  const [sesiones, setSesiones]   = useState<any[]>([])
  const [selected, setSelected]   = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [nombre, setNombre]       = useState('Admin')

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/admin/chat/sesiones')
    const d = await r.json()
    setSesiones(d.sesiones || [])
    setNombre(d.empresa_nombre || 'Admin')
    setLoading(false)
  }

  const fmtHora = (t: string) => {
    if (!t) return ''
    const d = new Date(t)
    const hoy = new Date().toDateString() === d.toDateString()
    return hoy
      ? d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
  }

  const totalUnread = sesiones.reduce((a, s) => a + (s.unread || 0), 0)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans',sans-serif", background: C.bg }}>
      {/* Header */}
      <header style={{ background: C.primary, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16, flexShrink: 0 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 18 }}>💬 Mensajes</h1>
        </div>
        {totalUnread > 0 && (
          <div style={{ background: '#dc2626', color: 'white', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 800 }}>
            {totalUnread} sin leer
          </div>
        )}
      </header>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, display: 'flex', flexShrink: 0 }}>
        {(['reservas', 'equipo'] as Vista[]).map(v => (
          <button key={v} onClick={() => { setVista(v); setSelected(null) }}
            style={{ flex: 1, padding: '12px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontSize: 13, fontWeight: vista === v ? 700 : 500, fontFamily: 'inherit',
              color: vista === v ? C.primary : C.muted,
              borderBottom: `2px solid ${vista === v ? C.primary : 'transparent'}` }}>
            {v === 'reservas' ? '🏠 Por reserva' : '👥 Equipo'}
          </button>
        ))}
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Lista */}
        <div style={{
          width: selected ? '35%' : '100%', borderRight: `1px solid ${C.border}`,
          overflowY: 'auto', background: 'white', transition: 'width 0.2s',
          display: selected ? undefined : 'block'
        }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: C.muted }}>Cargando...</div>}

          {!loading && vista === 'reservas' && (
            <div>
              {sesiones.length === 0 && (
                <div style={{ padding: 32, textAlign: 'center', color: C.muted }}>
                  <div style={{ fontSize: 32 }}>💬</div>
                  <div style={{ marginTop: 8, fontWeight: 600 }}>Sin conversaciones por reserva</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Las limpiadoras pueden chatear desde su app</div>
                </div>
              )}
              {sesiones.map(s => (
                <button key={s.id} onClick={() => setSelected(s)}
                  style={{
                    width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
                    padding: '14px 16px', background: selected?.id === s.id ? C.light : 'white',
                    borderBottom: `1px solid ${C.border}`, fontFamily: 'inherit',
                    display: 'flex', gap: 12, alignItems: 'flex-start'
                  }}>
                  {/* Avatar */}
                  <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                    🏠
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.property_name}
                      </div>
                      <div style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{fmtHora(s.ultimo_mensaje_at)}</div>
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {s.session_date} · {s.limpiadora_nombre || 'Sin asignar'}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <div style={{ fontSize: 12, color: C.muted, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {s.ultimo_texto ? (s.ultimo_remitente === 'admin' ? 'Tú: ' : '') + s.ultimo_texto : 'Sin mensajes'}
                      </div>
                      {s.unread > 0 && (
                        <div style={{ background: C.primary, color: 'white', borderRadius: '50%', width: 20, height: 20, fontSize: 11, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {s.unread}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!loading && vista === 'equipo' && (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div style={{ padding: '12px 16px', background: C.light, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>👥 Chat general del equipo</div>
                <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Mensajes no ligados a ninguna reserva</div>
              </div>
              <div style={{ flex: 1 }}>
                <ChatSesion
                  sesionId={null}
                  apiBase="/api/admin/chat"
                  miNombre={nombre}
                  miTipo="admin"
                  height="calc(100vh - 180px)"
                />
              </div>
            </div>
          )}
        </div>

        {/* Panel chat de reserva */}
        {selected && vista === 'reservas' && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Header conversación */}
            <div style={{ background: '#f0f2f5', padding: '12px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <button onClick={() => setSelected(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.primary, fontSize: 20, lineHeight: 1 }}>←</button>
              <div style={{ width: 38, height: 38, borderRadius: '50%', background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🏠</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{selected.property_name}</div>
                <div style={{ fontSize: 11, color: C.muted }}>
                  {selected.session_date} · {selected.limpiadora_nombre || 'Sin asignar'}
                  {selected.guest_name && ` · ${selected.guest_name}`}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <ChatSesion
                sesionId={selected.id}
                apiBase="/api/admin/chat"
                miNombre={nombre}
                miTipo="admin"
                height="100%"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
