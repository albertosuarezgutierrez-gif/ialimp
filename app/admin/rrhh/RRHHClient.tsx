'use client'
import { useState } from 'react'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb',
  red: '#dc2626', redBg: '#fef2f2',
}

const ESTADO_QUEJA = {
  pendiente:   { label: '🔴 Pendiente',    color: C.red,  bg: C.redBg  },
  contactado:  { label: '📞 Contactado',   color: C.warn, bg: C.warnBg },
  en_proceso:  { label: '🔧 En proceso',   color: C.brand,bg: C.light  },
  resuelto:    { label: '✅ Resuelto',     color: C.ok,   bg: C.okBg   },
  sin_accion:  { label: '⊘ Sin acción',   color: C.muted,bg: C.bg     },
}

function Stars({ n }: { n: number }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= n ? '#f59e0b' : '#e2e8f0', fontSize: 14 }}>★</span>
      ))}
    </span>
  )
}

interface Props { limpiadoras: any[]; quejas: any[] }

export default function RRHHClient({ limpiadoras, quejas }: Props) {
  const [tab, setTab]         = useState<'quejas'|'equipo'|'ia'>('quejas')
  const [limpSel, setLimpSel] = useState<any>(null)
  const [analisis, setAnalisis] = useState<any>(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [quejasList, setQuejas] = useState(quejas)

  const pendientes = quejasList.filter(q => q.estado === 'pendiente').length

  async function analizarIA(limp: any) {
    setLimpSel(limp)
    setLoadingIA(true)
    setAnalisis(null)
    setTab('ia')
    try {
      const r = await fetch('/api/admin/rrhh/analisis', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limpiadora_id: limp.limpiadora_id })
      })
      const d = await r.json()
      if (d.ok) setAnalisis(d.analisis)
    } catch {}
    setLoadingIA(false)
  }

  async function cambiarEstado(id: string, estado: string) {
    await fetch('/api/admin/quejas/' + id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado })
    })
    setQuejas(qs => qs.map(q => q.id === id ? { ...q, estado } : q))
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <header style={{ background: C.primary, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
        <div>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20, letterSpacing: '-0.02em' }}>RRHH y Calidad</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>
            {limpiadoras.length} limpiadoras · {pendientes} quejas pendientes
          </p>
        </div>
      </header>

      {/* Tabs */}
      <div style={{ background: 'white', borderBottom: `1px solid ${C.border}`, display: 'flex', padding: '0 24px' }}>
        {[
          { id: 'quejas', label: `Quejas ${pendientes > 0 ? `(${pendientes})` : ''}` },
          { id: 'equipo', label: 'Equipo' },
          { id: 'ia',     label: '🤖 Análisis IA' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as any)}
            style={{
              padding: '13px 18px', border: 'none', cursor: 'pointer', background: 'transparent',
              color: tab === t.id ? C.primary : C.muted, fontWeight: tab === t.id ? 700 : 500,
              borderBottom: `2.5px solid ${tab === t.id ? C.primary : 'transparent'}`,
              fontSize: 13, fontFamily: 'inherit', transition: 'all 0.15s'
            }}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '20px 24px', maxWidth: 900, margin: '0 auto' }}>

        {/* ── QUEJAS ─────────────────────────────────────────────────────── */}
        {tab === 'quejas' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {quejasList.length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🎉</div>
                <div style={{ fontWeight: 700 }}>Sin quejas</div>
              </div>
            )}
            {quejasList.map((q: any) => {
              const est = ESTADO_QUEJA[q.estado as keyof typeof ESTADO_QUEJA] || ESTADO_QUEJA.pendiente
              return (
                <div key={q.id} style={{
                  background: 'white', borderRadius: 14, border: `1px solid ${C.border}`,
                  borderLeft: `4px solid ${est.color}`,
                  padding: '16px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
                }}>
                  <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{q.propiedad_nombre || 'Propiedad'}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: est.bg, color: est.color }}>
                          {est.label}
                        </span>
                        {q.rating && <Stars n={q.rating} />}
                      </div>
                      <p style={{ fontSize: 13, color: C.text, marginBottom: 8, lineHeight: 1.5 }}>{q.descripcion}</p>
                      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        {q.limpiadora_nombre && (
                          <span style={{ fontSize: 12, color: C.muted }}>🧹 {q.limpiadora_nombre}</span>
                        )}
                        {q.guest_phone && (
                          <a href={`tel:${q.guest_phone}`}
                            style={{ fontSize: 12, color: C.primary, fontWeight: 600, textDecoration: 'none' }}>
                            📞 {q.guest_phone}
                          </a>
                        )}
                        {q.guest_phone && (
                          <a href={`https://wa.me/${q.guest_phone.replace('+','').replace(/ /g,'')}`}
                            target="_blank"
                            style={{ fontSize: 12, color: '#25d366', fontWeight: 600, textDecoration: 'none' }}>
                            💬 WhatsApp
                          </a>
                        )}
                        <span style={{ fontSize: 11, color: C.muted }}>
                          {new Date(q.creada_at).toLocaleDateString('es-ES', { day:'numeric', month:'short' })}
                        </span>
                      </div>
                      {q.fotos?.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                          {q.fotos.map((f: string, i: number) => (
                            <a key={i} href={f} target="_blank">
                              <div style={{ width: 56, height: 56, borderRadius: 8, backgroundImage: `url(${f})`, backgroundSize: 'cover', border: `1px solid ${C.border}` }} />
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Acciones */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
                      {q.estado === 'pendiente' && (
                        <>
                          <button onClick={() => cambiarEstado(q.id, 'contactado')}
                            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.warn}`, background: C.warnBg, color: C.warn, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            📞 Contactado
                          </button>
                          <button onClick={() => cambiarEstado(q.id, 'resuelto')}
                            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.ok}`, background: C.okBg, color: C.ok, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            ✅ Resuelto
                          </button>
                        </>
                      )}
                      {q.estado === 'contactado' && (
                        <button onClick={() => cambiarEstado(q.id, 'resuelto')}
                          style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${C.ok}`, background: C.okBg, color: C.ok, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                          ✅ Resuelto
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── EQUIPO ─────────────────────────────────────────────────────── */}
        {tab === 'equipo' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {limpiadoras.map((l: any) => (
              <div key={l.limpiadora_id} style={{
                background: 'white', borderRadius: 14, border: `1px solid ${C.border}`,
                padding: '20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', background: C.light,
                    border: `2px solid ${C.brand}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22
                  }}>👩</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>{l.limpiadora_nombre}</div>
                    {l.rating_medio && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                        <Stars n={Math.round(l.rating_medio)} />
                        <span style={{ fontSize: 11, color: C.muted }}>{l.rating_medio}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                  {[
                    { l: 'Sesiones mes',   v: l.sesiones_mes || 0,          c: C.brand },
                    { l: 'Completadas',    v: l.sesiones_completadas || 0,   c: C.ok    },
                    { l: 'Quejas mes',     v: l.quejas_mes || 0,             c: l.quejas_mes > 2 ? C.red : C.muted },
                    { l: 'Pendientes',     v: l.quejas_pendientes || 0,      c: l.quejas_pendientes > 0 ? C.red : C.ok },
                  ].map(stat => (
                    <div key={stat.l} style={{ background: C.bg, borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: C.muted }}>{stat.l}</div>
                      <div style={{ fontSize: 18, fontWeight: 800, color: stat.c }}>{stat.v}</div>
                    </div>
                  ))}
                </div>

                <button onClick={() => analizarIA(l)}
                  style={{
                    width: '100%', padding: '9px', borderRadius: 10,
                    background: C.primary, border: 'none', color: 'white',
                    fontSize: 13, fontWeight: 700, cursor: 'pointer'
                  }}>
                  🤖 Analizar con IA
                </button>
              </div>
            ))}
          </div>
        )}

        {/* ── ANÁLISIS IA ────────────────────────────────────────────────── */}
        {tab === 'ia' && (
          <div>
            {!limpSel && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: C.muted }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>🤖</div>
                <div style={{ fontWeight: 700 }}>Selecciona una limpiadora en Equipo para analizar</div>
              </div>
            )}

            {limpSel && loadingIA && (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤖</div>
                <div style={{ fontWeight: 700, color: C.text, marginBottom: 6 }}>
                  Analizando a {limpSel.limpiadora_nombre}...
                </div>
                <div style={{ fontSize: 13, color: C.muted }}>Revisando historial, quejas y rendimiento</div>
              </div>
            )}

            {analisis && !loadingIA && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: C.light, border: `2px solid ${C.brand}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>👩</div>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 17, color: C.text }}>{limpSel.limpiadora_nombre}</div>
                    <div style={{ fontSize: 12, color: C.muted }}>Análisis IA — {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</div>
                  </div>
                  <div style={{
                    marginLeft: 'auto', padding: '6px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12,
                    background: analisis.recomendacion_tipo === 'positiva' ? C.okBg :
                                analisis.recomendacion_tipo === 'urgente'  ? C.redBg : C.warnBg,
                    color: analisis.recomendacion_tipo === 'positiva' ? C.ok :
                           analisis.recomendacion_tipo === 'urgente'  ? C.red : C.warn,
                  }}>
                    {analisis.recomendacion_tipo === 'positiva' ? '✅ Buen rendimiento' :
                     analisis.recomendacion_tipo === 'urgente'  ? '🔴 Requiere atención urgente' : '⚠️ Revisar'}
                  </div>
                </div>

                {/* Resumen */}
                <div style={{ background: 'white', borderRadius: 14, border: `1px solid ${C.border}`, padding: '18px 20px', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Resumen</div>
                  <p style={{ fontSize: 14, color: C.text, lineHeight: 1.6 }}>{analisis.resumen}</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  {/* Puntos fuertes */}
                  <div style={{ background: C.okBg, borderRadius: 14, border: `1px solid ${C.ok}22`, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.ok, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>✅ Puntos fuertes</div>
                    {analisis.puntos_fuertes?.map((p: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 6, display: 'flex', gap: 6 }}>
                        <span style={{ color: C.ok }}>›</span>{p}
                      </div>
                    ))}
                  </div>
                  {/* Áreas de mejora */}
                  <div style={{ background: C.warnBg, borderRadius: 14, border: `1px solid ${C.warn}22`, padding: '16px 18px' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.warn, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>⚠️ Áreas de mejora</div>
                    {analisis.areas_mejora?.map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 6, display: 'flex', gap: 6 }}>
                        <span style={{ color: C.warn }}>›</span>{a}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Alertas */}
                {analisis.alertas?.length > 0 && (
                  <div style={{ background: C.redBg, borderRadius: 14, border: `1px solid ${C.red}22`, padding: '16px 18px', marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.red, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>🔴 Alertas</div>
                    {analisis.alertas.map((a: string, i: number) => (
                      <div key={i} style={{ fontSize: 13, color: C.text, marginBottom: 4 }}>⚠️ {a}</div>
                    ))}
                  </div>
                )}

                {/* Acción recomendada */}
                <div style={{ background: C.light, borderRadius: 14, border: `1px solid ${C.brand}33`, padding: '16px 18px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.primary, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>🤖 Acción recomendada</div>
                  <p style={{ fontSize: 14, color: C.text, fontWeight: 600 }}>{analisis.sugerencia_accion}</p>
                  {analisis.documento_sugerido && analisis.documento_sugerido !== 'ninguno' && (
                    <button style={{
                      marginTop: 12, padding: '9px 18px', borderRadius: 10,
                      background: C.primary, border: 'none', color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer'
                    }}>
                      📄 Generar {analisis.documento_sugerido}
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
