
'use client'
import { useState, useEffect } from 'react'
import FirmaPad from '@/components/FirmaPad'
import ChatSesionPropietario from '@/components/ChatSesionPropietario'
import ChecklistPropietario from '@/components/ChecklistPropietario'
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

const ESTADO_CFG: Record<string,any> = {
  completada: { label: '✅ Completada', bg: C.okBg,   color: C.ok,   border: C.okBorder,  dot: '#22c55e' },
  en_curso:   { label: '🧹 Limpiando',  bg: C.infoBg, color: C.info, border: C.infoBorder, dot: '#3b82f6' },
  pendiente:  { label: '⏳ Pendiente',  bg: C.bg,     color: C.muted,border: C.border,      dot: '#94a3b8' },
}

const MENU_ITEMS = [
  { id: 'hoy',       icon: '🏠', label: 'Hoy' },
  { id: 'reservas',  icon: '📆', label: 'Reservas' },
  { id: 'finanzas',  icon: '📊', label: 'Finanzas' },
  { id: 'docs',      icon: '📄', label: 'Documentos' },
  { id: 'acceso',    icon: '🔑', label: 'Acceso' },
  { id: 'chat',      icon: '💬', label: 'Chat' },
]

function Stars({ value, onChange }: { value: number; onChange?: (n:number)=>void }) {
  return (
    <div style={{ display:'flex', gap:4 }}>
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)}
          style={{ background:'none', border:'none', cursor: onChange?'pointer':'default', fontSize:24, color: i<=value?'#f59e0b':'#e2e8f0' }}>★</button>
      ))}
    </div>
  )
}

function QuejaModal({ sesion, token, onClose, onSent }: any) {
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
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ sesion_id:sesion.id, descripcion:desc, guest_phone:phone||null, rating:rating||null })
    })
    if (r.ok) { onSent() } else { setError('Error al enviar'); setLoading(false) }
  }
  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:200, padding:16 }}>
      <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto' }}>
        <div style={{ padding:'18px 20px 16px', borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h3 style={{ fontWeight:800, fontSize:17, color:C.text }}>Queja del huésped</h3>
            <p style={{ fontSize:12, color:C.muted, marginTop:2 }}>{sesion.property_name||sesion.nombre}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', fontSize:22, color:C.muted, cursor:'pointer' }}>✕</button>
        </div>
        <form onSubmit={enviar} style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:16 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.muted, marginBottom:8 }}>Valoración del huésped</label>
            <Stars value={rating} onChange={setRating} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.muted, marginBottom:6 }}>¿Qué ha dicho el huésped? *</label>
            <textarea value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ej: El baño no estaba limpio..." rows={4}
              style={{ width:'100%', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:14, resize:'none', fontFamily:'inherit', outline:'none' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:700, color:C.muted, marginBottom:6 }}>Teléfono del huésped</label>
            <input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+34 6xx xxx xxx"
              style={{ width:'100%', border:`1px solid ${C.border}`, borderRadius:10, padding:'10px 12px', fontSize:14, fontFamily:'inherit', outline:'none' }} />
          </div>
          <div style={{ background:C.light, borderRadius:10, padding:'10px 14px', fontSize:12, color:C.brand }}>💡 Sique Brilla recibirá un aviso inmediato.</div>
          {error && <p style={{ color:C.red, fontSize:13 }}>{error}</p>}
          <div style={{ display:'flex', gap:10 }}>
            <button type="button" onClick={onClose} style={{ flex:1, padding:12, borderRadius:10, border:`1px solid ${C.border}`, background:'white', color:C.muted, fontSize:13, cursor:'pointer' }}>Cancelar</button>
            <button type="submit" disabled={loading} style={{ flex:2, padding:12, borderRadius:10, border:'none', background:C.red, color:'white', fontSize:13, fontWeight:700, cursor:'pointer', opacity:loading?0.5:1 }}>
              {loading?'Enviando...':'⚠️ Enviar queja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ── Tarjeta de reserva reutilizable ──────────────────────────────────
function SesionCard({ s, token, permisos, onChat, onChecklist, onQueja, quejaEnviada, onFirma, compact = false }: any) {
  const e    = ESTADO_CFG[s.estado_hoy || s.estado] || ESTADO_CFG.pendiente
  const qEnv = quejaEnviada?.has(s.id)
  const sid  = s.sesion_id || s.id
  const nombre = s.nombre || s.propiedad_nombre || s.property_name || '—'
  const puedeVerLimpieza = permisos?.ver_checklist || permisos?.ver_fotos

  const fmtFecha = (d: string) => {
    if (!d) return ''
    const dt = new Date(d + 'T12:00:00')
    const hoy = new Date()
    const dif = Math.round((dt.getTime() - hoy.setHours(0,0,0,0)) / 86400000)
    if (dif === 0) return 'Hoy'
    if (dif === 1) return 'Mañana'
    if (dif === -1) return 'Ayer'
    return dt.toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })
  }

  return (
    <div style={{ background:'white', borderRadius:14, border:`1px solid ${C.border}`, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
      {/* Barra estado */}
      <div style={{ background:e.bg, borderBottom:`1px solid ${e.border}`, padding:'8px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ width:7, height:7, borderRadius:'50%', background:e.dot }} />
          <span style={{ fontSize:12, fontWeight:700, color:e.color }}>{e.label}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          {(s.hora_completada || s.completed_at) && !compact &&
            <span style={{ fontSize:11, color:e.color, fontWeight:600 }}>
              {s.hora_completada || new Date(s.completed_at).toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'})}
            </span>
          }
          {sid && puedeVerLimpieza && (
            <button onClick={() => onChecklist?.({ id:sid, titulo:nombre })}
              style={{ padding:'3px 8px', borderRadius:7, border:`1px solid ${C.border}`, background:'white', color:C.muted, fontSize:12, cursor:'pointer' }}>🔍</button>
          )}
          {sid && (
            <button onClick={() => onChat?.({ id:sid, titulo:nombre })}
              style={{ padding:'3px 8px', borderRadius:7, border:`1px solid ${C.brand}`, background:C.light, color:C.brand, fontSize:12, fontWeight:700, cursor:'pointer' }}>💬</button>
          )}
        </div>
      </div>

      {/* Cuerpo */}
      <div style={{ padding:'12px 14px' }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:2 }}>
          <div style={{ fontWeight:700, fontSize:15, color:C.text }}>{nombre}</div>
          {!compact && s.session_date && (
            <div style={{ fontSize:11, color:C.muted, fontWeight:600, flexShrink:0, marginTop:2 }}>{fmtFecha(s.session_date)}</div>
          )}
        </div>
        {s.direccion && <div style={{ fontSize:12, color:C.muted, marginBottom:6 }}>📍 {s.direccion}</div>}

        {(s.hora_checkout || s.hora_checkin_siguiente) && (
          <div style={{ display:'flex', gap:8, alignItems:'center', background:C.light, borderRadius:8, padding:'5px 10px', marginBottom:8 }}>
            {s.hora_checkout && <span style={{ fontSize:11, color:C.primary, fontWeight:600 }}>🚪 {String(s.hora_checkout).slice(0,5)}</span>}
            {s.hora_checkout && s.hora_checkin_siguiente && <span style={{ color:C.brand }}>→</span>}
            {s.hora_checkin_siguiente && <span style={{ fontSize:11, color:C.primary, fontWeight:600 }}>🔑 {String(s.hora_checkin_siguiente).slice(0,5)}</span>}
          </div>
        )}

        {s.limpiadora_nombre && <div style={{ fontSize:12, color:C.muted, marginBottom:compact?0:6 }}>🧹 {s.limpiadora_nombre}</div>}
        {s.num_huespedes > 0 && <div style={{ fontSize:12, color:C.muted }}>👥 {s.num_huespedes} huéspedes</div>}

        {!compact && s.foto_url && (
          <button style={{ width:'100%', height:140, borderRadius:10, backgroundImage:`url(${s.foto_url})`, backgroundSize:'cover', backgroundPosition:'center', border:`1px solid ${C.border}`, cursor:'pointer', display:'block', marginTop:8 }} />
        )}

        {!compact && s.estado_hoy === 'completada' && (
          qEnv ? (
            <div style={{ marginTop:8, background:C.warnBg, border:`1px solid ${C.warnBorder}`, borderRadius:10, padding:'8px 14px', fontSize:12, color:C.warn, fontWeight:600, textAlign:'center' }}>
              ⚠️ Queja enviada — Sique Brilla avisado
            </div>
          ) : (
            <button onClick={() => onQueja?.(s)}
              style={{ marginTop:8, width:'100%', padding:8, borderRadius:10, border:`1px solid ${C.redBg}`, background:'white', color:C.red, fontSize:12, fontWeight:700, cursor:'pointer' }}>
              ⚠️ El huésped tiene una queja
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Sección con título colapsable ────────────────────────────────────
function Seccion({ titulo, items, defaultOpen = true, children }: any) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button onClick={() => setOpen(o=>!o)}
        style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 0 8px', background:'transparent', border:'none', cursor:'pointer', fontFamily:'inherit' }}>
        <span style={{ fontSize:13, fontWeight:800, color:C.muted, textTransform:'uppercase', letterSpacing:'0.05em' }}>
          {titulo} <span style={{ fontWeight:500, color:C.muted, marginLeft:4 }}>({items})</span>
        </span>
        <span style={{ color:C.muted, fontSize:14, transition:'transform .2s', display:'inline-block', transform: open?'rotate(0)':'rotate(-90deg)' }}>▾</span>
      </button>
      {open && children}
    </div>
  )
}

export default function PropietarioClient({ cliente, propiedades, historial, token, permisos }: any) {
  const [tab, setTab]       = useState<'hoy'|'reservas'|'finanzas'|'docs'|'acceso'|'chat'>('hoy')
  const [menuOpen, setMenu] = useState(false)
  const [quejaModal, setQueja]            = useState<any>(null)
  const [firmaModal, setFirma]            = useState<any>(null)
  const [quejaEnviada, setQuejaEnviada]   = useState<Set<string>>(new Set())
  const [chatSesion, setChatSesion]       = useState<{id:string;titulo:string}|null>(null)
  const [checklistSesion, setChecklist]   = useState<{id:string;titulo:string}|null>(null)

  // Reservas — carga lazy al entrar en tab
  const [reservas,      setReservas]      = useState<any[]>([])
  const [loadingReservas, setLoadingRes]  = useState(false)

  useEffect(() => {
    if (tab === 'reservas' && reservas.length === 0 && !loadingReservas) {
      setLoadingRes(true)
      fetch(`/api/propietario/${token}/sesiones`)
        .then(r => r.json())
        .then(d => { setReservas(d.sesiones || []); setLoadingRes(false) })
    }
  }, [tab])

  const puedeVerLimpieza = permisos?.ver_checklist || permisos?.ver_fotos
  const completadas = propiedades.filter((p:any) => p.estado_hoy === 'completada').length
  const total       = propiedades.length
  const currentItem = MENU_ITEMS.find(m => m.id === tab)

  // Clasificar reservas en secciones
  const hoy = new Date().toISOString().split('T')[0]
  const proximas  = reservas.filter(s => s.session_date > hoy).sort((a,b) => a.session_date.localeCompare(b.session_date))
  const deHoy     = reservas.filter(s => s.session_date === hoy)
  const recientes = reservas.filter(s => s.session_date < hoy).sort((a,b) => b.session_date.localeCompare(a.session_date))

  // Pantalla completa chat
  if (chatSesion) return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <ChatSesionPropietario token={token} sesionId={chatSesion.id} miNombre={cliente.nombre}
        titulo={chatSesion.titulo} height="100vh" onClose={() => setChatSesion(null)} />
    </div>
  )

  // Pantalla completa checklist
  if (checklistSesion) return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>
      <ChecklistPropietario token={token} sesionId={checklistSesion.id}
        titulo={checklistSesion.titulo} onClose={() => setChecklist(null)} />
    </div>
  )

  const chatProps = { token, permisos, onChat:setChatSesion, onChecklist:setChecklist, onQueja:setQueja, quejaEnviada }

  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", background:C.bg, minHeight:'100vh', maxWidth:480, margin:'0 auto' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}`}</style>

      {/* Header */}
      <div style={{ background:C.primary, padding:'14px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'white', letterSpacing:'-.02em' }}>
            ia<span style={{ color:'#a5b4fc' }}>limp</span>
          </div>
          <div style={{ width:1, height:14, background:'rgba(255,255,255,.25)' }} />
          <div style={{ color:'white', fontSize:13, fontWeight:600 }}>{currentItem?.icon} {currentItem?.label}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'4px 10px', fontSize:12, color:'white', fontWeight:700 }}>
            {completadas}/{total} ✓
          </div>
          <button onClick={() => setMenu(true)}
            style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:36, height:36, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:4 }}>
            {[0,1,2].map(i => <span key={i} style={{ display:'block', width:16, height:2, background:'white', borderRadius:2 }} />)}
          </button>
        </div>
      </div>

      {/* Drawer */}
      {menuOpen && (
        <>
          <div onClick={() => setMenu(false)} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', zIndex:100, backdropFilter:'blur(2px)' }} />
          <div style={{ position:'fixed', top:0, right:0, bottom:0, width:240, background:'white', zIndex:101, display:'flex', flexDirection:'column', boxShadow:'-4px 0 24px rgba(0,0,0,0.15)', animation:'slideIn .2s ease' }}>
            <style>{`@keyframes slideIn{from{transform:translateX(100%)}to{transform:translateX(0)}}`}</style>
            <div style={{ background:C.primary, padding:'20px 20px 16px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontFamily:"'Syne',sans-serif", fontSize:18, fontWeight:800, color:'white' }}>ia<span style={{ color:'#a5b4fc' }}>limp</span></div>
                <button onClick={() => setMenu(false)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:6, width:28, height:28, color:'white', fontSize:16, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
              </div>
              <div style={{ color:'white', fontWeight:700, fontSize:13 }}>{cliente.nombre.split(' ').slice(0,2).join(' ')}</div>
              <div style={{ color:'rgba(255,255,255,0.6)', fontSize:11, marginTop:2 }}>{cliente.empresa_nombre}</div>
            </div>
            <nav style={{ flex:1, padding:'10px 0', overflowY:'auto' }}>
              {MENU_ITEMS.map(item => (
                <button key={item.id} onClick={() => { setTab(item.id as any); setMenu(false) }}
                  style={{ width:'100%', padding:'13px 20px', border:'none', background: tab===item.id?C.light:'transparent', display:'flex', alignItems:'center', gap:12, cursor:'pointer', borderLeft:`3px solid ${tab===item.id?C.primary:'transparent'}`, fontFamily:'inherit' }}>
                  <span style={{ fontSize:18, width:24, textAlign:'center' }}>{item.icon}</span>
                  <span style={{ fontSize:14, fontWeight: tab===item.id?700:500, color: tab===item.id?C.primary:C.text }}>{item.label}</span>
                  {tab===item.id && <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:C.primary }} />}
                </button>
              ))}
            </nav>
            <div style={{ padding:'14px 20px', borderTop:`1px solid ${C.border}`, fontSize:11, color:C.muted, textAlign:'center' }}>
              {cliente.empresa_nombre} · <span style={{ color:C.brand, fontWeight:600 }}>ialimp</span>
            </div>
          </div>
        </>
      )}

      {/* Contenido */}
      <div style={{ padding:14 }}>

        {/* ── HOY ── */}
        {tab === 'hoy' && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {propiedades.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
                <div style={{ fontSize:40, marginBottom:10 }}>🏠</div>
                <div style={{ fontWeight:600 }}>Sin limpiezas hoy</div>
              </div>
            )}
            {propiedades.map((p:any) => (
              <SesionCard key={p.id} s={p} {...chatProps}
                onChat={setChatSesion} onChecklist={setChecklist}
                onFirma={setFirma} />
            ))}
          </div>
        )}

        {/* ── RESERVAS ── */}
        {tab === 'reservas' && (
          <div>
            {loadingReservas && (
              <div style={{ textAlign:'center', padding:'40px 0', color:C.muted }}>
                <div style={{ fontSize:28, marginBottom:8 }}>📆</div>
                <div style={{ fontSize:13, fontWeight:600 }}>Cargando reservas...</div>
              </div>
            )}

            {!loadingReservas && reservas.length === 0 && (
              <div style={{ textAlign:'center', padding:'48px 0', color:C.muted }}>
                <div style={{ fontSize:40, marginBottom:10 }}>📆</div>
                <div style={{ fontWeight:600 }}>Sin reservas</div>
              </div>
            )}

            {!loadingReservas && reservas.length > 0 && (
              <div style={{ display:'flex', flexDirection:'column', gap:0 }}>

                {/* Próximas */}
                {proximas.length > 0 && (
                  <Seccion titulo="🔜 Próximas" items={proximas.length} defaultOpen={true}>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                      {proximas.map(s => (
                        <SesionCard key={s.id} s={s} compact={false} {...chatProps}
                          onChat={setChatSesion} onChecklist={setChecklist} />
                      ))}
                    </div>
                  </Seccion>
                )}

                {/* Hoy */}
                {deHoy.length > 0 && (
                  <Seccion titulo="📅 Hoy" items={deHoy.length} defaultOpen={true}>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                      {deHoy.map(s => (
                        <SesionCard key={s.id} s={s} compact={false} {...chatProps}
                          onChat={setChatSesion} onChecklist={setChecklist} />
                      ))}
                    </div>
                  </Seccion>
                )}

                {/* Recientes */}
                {recientes.length > 0 && (
                  <Seccion titulo="🕐 Recientes" items={recientes.length} defaultOpen={false}>
                    <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:16 }}>
                      {recientes.map(s => (
                        <SesionCard key={s.id} s={s} compact={true} {...chatProps}
                          onChat={setChatSesion} onChecklist={setChecklist} />
                      ))}
                    </div>
                  </Seccion>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── FINANZAS ── */}
        {tab === 'finanzas' && <ContabilidadTab token={token} />}

        {/* ── DOCS ── */}
        {tab === 'docs' && (
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.5 }}>
              Fotografía o sube facturas, albaranes y tickets. La IA los analiza y genera el apunte contable.
            </p>
            <EscanerDocumento token={token} onGuardado={() => {}} />
          </div>
        )}

        {/* ── ACCESO ── */}
        {tab === 'acceso' && (
          <div>
            <p style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.5 }}>
              Instrucciones de acceso para cada piso. La limpiadora las verá antes de cada sesión.
            </p>
            {propiedades.map((p:any) => (
              <AccesoPropiedad key={p.id} propiedadId={p.id} propiedadNombre={p.nombre} token={token}
                instruccionesIniciales={p.instrucciones_acceso||''} tipoAccesoInicial={p.tipo_acceso||'llave'}
                codigoAccesoInicial={p.codigo_acceso||''} archivosIniciales={p.archivos_acceso||[]} />
            ))}
          </div>
        )}

        {/* ── CHAT GENERAL ── */}
        {tab === 'chat' && (
          <div style={{ margin:'-14px', height:'calc(100vh - 64px)' }}>
            <ChatSesionPropietario token={token} sesionId={null} miNombre={cliente.nombre}
              titulo="Chat con la empresa" height="calc(100vh - 64px)" />
          </div>
        )}
      </div>

      {/* Modales */}
      {quejaModal && (
        <QuejaModal sesion={quejaModal} token={token} onClose={() => setQueja(null)}
          onSent={() => { setQuejaEnviada(s => new Set([...s, quejaModal.id])); setQueja(null) }} />
      )}
      {firmaModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'flex-end', justifyContent:'center', zIndex:150, padding:16 }}>
          <div style={{ background:'white', borderRadius:20, width:'100%', maxWidth:480 }}>
            <FirmaPad
              onFirmar={async (svg:string, nombre:string) => {
                await fetch('/api/propietario/'+token+'/firmar', {
                  method:'POST', headers:{'Content-Type':'application/json'},
                  body: JSON.stringify({ sesion_id:firmaModal.sesion_id, firma_svg:svg, firmante_nombre:nombre })
                })
                setFirma(null)
              }}
              onCancelar={() => setFirma(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
