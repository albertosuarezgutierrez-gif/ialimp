'use client'
import { useState, useEffect } from 'react'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb',
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const COLORES = ['#4f46e5','#16a34a','#d97706','#dc2626','#7c3aed','#0891b2']

function getLunes(d = new Date()) {
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  const l = new Date(d)
  l.setDate(d.getDate() + diff)
  return l
}

function isoDate(d: Date) { return d.toISOString().split('T')[0] }

export default function AgendaPage() {
  const [semana, setSemana]   = useState(getLunes())
  const [sesiones, setSes]    = useState<any[]>([])
  const [limp, setLimp]       = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { cargar() }, [semana])

  async function cargar() {
    setLoading(true)
    const dias = Array.from({length: 7}, (_, i) => {
      const d = new Date(semana); d.setDate(semana.getDate() + i)
      return isoDate(d)
    })
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/agenda?desde=' + dias[0] + '&hasta=' + dias[6]),
      fetch('/api/admin/limpiadoras/usuarios')
    ])
    const d1 = await r1.json()
    const d2 = await r2.json()
    setSes(d1.sesiones || [])
    setLimp(d2.limpiadoras || [])
    setLoading(false)
  }

  const dias = Array.from({length: 7}, (_, i) => {
    const d = new Date(semana); d.setDate(semana.getDate() + i)
    return { iso: isoDate(d), label: DIAS[i], num: d.getDate(), hoy: isoDate(d) === isoDate(new Date()) }
  })

  const sesXLimpXDia = (limpId: string, diaIso: string) =>
    sesiones.filter(s => s.limpiadora_id === limpId && s.session_date === diaIso)

  const total_sem = sesiones.length
  const completadas_sem = sesiones.filter(s => s.completed_at).length

  return (
    <div style={{ minHeight:'100vh', background: C.bg, fontFamily:"'DM Sans',-apple-system,sans-serif" }}>
      <header style={{ background: C.primary, padding:'18px 24px', display:'flex', alignItems:'center', gap:16 }}>
        <a href="/dashboard" style={{ color:'rgba(255,255,255,0.7)', fontSize:13, textDecoration:'none' }}>← Dashboard</a>
        <div style={{ flex:1 }}>
          <h1 style={{ color:'white', fontWeight:800, fontSize:20 }}>Agenda semanal</h1>
          <p style={{ color:'rgba(255,255,255,0.65)', fontSize:12 }}>
            {total_sem} limpiezas · {completadas_sem} completadas
          </p>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={() => { const n=new Date(semana); n.setDate(n.getDate()-7); setSemana(n) }}
            style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:14 }}>
            ‹
          </button>
          <button onClick={() => setSemana(getLunes())}
            style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:12, fontWeight:600 }}>
            Hoy
          </button>
          <button onClick={() => { const n=new Date(semana); n.setDate(n.getDate()+7); setSemana(n) }}
            style={{ background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:8, padding:'6px 14px', cursor:'pointer', fontSize:14 }}>
            ›
          </button>
        </div>
      </header>

      <div style={{ overflowX:'auto', padding:'16px' }}>
        {loading && <div style={{ textAlign:'center', padding:40, color: C.muted }}>Cargando...</div>}

        {!loading && (
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
            <thead>
              <tr>
                <th style={{ width:120, padding:'8px 12px', textAlign:'left', fontSize:12, color: C.muted }}>Limpiadora</th>
                {dias.map(d => (
                  <th key={d.iso} style={{
                    padding:'8px 6px', textAlign:'center', fontSize:12, fontWeight: d.hoy ? 800 : 600,
                    color: d.hoy ? C.primary : C.text,
                    background: d.hoy ? C.light : 'transparent',
                    borderRadius: d.hoy ? 8 : 0
                  }}>
                    <div>{d.label}</div>
                    <div style={{ fontSize:16, fontWeight:800 }}>{d.num}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {limp.map((l: any, li: number) => (
                <tr key={l.id} style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:'8px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: COLORES[li % COLORES.length] }} />
                      <span style={{ fontSize:13, fontWeight:600, color: C.text }}>{l.nombre}</span>
                    </div>
                  </td>
                  {dias.map(d => {
                    const ses = sesXLimpXDia(l.id, d.iso)
                    return (
                      <td key={d.iso} style={{
                        padding:'4px 3px', textAlign:'center', verticalAlign:'top',
                        background: d.hoy ? '#f5f3ff' : 'transparent'
                      }}>
                        {ses.map((s: any) => (
                          <div key={s.id} style={{
                            fontSize:10, marginBottom:3, padding:'4px 6px', borderRadius:6,
                            background: s.completed_at ? C.okBg : s.started_at ? C.light : 'white',
                            border:`1px solid ${s.completed_at ? '#bbf7d0' : s.started_at ? '#c7d2fe' : C.border}`,
                            color: C.text, lineHeight:1.3
                          }}>
                            <div style={{ fontWeight:700, fontSize:9 }}>
                              {s.property_name?.split(' ').pop()}
                            </div>
                            <div style={{ color: C.muted }}>
                              {s.hora_checkout?.slice(0,5) || '—'}
                            </div>
                            {s.completed_at && <div>✅</div>}
                            {s.started_at && !s.completed_at && <div style={{ color: C.brand }}>🔄</div>}
                          </div>
                        ))}
                        {ses.length === 0 && (
                          <div style={{ fontSize:9, color:'#d1d5db', padding:4 }}>—</div>
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
              {limp.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ textAlign:'center', padding:40, color: C.muted }}>
                    Sin limpiadoras configuradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}

        {/* Leyenda */}
        <div style={{ display:'flex', gap:16, marginTop:16, flexWrap:'wrap' }}>
          {[
            { color:'#bbf7d0', bg: C.okBg, label:'Completada' },
            { color:'#c7d2fe', bg: C.light, label:'En curso' },
            { color: C.border, bg:'white', label:'Pendiente' },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color: C.muted }}>
              <div style={{ width:12, height:12, borderRadius:3, border:`1px solid ${l.color}`, background: l.bg }} />
              {l.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
