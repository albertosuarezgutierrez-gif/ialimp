'use client'
import { useState } from 'react'
import FirmaPad from '@/components/FirmaPad'
import ChatSesion from '@/components/ChatSesion'
import ChatSesionPropietario from '@/components/ChatSesionPropietario'
import GastosTab from '@/components/GastosTab'
import ContabilidadTab from '@/components/ContabilidadTab'
import AccesoPropiedad from '@/components/AccesoPropiedad'
import EscanerDocumento from '@/components/EscanerDocumento'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', okBorder: '#bbf7d0',
  warn: '#d97706', warnBg: '#fffbeb', warnBorder: '#fcd34d',
  info: '#2563eb', infoBg: '#eff6ff', infoBorder: '#bfdbfe',
  red: '#dc2626', redBg: '#fef2f2',
}

const ESTADO_CFG = {
  completada: { label: '✅ Listo',      bg: C.okBg,   color: C.ok,   border: C.okBorder,   dot: '#22c55e' },
  en_curso:   { label: '🧹 Limpiando', bg: C.infoBg, color: C.info, border: C.infoBorder,  dot: '#3b82f6' },
  pendiente:  { label: '⏳ Pendiente', bg: C.bg,     color: C.muted,border: C.border,       dot: '#94a3b8' },
}

function Stars({ value, onChange }: { value: number; onChange?: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button"
          onClick={() => onChange?.(i)}
          style={{ background: 'none', border: 'none', cursor: onChange ? 'pointer' : 'default', fontSize: 24, color: i <= value ? '#f59e0b' : '#e2e8f0' }}>
          ★
        </button>
      ))}
    </div>
  )
}

interface QuejaModalProps {
  sesion: any; token: string
  onClose: () => void; onSent: () => void
}

function QuejaModal({ sesion, token, onClose, onSent }: QuejaModalProps) {
  const [desc, setDesc]       = useState('')
  const [phone, setPhone]     = useState('')
  const [rating, setRating]   = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  async function enviar(e: React.FormEvent) {
    e.preventDefault()
    if (!desc.trim()) { setError('Describe el problema'); return }
    setLoading(true)
    const r = await fetch(`/api/propietario/${token}/queja`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesion_id: sesion.id, descripcion: desc, guest_phone: phone || null, rating: rating || null })
    })
    if (r.ok) { onSent() }
    else { setError('Error al enviar'); setLoading(false) }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto' }}>
        <div style={{ padding: '18px 20px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ fontWeight: 800, fontSize: 17, color: C.text }}>Queja del huésped</h3>
            <p style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sesion.property_name}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: C.muted, cursor: 'pointer' }}>✕</button>
        </div>
        <form onSubmit={enviar} style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 8 }}>Valoración del huésped</label>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>¿Qué ha dicho el huésped? *</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Ej: El baño no estaba limpio, había pelo en la ducha..."
              rows={4}
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: C.muted, marginBottom: 6 }}>
              Teléfono del huésped
              <span style={{ fontWeight: 400, marginLeft: 4 }}>(para que la empresa de limpieza le llame)</span>
            </label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              placeholder="+34 6xx xxx xxx"
              style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 10, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ background: C.light, borderRadius: 10, padding: '10px 14px', fontSize: 12, color: C.brand }}>
            💡 Sique Brilla recibirá un aviso inmediato y se pondrá en contacto para solucionar el problema.
          </div>
          {error && <p style={{ color: C.red, fontSize: 13 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px', borderRadius: 10, border: `1px solid ${C.border}`, background: 'white', color: C.muted, fontSize: 13, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 2, padding: '12px', borderRadius: 10, border: 'none', background: C.red, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: loading ? 0.5 : 1 }}>
              {loading ? 'Enviando...' : '⚠️ Enviar queja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function PropietarioClient({ cliente, propiedades, historial, token }: any) {
  const [tab, setTab]           = useState<'hoy'|'historial'|'gastos'|'acceso'|'chat'|'docs'|'finanzas'>('hoy')
  const [fotoModal, setFoto]    = useState<string|null>(null)
  const [quejaModal, setQueja]  = useState<any>(null)
  const [firmaModal, setFirma]  = useState<any>(null)
  const [quejaEnviada, setQuejaEnviada] = useState<Set<string>>(new Set())
  // Chat por sesión — null = ninguno abierto
  const [chatSesion, setChatSesion]  = useState<{ id: string; titulo: string } | null>(null)

  const completadas = propiedades.filter((p: any) => p.estado_hoy === 'completada').length
  const total       = propiedades.length

  // Si hay un chat de sesión abierto, mostrar pantalla completa de chat
  if (chatSesion) {
    return (
      <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
        <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>
        <ChatSesionPropietario
          token={token}
          sesionId={chatSesion.id}
          miNombre={cliente.nombre}
          titulo={chatSesion.titulo}
          height="100vh"
          onClose={() => setChatSesion(null)}
        />
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif", background: C.bg, minHeight: '100vh', maxWidth: 480, margin: '0 auto' }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <div style={{ background: C.primary }}>
        <div style={{ padding: '20px 20px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            fontFamily:"'Syne','Plus Jakarta Sans',sans-serif",
            fontSize:20, fontWeight:800, color:'white', letterSpacing:'-.02em',
          }}>
            ia<span style={{ color:'#a5b4fc' }}>limp</span>
          </div>
          <div style={{ width:1, height:16, background:'rgba(255,255,255,.25)' }} />
          <div>
            <div style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{cliente.empresa_nombre}</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 11 }}>Hola, {cliente.nombre.split(' ')[0]} 👋</div>
          </div>
        </div>

        <div style={{ margin: '12px 20px 0', display:'grid', gridTemplateColumns:'2fr 1fr', gap:8 }}>
          {/* Estado limpiezas hoy — tappable */}
          <div onClick={() => setTab('hoy')}
            style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor:'pointer' }}>
            <div>
              <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Hoy</div>
              <div style={{ color: 'white', fontSize: 22, fontWeight: 800, marginTop: 2, letterSpacing: '-0.02em' }}>
                {completadas}/{total} <span style={{ fontSize: 12, fontWeight: 400, opacity: 0.65 }}>listos</span>
              </div>
            </div>
            <div style={{ fontSize: 32 }}>{completadas === total ? '✅' : completadas > 0 ? '🧹' : '⏳'}</div>
          </div>
          {/* Acceso rápido finanzas */}
          <div onClick={() => setTab('finanzas')}
            style={{ background: 'rgba(255,255,255,0.13)', borderRadius: 12, padding: '12px 14px',
              display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', gap:4 }}>
            <div style={{ fontSize:24 }}>📊</div>
            <div style={{ color:'rgba(255,255,255,.8)', fontSize:11, fontWeight:700 }}>Finanzas</div>
          </div>
        </div>

        <div style={{ display: 'flex', marginTop: 16, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {[
            ['hoy',       '🏠 Hoy'],
            ['finanzas',  '📊 Finanzas'],
            ['acceso',    '🔑 Acceso'],
            ['chat',      '💬 Chat'],
            ['historial', 'Historial'],
            ['docs',      '📄 Docs'],
          ].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{ flexShrink:0, padding: '11px 14px', border: 'none', cursor: 'pointer', background: 'transparent',
                color: tab === id ? 'white' : 'rgba(255,255,255,0.5)',
                fontWeight: tab === id ? 700 : 500, fontSize: 13,
                borderBottom: `2.5px solid ${tab === id ? 'white' : 'transparent'}`,
                fontFamily: 'inherit', whiteSpace:'nowrap' }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: 16 }}>
        {tab === 'hoy' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {propiedades.map((p: any) => {
              const e   = ESTADO_CFG[p.estado_hoy as keyof typeof ESTADO_CFG] || ESTADO_CFG.pendiente
              const qEnv = quejaEnviada.has(p.id)
              return (
                <div key={p.id} style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                  <div style={{ background: e.bg, borderBottom: `1px solid ${e.border}`, padding: '9px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: e.dot }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: e.color }}>{e.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {p.hora_completada && <span style={{ fontSize: 12, color: e.color, fontWeight: 600 }}>Listo a las {p.hora_completada}</span>}
                      {/* Botón chat de esta sesión */}
                      {p.sesion_id && (
                        <button
                          onClick={() => setChatSesion({ id: p.sesion_id, titulo: p.nombre })}
                          style={{
                            padding: '4px 10px', borderRadius: 8, border: `1px solid ${C.brand}`,
                            background: C.light, color: C.brand, fontSize: 11, fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: 4
                          }}>
                          💬 Chat
                        </button>
                      )}
                    </div>
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>{p.nombre}</div>
                    {p.direccion && <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>📍 {p.direccion}</div>}

                    {p.hora_checkout && p.hora_checkin_siguiente && (
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.light, borderRadius: 8, padding: '6px 10px', marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>🚪 {String(p.hora_checkout).slice(0,5)}</span>
                        <span style={{ color: C.brand }}>→</span>
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>🔑 {String(p.hora_checkin_siguiente).slice(0,5)}</span>
                      </div>
                    )}

                    {p.limpiadora_nombre && (
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>🧹 {p.limpiadora_nombre}</div>
                    )}

                    {p.foto_url && (
                      <button onClick={() => setFoto(p.foto_url)}
                        style={{ width: '100%', height: 160, borderRadius: 10, backgroundImage: `url(${p.foto_url})`, backgroundSize: 'cover', backgroundPosition: 'center', border: `1px solid ${C.border}`, cursor: 'pointer', display: 'block', marginBottom: 10 }} />
                    )}

                    {p.estado_hoy === 'completada' && !p.firma_at && (p.tipo === 'comunidad' || p.tipo === 'particular') && (
                      <button onClick={() => setFirma(p)}
                        style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${C.brand}`, background: C.light, color: C.primary, fontSize: 12, fontWeight: 700, cursor: 'pointer', marginBottom: 6 }}>
                        ✍️ Firmar conformidad
                      </button>
                    )}
                    {p.firma_at && (
                      <div style={{ fontSize: 11, color: C.ok, fontWeight: 600, textAlign: 'center', padding: '5px 0' }}>✅ Firmado por {p.firma_nombre || 'cliente'}</div>
                    )}

                    {p.estado_hoy === 'completada' && (
                      qEnv ? (
                        <div style={{ background: C.warnBg, border: `1px solid ${C.warnBorder}`, borderRadius: 10, padding: '9px 14px', fontSize: 12, color: C.warn, fontWeight: 600, textAlign: 'center' }}>
                          ⚠️ Queja enviada — Sique Brilla ha sido avisado
                        </div>
                      ) : (
                        <button onClick={() => setQueja(p)}
                          style={{ width: '100%', padding: '9px', borderRadius: 10, border: `1px solid ${C.redBg}`, background: 'white', color: C.red, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                          ⚠️ El huésped tiene una queja
                        </button>
                      )
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === 'historial' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {historial.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>Sin historial todavía</div>
            )}
            {historial.map((h: any, i: number) => (
              <div key={i} style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'center' }}>
                {h.foto_despues_url ? (
                  <button onClick={() => setFoto(h.foto_despues_url)}
                    style={{ width: 52, height: 52, borderRadius: 8, backgroundImage: `url(${h.foto_despues_url})`, backgroundSize: 'cover', border: `1px solid ${C.border}`, cursor: 'pointer', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>✅</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{h.property_name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {new Date(h.session_date).toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })}
                    {h.hora_fin ? ` · ${h.hora_fin}` : ''}
                  </div>
                  {h.limpiadora && <div style={{ fontSize: 11, color: C.brand, marginTop: 1 }}>🧹 {h.limpiadora}</div>}
                </div>
                {/* Botón chat en historial */}
                {h.id && (
                  <button onClick={() => setChatSesion({ id: h.id, titulo: h.property_name })}
                    style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', color: C.muted, fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                    💬
                  </button>
                )}
                <span style={{ color: '#22c55e', fontSize: 20 }}>✅</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal foto */}
      {fotoModal && (
        <div onClick={() => setFoto(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}>
          <img src={fotoModal} style={{ maxWidth: '100%', maxHeight: '88vh', borderRadius: 14 }} />
        </div>
      )}

      {tab === 'finanzas' && (
        <ContabilidadTab token={token} />
      )}

      {tab === 'docs' && (
        <div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
            Fotografía o sube facturas, albaranes y tickets. La IA los analiza, genera el apunte contable y actualiza el stock automáticamente.
          </p>
          <EscanerDocumento token={token} onGuardado={() => {}} />
        </div>
      )}

      {tab === 'acceso' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, lineHeight: 1.5 }}>
            Añade las instrucciones de acceso para cada piso: tipo de llave, código, ubicación de la caja... La empresa de limpieza las verá antes de cada sesión.
          </p>
          {propiedades.map((p: any) => (
            <AccesoPropiedad
              key={p.id}
              propiedadId={p.id}
              propiedadNombre={p.nombre}
              token={token}
              instruccionesIniciales={p.instrucciones_acceso || ''}
              tipoAccesoInicial={p.tipo_acceso || 'llave'}
              codigoAccesoInicial={p.codigo_acceso || ''}
              archivosIniciales={p.archivos_acceso || []}
            />
          ))}
        </div>
      )}

      {/* Tab chat GENERAL */}
      {tab === 'chat' && (
        <div style={{ height: 'calc(100vh - 200px)', marginTop: -16, marginLeft: -16, marginRight: -16 }}>
          <ChatSesionPropietario
            token={token}
            sesionId={null}
            miNombre={cliente.nombre}
            titulo="Chat con la empresa"
            height="calc(100vh - 184px)"
          />
        </div>
      )}

      {/* Modal firma */}
      {firmaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', zIndex: 100, padding: 16 }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 480 }}>
            <FirmaPad
              onFirmar={async (svg, nombre) => {
                await fetch('/api/propietario/' + token + '/firmar', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ sesion_id: firmaModal.sesion_id, firma_svg: svg, firmante_nombre: nombre })
                })
                setFirma(null)
              }}
              onCancelar={() => setFirma(null)}
            />
          </div>
        </div>
      )}

      {/* Modal queja */}
      {quejaModal && (
        <QuejaModal
          sesion={quejaModal}
          token={token}
          onClose={() => setQueja(null)}
          onSent={() => {
            setQuejaEnviada(s => new Set([...s, quejaModal.id]))
            setQueja(null)
          }}
        />
      )}

      <div style={{ textAlign: 'center', padding: '20px 16px 36px', fontSize: 11, color: C.muted }}>
        {cliente.empresa_nombre} · <span style={{ color: C.brand, fontWeight: 600 }}>ialimp</span>
      </div>
    </div>
  )
}
