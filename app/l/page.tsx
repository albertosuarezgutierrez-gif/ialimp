'use client'
import { useState, useEffect } from 'react'
import ChatSesion from '@/components/ChatSesion'

// ── Colores corporativos ialimp ───────────────────────────────────────────────
const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb',
  red: '#dc2626', redBg: '#fef2f2',
}

// ── Checklist por tipo de servicio ────────────────────────────────────────────
const CHECKLIST_TPL: Record<string, any[]> = {"rotacion": [{"id": "r1", "label": "Cambiar sábanas y fundas", "critico": true}, {"id": "r2", "label": "Limpiar y desinfectar baños", "critico": true}, {"id": "r3", "label": "Limpiar cocina y electrodomésticos", "critico": true}, {"id": "r4", "label": "Barrer y fregar suelos", "critico": true}, {"id": "r5", "label": "Limpiar espejos y superficies", "critico": false}, {"id": "r6", "label": "Vaciar papeleras", "critico": false}, {"id": "r7", "label": "Reponer papel, jabón y gel", "critico": true}, {"id": "r8", "label": "Foto baño principal", "critico": true, "foto": true}, {"id": "r9", "label": "Foto dormitorio principal", "critico": true, "foto": true}, {"id": "r10", "label": "Foto cocina", "critico": false, "foto": true}], "particular": [{"id": "p1", "label": "Habitaciones: cambiar ropa de cama", "critico": false}, {"id": "p2", "label": "Baños: limpiar y desinfectar", "critico": true}, {"id": "p3", "label": "Salón: polvo y aspirar", "critico": false}, {"id": "p4", "label": "Cocina: limpiar superficies", "critico": true}, {"id": "p5", "label": "Barrer y fregar todos los suelos", "critico": true}, {"id": "p6", "label": "Vaciar papeleras", "critico": false}], "comunidad": [{"id": "c1", "label": "Portal: barrer y fregar", "critico": true}, {"id": "c2", "label": "Escaleras: barrer y fregar", "critico": true}, {"id": "c3", "label": "Limpiar buzones y pasamanos", "critico": false}, {"id": "c4", "label": "Limpiar cristales portal", "critico": false}, {"id": "c5", "label": "Papeleras y ceniceros", "critico": false}, {"id": "c6", "label": "Foto portal terminado", "critico": true, "foto": true}], "default": [{"id": "d1", "label": "Limpieza general", "critico": true}, {"id": "d2", "label": "Suelos", "critico": true}, {"id": "d3", "label": "Superficies", "critico": false}, {"id": "d4", "label": "Baños", "critico": true}, {"id": "d5", "label": "Foto final", "critico": false, "foto": true}]}

function getChecklist(tipo: string, existente: any[]|null) {
  if (existente?.length) return existente
  const tpl = CHECKLIST_TPL[tipo] || CHECKLIST_TPL.default
  return tpl.map(item => ({ ...item, hecho: false, foto_url: null }))
}

// ── Fix bug 1970: TIME de postgres → mostrar string directamente ──────────────
function fmtTime(t: string|null): string|null {
  if (!t) return null
  // Si viene "11:00:00" o "11:00" → mostrar solo HH:MM
  if (typeof t === 'string') return t.slice(0, 5)
  return null
}

function fmtFecha(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
}

// ── Componente: card de sesión en la lista ────────────────────────────────────
function SesionCard({ s, onTap }: { s: any; onTap: () => void }) {
  const inicio    = fmtTime(s.hora_checkout) || fmtTime(s.hora_inicio) || fmtTime(s.hora_pactada)
  const limite    = fmtTime(s.hora_checkin_siguiente)
  const hecho     = s.completada !== undefined ? s.completada : !!s.completed_at
  const enCurso   = !hecho && !!s.started_at
  const pendiente = !hecho && !s.started_at

  return (
    <button onClick={onTap} style={{
      width: '100%', textAlign: 'left', border: 'none', cursor: 'pointer',
      background: 'white', borderRadius: 14,
      borderLeft: `4px solid ${hecho ? C.ok : enCurso ? C.brand : C.border}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', padding: '14px 16px',
      display: 'flex', alignItems: 'flex-start', gap: 12,
      fontFamily: 'inherit'
    }}>
      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>
        {{ rotacion: '🏠', particular: '🏡', comunidad: '🏢', oficina: '💼' }[s.tipo_servicio] || '🏠'}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>
          {s.property_name}
        </div>
        {s.cliente_nombre && (
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>{s.cliente_nombre}</div>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          {inicio && (
            <span style={{ fontSize: 12, fontWeight: 700, color: C.primary, background: C.light, padding: '2px 8px', borderRadius: 6 }}>
              {inicio}{limite ? ` → ${limite}` : ''}
            </span>
          )}
          {!inicio && s.flexibilidad_horaria === 'flexible' && (
            <span style={{ fontSize: 12, color: C.muted }}>🔓 Flexible</span>
          )}
          {s.alerta_ventana && (
            <span style={{ fontSize: 11, color: C.warn }}>⚠️ Ventana ajustada</span>
          )}
          {s.num_huespedes && (
            <span style={{ fontSize: 11, color: C.muted }}>👥 {s.num_huespedes}</span>
          )}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {hecho && <div style={{ fontSize: 22 }}>✅</div>}
        {enCurso && <div style={{ fontSize: 11, fontWeight: 700, color: C.brand, background: C.light, padding: '4px 10px', borderRadius: 8, whiteSpace: 'nowrap' }}>En curso</div>}
        {pendiente && <div style={{ fontSize: 20, color: C.border }}>›</div>}
      </div>
    </button>
  )
}

// ── Componente: detalle de sesión con checklist ───────────────────────────────
function SesionDetalle({ s, onBack, onUpdate }: { s: any; onBack: () => void; onUpdate: (s: any) => void }) {
  const [checklist, setChecklist] = useState<any[]>(() => getChecklist(s.tipo_servicio, s.checklist_data))
  const [incidencias, setIncidencias] = useState<any[]>(s.incidencias || [])
  const [showIncid, setShowIncid]     = useState(false)
  const [showChat, setShowChat]       = useState(false)
  const [showChatGlobal, setShowChatGlobal] = useState(false)
  const [fotoRef, setFotoRef]            = useState<string|null>(null)
  const [incDesc, setIncDesc]         = useState('')
  const [saving, setSaving]           = useState(false)
  const [sesion, setSesion]           = useState(s)

  const hecho    = !!sesion.completed_at
  const enCurso  = !hecho && !!sesion.started_at
  const criticos = checklist.filter(i => i.critico)
  const todosCriticos = criticos.every(i => i.hecho && (!i.foto || i.foto_url))
  const pct = checklist.length > 0 ? Math.round((checklist.filter(i => i.hecho).length / checklist.length) * 100) : 0

  async function ficharEntrada() {
    setSaving(true)
    const r = await fetch(`/api/l/sesiones/${sesion.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'fichar_entrada' })
    })
    const d = await r.json()
    if (d.ok) { setSesion(d.sesion); onUpdate(d.sesion) }
    setSaving(false)
  }

  async function toggleItem(idx: number) {
    const nv = checklist.map((it, i) => i === idx ? { ...it, hecho: !it.hecho } : it)
    setChecklist(nv)
    await fetch(`/api/l/sesiones/${sesion.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'checklist', checklist_data: nv })
    })
  }

  async function completar() {
    if (!todosCriticos) { alert('Hay tareas críticas sin marcar'); return }
    setSaving(true)
    const r = await fetch(`/api/l/sesiones/${sesion.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'completar', checklist_data: checklist })
    })
    const d = await r.json()
    if (d.ok) { setSesion(d.sesion); onUpdate(d.sesion) }
    setSaving(false)
  }

  async function añadirIncidencia() {
    if (!incDesc.trim()) return
    const nv = [...incidencias, {
      id: Date.now().toString(), desc: incDesc.trim(),
      creada_at: new Date().toISOString(), resuelta: false
    }]
    setIncidencias(nv)
    setIncDesc('')
    setShowIncid(false)
    await fetch(`/api/l/sesiones/${sesion.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: 'incidencia', incidencias: nv })
    })
  }

  const inicio = fmtTime(sesion.hora_checkout) || fmtTime(sesion.hora_inicio) || fmtTime(sesion.hora_pactada)
  const limite = fmtTime(sesion.hora_checkin_siguiente)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.primary, padding: '0 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 16px 14px' }}>
          <button onClick={onBack} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 36, height: 36, borderRadius: 10, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 17, letterSpacing: '-0.01em' }}>{sesion.property_name}</div>
            {sesion.cliente_nombre && <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>{sesion.cliente_nombre}</div>}
          </div>
          {hecho && <span style={{ fontSize: 28 }}>✅</span>}
        </div>
        {/* Ventana horaria */}
        {inicio && (
          <div style={{ background: 'rgba(255,255,255,0.12)', margin: '0 16px 16px', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: 'white', fontSize: 14, fontWeight: 700 }}>🚪 Checkout: {inicio}</span>
            {limite && <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>🔑 Checkin: {limite}</span>}
          </div>
        )}
      </div>

        {/* Cómo llegar + Chat grupal */}
        <div style={{ display: 'flex', gap: 8, padding: '0 16px 12px' }}>
          {sesion.direccion && (
            <a
              href={`https://maps.google.com/maps?q=${encodeURIComponent(sesion.direccion + ', Sevilla')}`}
              target="_blank" rel="noreferrer"
              style={{ flex: 1, background: 'rgba(255,255,255,0.15)', color: 'white', padding: '9px 12px', borderRadius: 10, textDecoration: 'none', fontSize: 12, fontWeight: 700, textAlign: 'center' as const, display: 'block' }}>
              📍 Cómo llegar
            </a>
          )}
          <button onClick={() => setShowChatGlobal(v => !v)}
            style={{ flex: 1, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', padding: '9px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            💬 Chat equipo
          </button>
        </div>

      <div style={{ padding: '16px' }}>

        {/* Fichar entrada */}
        {!enCurso && !hecho && (
          <button onClick={ficharEntrada} disabled={saving}
            style={{ width: '100%', padding: '16px', borderRadius: 14, border: 'none', background: C.primary, color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer', marginBottom: 16, boxShadow: '0 4px 12px rgba(79,70,229,0.3)', fontFamily: 'inherit' }}>
            {saving ? 'Fichando...' : '▶ Fichar entrada'}
          </button>
        )}

        {/* Barra progreso checklist */}
        {enCurso && (
          <div style={{ background: 'white', borderRadius: 12, padding: '12px 16px', marginBottom: 14, border: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Progreso</span>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.brand }}>{pct}%</span>
            </div>
            <div style={{ height: 8, background: C.bg, borderRadius: 4 }}>
              <div style={{ height: '100%', borderRadius: 4, background: pct === 100 ? C.ok : C.brand, width: `${pct}%`, transition: 'width 0.3s' }} />
            </div>
          </div>
        )}

        {/* Checklist */}
        {(enCurso || hecho) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Checklist
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {checklist.map((item, idx) => (
                <div key={item.id} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: `3px solid ${item.hecho && (!item.foto || item.foto_url) ? C.ok : item.critico ? C.brand : C.border}` }}>
                  {/* Fila principal */}
                  <button onClick={() => !hecho && toggleItem(idx)}
                    style={{ width: '100%', textAlign: 'left', border: 'none', cursor: hecho ? 'default' : 'pointer', background: 'transparent', padding: '12px 14px', display: 'flex', gap: 12, alignItems: 'center', fontFamily: 'inherit' }}>
                    <div style={{ width: 26, height: 26, borderRadius: 8, flexShrink: 0, border: '2px solid', borderColor: item.hecho ? C.ok : item.critico ? C.brand : C.border, background: item.hecho ? C.okBg : 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>
                      {item.hecho && (!item.foto || item.foto_url) ? '✓' : item.hecho ? '📷' : ''}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: item.critico ? 600 : 400, color: item.hecho ? C.muted : C.text, textDecoration: item.hecho && (!item.foto || item.foto_url) ? 'line-through' : 'none' }}>
                        {item.foto && '📷 '}{item.label}
                      </div>
                      {item.critico && !item.hecho && <span style={{ fontSize: 10, color: C.brand, fontWeight: 700 }}>CRÍTICO</span>}
                      {item.foto && item.hecho && !item.foto_url && <span style={{ fontSize: 10, color: C.warn, fontWeight: 700 }}>⚠ Falta foto obligatoria</span>}
                    </div>
                    {item.foto_referencia_url && (
                      <button onClick={e => { e.stopPropagation(); setFotoRef(item.foto_referencia_url) }}
                        style={{ background: C.light, border: 'none', borderRadius: 8, padding: '4px 8px', fontSize: 11, color: C.brand, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                        Ver cómo ✨
                      </button>
                    )}
                  </button>
                  {/* Upload foto si item.foto = true */}
                  {!hecho && item.foto && item.hecho && !item.foto_url && (
                    <div style={{ padding: '0 14px 12px', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <label style={{ flex: 1, background: C.warnBg, border: `1px dashed ${C.warn}`, borderRadius: 8, padding: '8px', textAlign: 'center' as const, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: C.warn }}>
                        📷 Subir foto
                        <input type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
                          onChange={async e => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            const fd = new FormData(); fd.append('file', file); fd.append('sesion_id', sesion.id); fd.append('tipo', item.id)
                            const r = await fetch('/api/l/upload-photo', { method: 'POST', body: fd })
                            const d = await r.json()
                            if (d.url) {
                              const nv = checklist.map((it, i) => i === idx ? { ...it, foto_url: d.url } : it)
                              setChecklist(nv)
                              await fetch(`/api/l/sesiones/${sesion.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ accion: 'checklist', checklist_data: nv }) })
                            }
                          }} />
                      </label>
                    </div>
                  )}
                  {/* Foto ya subida */}
                  {item.foto_url && (
                    <div style={{ padding: '0 14px 12px' }}>
                      <img src={item.foto_url} alt="foto" onClick={() => setFotoRef(item.foto_url)}
                        style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: `2px solid ${C.ok}` }} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Incidencias */}
        {(enCurso || hecho) && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Incidencias {incidencias.length > 0 ? `(${incidencias.length})` : ''}
              </div>
              {!hecho && (
                <button onClick={() => setShowIncid(true)}
                  style={{ background: C.light, border: 'none', color: C.brand, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, cursor: 'pointer' }}>
                  + Añadir
                </button>
              )}
            </div>
            {incidencias.map((inc: any) => (
              <div key={inc.id} style={{ background: C.warnBg, border: `1px solid ${C.warn}33`, borderRadius: 10, padding: '10px 12px', marginBottom: 8 }}>
                <div style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>⚠️ {inc.desc}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{new Date(inc.creada_at).toLocaleTimeString('es-ES', {hour:'2-digit',minute:'2-digit'})}</div>
              </div>
            ))}
            {incidencias.length === 0 && !showIncid && (
              <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', padding: '12px 0' }}>Sin incidencias</div>
            )}
            {showIncid && (
              <div style={{ background: 'white', borderRadius: 12, padding: '14px', border: `1px solid ${C.border}` }}>
                <textarea value={incDesc} onChange={e => setIncDesc(e.target.value)}
                  placeholder="Describe la incidencia..."
                  rows={3}
                  style={{ width: '100%', border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px', fontSize: 14, resize: 'none', fontFamily: 'inherit', outline: 'none' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button onClick={() => setShowIncid(false)} style={{ flex: 1, padding: '9px', borderRadius: 8, border: `1px solid ${C.border}`, background: 'white', color: C.muted, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
                  <button onClick={añadirIncidencia} style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: C.warn, color: 'white', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Guardar incidencia</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Completar */}
        {enCurso && (
          <button onClick={completar} disabled={saving || !todosCriticos}
            style={{
              width: '100%', padding: '18px', borderRadius: 14, border: 'none',
              background: todosCriticos ? C.ok : C.border,
              color: 'white', fontSize: 16, fontWeight: 800, cursor: todosCriticos ? 'pointer' : 'not-allowed',
              boxShadow: todosCriticos ? '0 4px 12px rgba(22,163,74,0.3)' : 'none',
              fontFamily: 'inherit', marginTop: 8
            }}>
            {saving ? 'Finalizando...' : todosCriticos ? '✅ Marcar como terminado' : `Faltan tareas críticas (${criticos.filter(i=>!i.hecho).length})`}
          </button>
        )}

        {hecho && (
          <div style={{ background: C.okBg, border: `1px solid ${C.ok}33`, borderRadius: 14, padding: '16px', textAlign: 'center' }}>
            <div style={{ fontSize: 32, marginBottom: 6 }}>✅</div>
            <div style={{ fontWeight: 800, color: C.ok, fontSize: 16 }}>Limpieza completada</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>El propietario ha sido notificado</div>
          </div>
        )}
      </div>

      {/* Chat grupal del equipo */}
      {showChatGlobal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', flexDirection: 'column', fontFamily: "'DM Sans',sans-serif" }}>
          <div style={{ background: '#4f46e5', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <button onClick={() => setShowChatGlobal(false)}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 34, height: 34, borderRadius: 9, fontSize: 16, cursor: 'pointer' }}>←</button>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 16 }}>💬 Chat del equipo</div>
          </div>
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatSesion sesionId={null} apiBase="/api/l/chat" miNombre={limpiadora?.nombre || 'Yo'} miTipo="limpiadora" />
          </div>
        </div>
      )}

      {/* Modal foto referencia */}
      {fotoRef && (
        <div onClick={() => setFotoRef(null)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}>Toca para cerrar</div>
          <img src={fotoRef} alt="Referencia" style={{ maxWidth: '100%', maxHeight: '80vh', borderRadius: 12 }} />
        </div>
      )}

    </div>
  )
}

// ── PÁGINA PRINCIPAL ──────────────────────────────────────────────────────────
export default function LimpiadoarasApp() {
  const [sesiones, setSesiones]   = useState<any[]>([])
  const [sesionActiva, setSesActiva] = useState<any>(null)
  const [loading, setLoading]     = useState(true)
  const [fecha, setFecha]         = useState(new Date().toISOString().split('T')[0])
  const [limpiadora, setLimpiadora] = useState<any>(null)

  useEffect(() => {
    cargarDia(fecha)
  }, [fecha])

  async function cargarDia(d: string) {
    setLoading(true)
    try {
      const r = await fetch(`/api/l/sesiones?date=${d}`)
      if (r.status === 401) { window.location.href = '/l/login'; return }
      const data = await r.json()
      setSesiones(data.sesiones || [])
    } catch {}
    setLoading(false)
  }

  function onUpdate(sesionActualizada: any) {
    setSesiones(prev => prev.map(s => s.id === sesionActualizada.id ? sesionActualizada : s))
    setSesActiva(sesionActualizada)
  }

  if (sesionActiva) {
    return <SesionDetalle s={sesionActiva} onBack={() => setSesActiva(null)} onUpdate={onUpdate} />
  }

  const completadas = sesiones.filter(s => !!s.completed_at).length
  const enCurso     = sesiones.filter(s => !s.completed_at && !!s.started_at).length
  const hoy = new Date(fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday:'long', day:'numeric', month:'long' })

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      {/* Header */}
      <div style={{ background: C.primary }}>
        <div style={{ padding: '18px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ color: 'white', fontWeight: 800, fontSize: 18, letterSpacing: '-0.02em' }}>Mis limpiezas</div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, marginTop: 2, textTransform: 'capitalize' }}>{hoy}</div>
          </div>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🧹</div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1, background: 'rgba(255,255,255,0.1)', margin: '0 0 0' }}>
          {[
            { l: 'Total',      v: sesiones.length, c: 'white' },
            { l: 'En curso',   v: enCurso,         c: 'rgba(255,255,255,0.9)' },
            { l: 'Hechas',     v: completadas,     c: '#86efac' },
          ].map(k => (
            <div key={k.l} style={{ padding: '12px', textAlign: 'center', background: 'rgba(0,0,0,0.12)' }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.c, lineHeight: 1 }}>{k.v}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 2 }}>{k.l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Selector de fecha */}
      <div style={{ display: 'flex', gap: 6, padding: '14px 16px 10px', overflowX: 'auto' }}>
        {[-1, 0, 1, 2, 3].map(offset => {
          const d = new Date()
          d.setDate(d.getDate() + offset)
          const iso  = d.toISOString().split('T')[0]
          const sel  = iso === fecha
          const lbl  = offset === 0 ? 'Hoy' : offset === 1 ? 'Mañana' : offset === -1 ? 'Ayer' :
            d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })
          return (
            <button key={iso} onClick={() => setFecha(iso)}
              style={{
                flexShrink: 0, padding: '7px 16px', borderRadius: 20, border: 'none',
                background: sel ? C.primary : 'white', color: sel ? 'white' : C.muted,
                fontSize: 13, fontWeight: sel ? 700 : 500, cursor: 'pointer',
                boxShadow: sel ? '0 2px 8px rgba(79,70,229,0.3)' : '0 1px 3px rgba(0,0,0,0.06)',
                fontFamily: 'inherit'
              }}>
              {lbl}
            </button>
          )
        })}
      </div>

      {/* Lista sesiones */}
      <div style={{ padding: '4px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: C.muted }}>Cargando...</div>
        )}
        {!loading && sesiones.length === 0 && (
          <div style={{ textAlign: 'center', padding: '50px 16px', color: C.muted }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>☀️</div>
            <div style={{ fontWeight: 700, color: C.text }}>Sin limpiezas este día</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>¡Descansa!</div>
          </div>
        )}
        {sesiones.map(s => (
          <SesionCard key={s.id} s={s} onTap={() => setSesActiva(s)} />
        ))}
      </div>
    </div>
  )
}
