'use client'
import { useState } from 'react'

const ESTADO_CFG = {
  completada: { label: '✅ Listo',      bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
  en_curso:   { label: '🧹 Limpiando', bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  pendiente:  { label: '⏳ Pendiente', bg: '#fafafa', color: '#64748b', border: '#e2e8f0' },
}

export default function PropietarioClient({ cliente, propiedades, historial }: any) {
  const [tab, setTab]         = useState<'hoy'|'historial'>('hoy')
  const [fotoModal, setFoto]  = useState<string|null>(null)

  const completadas = propiedades.filter((p: any) => p.estado_hoy === 'completada').length
  const total       = propiedades.length

  return (
    <div style={{
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      background: "#f1f5f9", minHeight: "100vh", maxWidth: 480,
      margin: "0 auto"
    }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <div style={{ background: "#4f46e5", padding: "20px 20px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 9, background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🧹</div>
          <div>
            <div style={{ color: "white", fontWeight: 800, fontSize: 16 }}>{cliente.empresa_nombre}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 11 }}>Hola, {cliente.nombre.split(' ')[0]} 👋</div>
          </div>
        </div>

        {/* KPI */}
        <div style={{
          background: "rgba(255,255,255,0.12)", borderRadius: 12,
          padding: "14px 18px", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "space-between"
        }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>Hoy</div>
            <div style={{ color: "white", fontSize: 22, fontWeight: 800, marginTop: 2 }}>
              {completadas}/{total} <span style={{ fontSize: 13, fontWeight: 400, opacity: 0.7 }}>pisos listos</span>
            </div>
          </div>
          <div style={{ fontSize: 36 }}>
            {completadas === total ? "✅" : completadas > 0 ? "🧹" : "⏳"}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex" }}>
          {[["hoy","Hoy"],["historial","Historial"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id as any)}
              style={{
                flex: 1, padding: "10px", border: "none", cursor: "pointer",
                background: "transparent",
                color: tab === id ? "white" : "rgba(255,255,255,0.5)",
                fontWeight: tab === id ? 700 : 500, fontSize: 14,
                borderBottom: `2px solid ${tab === id ? "white" : "transparent"}`,
                transition: "all 0.15s"
              }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div style={{ padding: "16px" }}>

        {tab === "hoy" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {propiedades.map((p: any) => {
              const e = ESTADO_CFG[p.estado_hoy as keyof typeof ESTADO_CFG] || ESTADO_CFG.pendiente
              return (
                <div key={p.id} style={{
                  background: "white", borderRadius: 14,
                  border: "1px solid #e2e8f0",
                  overflow: "hidden",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.05)"
                }}>
                  {/* Estado banner */}
                  <div style={{ background: e.bg, borderBottom: `1px solid ${e.border}`, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: e.color }}>{e.label}</span>
                    {p.hora_completada && (
                      <span style={{ fontSize: 12, color: e.color, fontWeight: 600 }}>Terminado a las {p.hora_completada}</span>
                    )}
                  </div>

                  <div style={{ padding: "14px 16px" }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "#1e293b", marginBottom: 4 }}>{p.nombre}</div>
                    {p.direccion && <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>📍 {p.direccion}</div>}

                    {/* Ventana horaria */}
                    {p.hora_checkout && p.hora_checkin_siguiente && (
                      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          🚪 Checkout {String(p.hora_checkout).slice(0,5)}
                        </span>
                        <span style={{ color: "#cbd5e1" }}>→</span>
                        <span style={{ fontSize: 11, color: "#64748b" }}>
                          🔑 Checkin {String(p.hora_checkin_siguiente).slice(0,5)}
                        </span>
                      </div>
                    )}

                    {p.limpiadora_nombre && (
                      <div style={{ fontSize: 12, color: "#64748b", marginBottom: p.foto_url ? 10 : 0 }}>
                        🧹 {p.limpiadora_nombre}
                      </div>
                    )}

                    {/* Foto */}
                    {p.foto_url && (
                      <button onClick={() => setFoto(p.foto_url)}
                        style={{
                          width: "100%", height: 140, borderRadius: 8,
                          background: `url(${p.foto_url}) center/cover`,
                          border: "1px solid #e2e8f0", cursor: "pointer",
                          display: "block", overflow: "hidden"
                        }}
                      />
                    )}

                    {!p.foto_url && p.ultima_foto && p.estado_hoy !== 'completada' && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>Última limpieza:</div>
                        <button onClick={() => setFoto(p.ultima_foto)}
                          style={{
                            width: "100%", height: 100, borderRadius: 8,
                            background: `url(${p.ultima_foto}) center/cover`,
                            border: "1px solid #e2e8f0", cursor: "pointer",
                            display: "block", opacity: 0.7
                          }} />
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {tab === "historial" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {historial.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#94a3b8" }}>
                Sin historial todavía
              </div>
            )}
            {historial.map((h: any, i: number) => (
              <div key={i} style={{
                background: "white", borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: "12px 16px",
                display: "flex", gap: 12, alignItems: "center"
              }}>
                {h.foto_despues_url ? (
                  <button onClick={() => setFoto(h.foto_despues_url)}
                    style={{
                      width: 52, height: 52, borderRadius: 8, flexShrink: 0,
                      background: `url(${h.foto_despues_url}) center/cover`,
                      border: "1px solid #e2e8f0", cursor: "pointer"
                    }} />
                ) : (
                  <div style={{ width: 52, height: 52, borderRadius: 8, background: "#f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>✅</div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#1e293b" }}>{h.property_name}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {new Date(h.session_date).toLocaleDateString('es-ES', { weekday:'short', day:'numeric', month:'short' })}
                    {h.hora_fin ? ` · ${h.hora_fin}` : ''}
                  </div>
                  {h.limpiadora && <div style={{ fontSize: 11, color: "#6366f1", marginTop: 2 }}>🧹 {h.limpiadora}</div>}
                </div>
                <span style={{ fontSize: 18 }}>✅</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal foto */}
      {fotoModal && (
        <div onClick={() => setFoto(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 16 }}>
          <img src={fotoModal} style={{ maxWidth: "100%", maxHeight: "90vh", borderRadius: 12 }} />
        </div>
      )}

      <div style={{ textAlign: "center", padding: "20px 16px 32px", fontSize: 11, color: "#94a3b8" }}>
        {cliente.empresa_nombre} · Powered by ialimp
      </div>
    </div>
  )
}
