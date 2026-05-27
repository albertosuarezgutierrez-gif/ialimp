'use client'
import { useState, useEffect, useRef } from 'react'

const C = { primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff', bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0' }

interface Props {
  sesionId: string | null
  apiBase: string        // '/api/admin/chat' | '/api/l/chat'
  miNombre: string       // 'Sique Brilla' | nombre limpiadora
  miTipo: string         // 'admin' | 'limpiadora'
}

export default function ChatSesion({ sesionId, apiBase, miNombre, miTipo }: Props) {
  const [mensajes, setMensajes] = useState<any[]>([])
  const [texto, setTexto]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)

  useEffect(() => {
    cargar()
    const t = setInterval(cargar, 5000) // poll cada 5s
    return () => clearInterval(t)
  }, [sesionId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  async function cargar() {
    const url = apiBase + (sesionId ? '?sesion_id=' + sesionId : '')
    const r = await fetch(url)
    const d = await r.json()
    setMensajes(d.mensajes || [])
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!texto.trim()) return
    setLoading(true)
    await fetch(apiBase, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesion_id: sesionId, texto: texto.trim() })
    })
    setTexto('')
    await cargar()
    setLoading(false)
  }

  const fmtHora = (t: string) => new Date(t).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>
      {/* Mensajes */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {mensajes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: C.muted, fontSize: 13 }}>
            💬 Sin mensajes todavía
          </div>
        )}
        {mensajes.map((m: any) => {
          const esMio = m.remitente_tipo === miTipo
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: esMio ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '9px 14px', borderRadius: esMio ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                background: esMio ? C.primary : 'white',
                color: esMio ? 'white' : C.text,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                fontSize: 13, lineHeight: 1.5
              }}>
                {!esMio && <div style={{ fontSize: 10, fontWeight: 700, color: C.brand, marginBottom: 3 }}>{m.remitente_nombre}</div>}
                <div>{m.texto}</div>
                <div style={{ fontSize: 10, opacity: 0.65, marginTop: 3, textAlign: 'right' }}>{fmtHora(m.creado_at)}</div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={enviar} style={{ padding: '10px 14px', background: 'white', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 8 }}>
        <input value={texto} onChange={e => setTexto(e.target.value)}
          placeholder="Escribe un mensaje..."
          style={{ flex: 1, padding: '10px 14px', border: `1px solid ${C.border}`, borderRadius: 22, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
        <button type="submit" disabled={loading || !texto.trim()}
          style={{ width: 40, height: 40, borderRadius: '50%', background: C.primary, border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: texto.trim() ? 1 : 0.4 }}>
          ↑
        </button>
      </form>
    </div>
  )
}
