'use client'
import { useState, useEffect } from 'react'

const C = {
  primary: '#1e1b4b', accent: '#4f46e5', light: '#eef2ff',
  bg: '#0f0e1a', card: '#1a1830', border: '#2d2b52',
  text: '#f1f5f9', muted: '#94a3b8',
  ok: '#22c55e', okBg: '#052e16', warn: '#f59e0b', red: '#ef4444',
}

function StatCard({ label, value, sub, color }: any) {
  return (
    <div style={{ background: C.card, borderRadius: 12, padding: '16px 20px', border: `1px solid ${C.border}` }}>
      <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: color || C.accent, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{sub}</div>}
    </div>
  )
}

export default function SuperadminPage() {
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [loggedIn, setLoggedIn] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: 'alberto.suarez.gutierrez@gmail.com', password: '' })
  const [loginErr, setLoginErr]   = useState('')

  useEffect(() => {
    // Try to load — if 403, show login
    fetch('/api/superadmin/empresas')
      .then(r => { if (r.ok) { setLoggedIn(true); return r.json() } throw r })
      .then(d => { setEmpresas(d.empresas || []); setLoading(false) })
      .catch(() => { setLoggedIn(false); setLoading(false) })
  }, [])

  async function doLogin(e: React.FormEvent) {
    e.preventDefault(); setLoginErr('')
    const r = await fetch('/api/superadmin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(loginForm),
    })
    const d = await r.json()
    if (d.ok) {
      setLoggedIn(true); setLoading(true)
      const r2 = await fetch('/api/superadmin/empresas')
      const d2 = await r2.json()
      setEmpresas(d2.empresas || [])
      setLoading(false)
    } else {
      setLoginErr(d.error || 'Error')
    }
  }

  // ── LOGIN ────────────────────────────────────────────────────────
  if (!loggedIn) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: C.card, borderRadius: 20, padding: '40px 36px', width: '100%', maxWidth: 380, border: `1px solid ${C.border}` }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: C.accent, letterSpacing: '-0.03em' }}>IALIMP</div>
          <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Panel superadmin</div>
        </div>
        <form onSubmit={doLogin}>
          {loginErr && (
            <div style={{ background: '#2d0a0a', border: '1px solid #ef444440', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red }}>{loginErr}</div>
          )}
          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>EMAIL</label>
            <input value={loginForm.email} onChange={e => setLoginForm(f => ({ ...f, email: e.target.value }))}
              type="email" required
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#25234a', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6 }}>CONTRASEÑA</label>
            <input value={loginForm.password} onChange={e => setLoginForm(f => ({ ...f, password: e.target.value }))}
              type="password" required placeholder="••••••••"
              style={{ width: '100%', padding: '11px 14px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#25234a', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
          </div>
          <button type="submit"
            style={{ width: '100%', padding: '13px', background: C.accent, border: 'none', borderRadius: 10, fontSize: 15, color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 800 }}>
            Entrar →
          </button>
        </form>
        <div style={{ marginTop: 16, fontSize: 11, color: C.muted, textAlign: 'center' }}>
          Primera vez: pon cualquier contraseña — quedará guardada como la tuya
        </div>
      </div>
    </div>
  )

  // ── STATS ───────────────────────────────────────────────────────
  const totalEmpresas        = empresas.length
  const totalActivas         = empresas.filter(e => e.activa).length
  const totalLimpiadoras     = empresas.reduce((a, e) => a + Number(e.limpiadoras_activas || 0), 0)
  const totalSesiones        = empresas.reduce((a, e) => a + Number(e.sesiones_mes || 0), 0)
  const mrr                  = empresas.reduce((a, e) => a + 49 + Number(e.limpiadoras_activas || 0) * 12, 0)

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif", color: C.text }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700;800;900&display=swap" rel="stylesheet" />

      {/* Header */}
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 900, color: C.accent, letterSpacing: '-0.02em' }}>IALIMP <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>/ Superadmin</span></div>
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>Alberto Suarez · {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
      </header>

      <div style={{ padding: '28px', maxWidth: 1000, margin: '0 auto' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12, marginBottom: 28 }}>
          <StatCard label="Empresas" value={totalActivas} sub={`${totalEmpresas} total`} />
          <StatCard label="Limpiadoras activas" value={totalLimpiadoras} color={C.ok} />
          <StatCard label="Sesiones este mes" value={totalSesiones} />
          <StatCard label="MRR estimado" value={`${mrr}€`} sub="49€ base + 12€/limp." color="#f59e0b" />
          <StatCard label="ARR estimado" value={`${mrr * 12}€`} color="#f59e0b" />
        </div>

        {/* Tabla empresas */}
        <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontWeight: 800, fontSize: 15 }}>Empresas registradas</div>
            <div style={{ fontSize: 12, color: C.muted }}>{loading ? 'Cargando...' : `${totalEmpresas} empresa${totalEmpresas !== 1 ? 's' : ''}`}</div>
          </div>

          {loading
            ? <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Cargando...</div>
            : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Empresa', 'Email', 'Limpiadoras', 'Clientes', 'Propiedades', 'Sesiones/mes', 'Cuota est.', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {empresas.map((e: any) => {
                    const cuota = 49 + Number(e.limpiadoras_activas || 0) * 12
                    return (
                      <tr key={e.id} style={{ borderBottom: `1px solid ${C.border}20` }}>
                        <td style={{ padding: '12px 16px', fontWeight: 700, color: C.text, whiteSpace: 'nowrap' }}>{e.nombre}</td>
                        <td style={{ padding: '12px 16px', color: C.muted, fontSize: 12 }}>{e.email}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span style={{ fontWeight: 800, color: C.ok }}>{e.limpiadoras_activas || 0}</span>
                        </td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: C.text }}>{e.total_clientes || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: C.text }}>{e.total_propiedades || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'center', color: C.text }}>{e.sesiones_mes || 0}</td>
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <span style={{ fontWeight: 800, color: '#f59e0b' }}>{cuota}€/mes</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 10px',
                            background: e.activa ? C.okBg : '#2d0a0a',
                            color: e.activa ? C.ok : C.red
                          }}>
                            {e.activa ? '● Activa' : '● Inactiva'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer tabla */}
          {!loading && empresas.length > 0 && (
            <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'flex-end', gap: 24, fontSize: 13 }}>
              <span style={{ color: C.muted }}>Total limpiadoras: <strong style={{ color: C.text }}>{totalLimpiadoras}</strong></span>
              <span style={{ color: C.muted }}>MRR: <strong style={{ color: '#f59e0b' }}>{mrr}€</strong></span>
              <span style={{ color: C.muted }}>ARR: <strong style={{ color: '#f59e0b' }}>{mrr * 12}€</strong></span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
