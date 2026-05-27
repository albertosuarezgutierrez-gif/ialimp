'use client'
import { useState } from 'react'

// ── Paleta corporativa ialimp ─────────────────────────────────────────────────
const C = {
  primary:   '#4f46e5',
  brand:     '#6366f1',
  light:     '#eef2ff',
  bg:        '#f1f5f9',
  text:      '#1e293b',
  muted:     '#64748b',
  border:    '#e2e8f0',
  ok:        '#16a34a',
  okBg:      '#f0fdf4',
  okBorder:  '#bbf7d0',
  warn:      '#d97706',
  warnBg:    '#fffbeb',
  warnBorder:'#fcd34d',
  info:      '#2563eb',
  infoBg:    '#eff6ff',
  infoBorder:'#bfdbfe',
}

const ESTADO_CFG = {
  completada: { label: '✅ Listo',      bg: C.okBg,   color: C.ok,   border: C.okBorder,   dot: '#22c55e' },
  en_curso:   { label: '🧹 Limpiando', bg: C.infoBg, color: C.info, border: C.infoBorder,  dot: '#3b82f6' },
  pendiente:  { label: '⏳ Pendiente', bg: C.bg,     color: C.muted,border: C.border,       dot: '#94a3b8' },
}

export default function PropietarioClient({ cliente, propiedades, historial }: any) {
  const [tab, setTab]       = useState<'hoy'|'historial'>('hoy')
  const [fotoModal, setFoto]= useState<string|null>(null)

  const completadas = propiedades.filter((p: any) => p.estado_hoy === 'completada').length
  const total       = propiedades.length
  const todas       = completadas === total

  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: C.bg, minHeight: "100vh",
      maxWidth: 480, margin: "0 auto"
    }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
      `}</style>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div style={{ background: C.primary }}>
        {/* Logo + saludo */}
        <div style={{ padding: "20px 20px 0", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 9,
            background: C.light,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20
          }}>🧹</div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16, letterSpacing: "-0.01em" }}>
              {cliente.empresa_nombre}
            </div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 11 }}>
              Hola, {cliente.nombre.split(' ')[0]} 👋
            </div>
          </div>
        </div>

        {/* KPI del día */}
        <div style={{ margin: "16px 20px 0", background: "rgba(255,255,255,0.13)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.65)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Hoy</div>
            <div style={{ color: "white", fontSize: 24, fontWeight: 800, marginTop: 2, letterSpacing: "-0.02em" }}>
              {completadas}/{total}
              <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.65, marginLeft: 6 }}>pisos listos</span>
            </div>
          </div>
          <div style={{ fontSize: 40 }}>{todas ? "✅" : completadas > 0 ? "🧹" : "⏳"}</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", marginTop: 16 }}>
          {[["hoy","Hoy"],["historial","Historial"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{
                flex: 1, padding: "11px", border: "none", cursor: "pointer",
                background: "transparent",
                color: tab === id ? "white" : "rgba(255,255,255,0.5)",
                fontWeight: tab === id ? 700 : 500, fontSize: 14,
                borderBottom: `2.5px solid ${tab === id ? "white" : "transparent"}`,
                transition: "all 0.15s", fontFamily: "inherit"
              }}>{label}</button>
          ))}
        </div>
      </div>

      {/* ── Contenido ────────────────────────────────────────────────────── */}
      <div style={{ padding: 16 }}>

        {/* HOY */}
        {tab === "hoy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {propiedades.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
                No hay limpiezas programadas hoy
              </div>
            )}
            {propiedades.map((p: any) => {
              const e = ESTADO_CFG[p.estado_hoy as keyof typeof ESTADO_CFG] || ESTADO_CFG.pendiente
              return (
                <div key={p.id} style={{
                  background: "white", borderRadius: 14,
                  border: `1px solid ${C.border}`,
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                }}>
                  {/* Banner estado */}
                  <div style={{
                    background: e.bg, borderBottom: `1px solid ${e.border}`,
                    padding: "9px 16px",
                    display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                      <div style={{ width: 7, height: 7, borderRadius: "50%", background: e.dot }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: e.color }}>{e.label}</span>
                    </div>
                    {p.hora_completada && (
                      <span style={{ fontSize: 12, color: e.color, fontWeight: 600 }}>
                        Listo a las {p.hora_completada}
                      </span>
                    )}
                  </div>

                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: C.text, marginBottom: 3 }}>
                      {p.nombre}
                    </div>
                    {p.direccion && (
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>📍 {p.direccion}</div>
                    )}

                    {/* Ventana horaria */}
                    {p.hora_checkout && p.hora_checkin_siguiente && (
                      <div style={{
                        display: "flex", gap: 8, alignItems: "center",
                        background: C.light, borderRadius: 8, padding: "6px 10px", marginBottom: 10
                      }}>
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>
                          🚪 {String(p.hora_checkout).slice(0,5)}
                        </span>
                        <span style={{ color: C.brand, fontSize: 14 }}>→</span>
                        <span style={{ fontSize: 11, color: C.primary, fontWeight: 600 }}>
                          🔑 {String(p.hora_checkin_siguiente).slice(0,5)}
                        </span>
                      </div>
                    )}

                    {p.limpiadora_nombre && (
                      <div style={{ fontSize: 12, color: C.muted, marginBottom: p.foto_url ? 10 : 0 }}>
                        🧹 {p.limpiadora_nombre}
                      </div>
                    )}

                    {/* Foto si hay */}
                    {p.foto_url && (
                      <button onClick={() => setFoto(p.foto_url)}
                        style={{
                          width: "100%", height: 160, borderRadius: 10, marginTop: 8,
                          backgroundImage: `url(${p.foto_url})`,
                          backgroundSize: "cover", backgroundPosition: "center",
                          border: `1px solid ${C.border}`, cursor: "pointer", display: "block"
                        }} />
                    )}

                    {/* Foto última si no hay de hoy */}
                    {!p.foto_url && p.ultima_foto && p.estado_hoy !== 'completada' && (
                      <div style={{ marginTop: 10 }}>
                        <div style={{ fontSize: 11, color: C.muted, marginBottom: 6 }}>Última limpieza:</div>
                        <button onClick={() => setFoto(p.ultima_foto)}
                          style={{
                            width: "100%", height: 110, borderRadius: 8,
                            backgroundImage: `url(${p.ultima_foto})`,
                            backgroundSize: "cover", backgroundPosition: "center",
                            border: `1px solid ${C.border}`, cursor: "pointer",
                            display: "block", opacity: 0.65
                          }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* HISTORIAL */}
        {tab === "historial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {historial.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: C.muted }}>
                Sin historial todavía
              </div>
            )}
            {historial.map((h: any, i: number) => (
              <div key={i} style={{
                background: "white", borderRadius: 12,
                border: `1px solid ${C.border}`,
                padding: "12px 16px",
                display: "flex", gap: 12, alignItems: "center",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
              }}>
                {h.foto_despues_url ? (
                  <button onClick={() => setFoto(h.foto_despues_url)}
                    style={{
                      width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                      backgroundImage: `url(${h.foto_despues_url})`,
                      backgroundSize: "cover", backgroundPosition: "center",
                      border: `1px solid ${C.border}`, cursor: "pointer"
                    }} />
                ) : (
                  <div style={{
                    width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                    background: C.light,
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22
                  }}>✅</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{h.property_name}</div>
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                    {new Date(h.session_date).toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })}
                    {h.hora_fin ? ` · ${h.hora_fin}` : ''}
                  </div>
                  {h.limpiadora && (
                    <div style={{ fontSize: 11, color: C.brand, marginTop: 1, fontWeight: 500 }}>
                      🧹 {h.limpiadora}
                    </div>
                  )}
                </div>
                <span style={{ color: '#22c55e', fontSize: 20 }}>✅</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal foto */}
      {fotoModal && (
        <div onClick={() => setFoto(null)}
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 100, padding: 20
          }}>
          <img src={fotoModal} style={{ maxWidth: "100%", maxHeight: "88vh", borderRadius: 14 }} />
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px 16px 36px", fontSize: 11, color: C.muted }}>
        {cliente.empresa_nombre} · <span style={{ color: C.brand, fontWeight: 600 }}>ialimp</span>
      </div>
    </div>
  )
}
