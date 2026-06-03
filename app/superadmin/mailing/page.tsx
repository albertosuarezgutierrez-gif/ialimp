'use client'
import { useState, useEffect, useCallback } from 'react'

const C = {
  primary: '#1e1b4b', accent: '#4f46e5', light: '#eef2ff',
  bg: '#f1f5f9', card: '#ffffff', border: '#e2e8f0',
  text: '#1e1b4b', muted: '#64748b',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', red: '#dc2626',
}

const ESTADOS = ['nuevo', 'enviado', 'abierto', 'click', 'contactado', 'interesado', 'descartado', 'rebotado']
const COLOR_ESTADO: Record<string, string> = {
  nuevo: C.muted, enviado: '#0284c7', abierto: '#7c3aed', click: '#dc2626',
  contactado: '#d97706', interesado: C.ok, descartado: C.muted, rebotado: C.red,
}

function fmt(d: any) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

// Parser CSV básico (maneja comillas y comas). Devuelve filas mapeadas.
function parseCSV(text: string): any[] {
  const lines = text.replace(/\r/g, '').split('\n').filter(l => l.trim())
  if (!lines.length) return []
  const split = (line: string) => {
    const out: string[] = []; let cur = ''; let q = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else q = false } else cur += ch }
      else { if (ch === '"') q = true; else if (ch === ',' || ch === ';') { out.push(cur); cur = '' } else cur += ch }
    }
    out.push(cur); return out
  }
  const head = split(lines[0]).map(h => h.trim().toLowerCase())
  const idx = (names: string[]) => head.findIndex(h => names.includes(h))
  const iE = idx(['empresa_nombre', 'empresa', 'nombre', 'name'])
  const iM = idx(['email', 'correo', 'mail', 'e-mail'])
  const iT = idx(['telefono', 'teléfono', 'phone', 'tel', 'movil', 'móvil'])
  const iC = idx(['ciudad', 'city', 'localidad'])
  const iW = idx(['web', 'website', 'url'])
  const iN = idx(['notas', 'notes', 'observaciones'])
  return lines.slice(1).map(l => {
    const c = split(l)
    return {
      empresa_nombre: iE >= 0 ? (c[iE] || '').trim() : '',
      email: iM >= 0 ? (c[iM] || '').trim() : '',
      telefono: iT >= 0 ? (c[iT] || '').trim() : '',
      ciudad: iC >= 0 ? (c[iC] || '').trim() : '',
      web: iW >= 0 ? (c[iW] || '').trim() : '',
      notas: iN >= 0 ? (c[iN] || '').trim() : '',
    }
  }).filter(r => r.empresa_nombre && r.email)
}

export default function MailingPage() {
  const [tab, setTab] = useState<'prospectos' | 'campana' | 'metricas'>('prospectos')
  const [authErr, setAuthErr] = useState(false)
  const [prospectos, setProspectos] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  const [seguimiento, setSeguimiento] = useState<any[]>([])
  const [campanas, setCampanas] = useState<any[]>([])
  const [detalle, setDetalle] = useState<any>(null) // { campana, pasos, metricas }
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const cargarProspectos = useCallback(async () => {
    const r = await fetch(`/api/superadmin/mailing/prospectos?q=${encodeURIComponent(q)}`)
    if (r.status === 403) { setAuthErr(true); return }
    const d = await r.json()
    setProspectos(d.prospectos || []); setStats(d.stats || []); setSeguimiento(d.seguimiento || [])
  }, [q])

  const cargarCampanas = useCallback(async () => {
    const r = await fetch('/api/superadmin/mailing/campanas')
    if (r.status === 403) { setAuthErr(true); return }
    const d = await r.json()
    setCampanas(d.campanas || [])
    if (d.campanas?.[0] && !detalle) cargarDetalle(d.campanas[0].id)
  }, [detalle])

  async function cargarDetalle(id: string) {
    const r = await fetch(`/api/superadmin/mailing/campanas/${id}`)
    if (r.ok) setDetalle(await r.json())
  }

  useEffect(() => { cargarProspectos(); cargarCampanas() }, []) // eslint-disable-line

  function flash(t: string) { setMsg(t); setTimeout(() => setMsg(''), 4000) }

  // ── Import CSV ──
  async function importarCSV(file: File) {
    setBusy(true)
    try {
      const filas = parseCSV(await file.text())
      if (!filas.length) { flash('No se encontraron filas válidas (empresa + email).'); return }
      const r = await fetch('/api/superadmin/mailing/prospectos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prospectos: filas }),
      })
      const d = await r.json()
      if (r.ok) { flash(`Importados ${d.insertados} · ${d.duplicados} duplicados (de ${d.total}).`); cargarProspectos() }
      else flash(d.error || 'Error al importar')
    } finally { setBusy(false) }
  }

  async function patchProspecto(id: string, body: any) {
    await fetch(`/api/superadmin/mailing/prospectos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    })
    cargarProspectos()
  }

  // ── Campaña ──
  async function crearCampana() {
    const r = await fetch('/api/superadmin/mailing/campanas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
    })
    const d = await r.json()
    if (d.id) { await cargarCampanas(); cargarDetalle(d.id) }
  }
  async function guardarCampana(body: any) {
    if (!detalle?.campana) return
    setBusy(true)
    try {
      await fetch(`/api/superadmin/mailing/campanas/${detalle.campana.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      await cargarDetalle(detalle.campana.id); cargarCampanas(); flash('Guardado.')
    } finally { setBusy(false) }
  }
  async function generarIA(idx: number) {
    if (!detalle?.campana) return
    setBusy(true)
    try {
      const r = await fetch(`/api/superadmin/mailing/campanas/${detalle.campana.id}/generar-ia`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}),
      })
      const d = await r.json()
      if (d.cuerpo_html) {
        const pasos = [...detalle.pasos]; pasos[idx] = { ...pasos[idx], cuerpo_html: d.cuerpo_html }
        setDetalle({ ...detalle, pasos })
        flash('Cuerpo generado con IA. Revísalo y guarda.')
      } else flash(d.error || 'Error IA')
    } finally { setBusy(false) }
  }
  async function enviarAhora() {
    setBusy(true)
    try {
      const r = await fetch('/api/superadmin/mailing/cron?forzar=1')
      const d = await r.json()
      if (r.ok) { flash(`Agente ejecutado: ${d.enviados} enviados, ${d.encolados} encolados, ${d.fallidos} fallidos.`); cargarProspectos(); cargarCampanas(); if (detalle) cargarDetalle(detalle.campana.id) }
      else flash(d.error || 'Error')
    } finally { setBusy(false) }
  }

  const stat = (e: string) => Number(stats.find(s => s.estado === e)?.n || 0)

  if (authErr) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'grid', placeItems: 'center', fontFamily: "'Nunito',sans-serif", color: C.text }}>
      <div style={{ background: C.card, borderRadius: 16, padding: 40, textAlign: 'center', maxWidth: 380, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.accent }}>IALIMP</div>
        <p style={{ color: C.muted, margin: '12px 0 20px' }}>Inicia sesión como superadmin para ver el mailing.</p>
        <a href="/superadmin" style={{ background: C.accent, color: '#fff', padding: '11px 22px', borderRadius: 10, fontWeight: 800, textDecoration: 'none' }}>Ir al login →</a>
      </div>
    </div>
  )

  const btn = (active: boolean): React.CSSProperties => ({
    padding: '9px 16px', borderRadius: 10, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
    fontWeight: 800, fontSize: 13, background: active ? C.accent : C.card, color: active ? '#fff' : C.muted,
  })
  const inp: React.CSSProperties = { width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${C.border}`, background: '#f8fafc', color: C.text, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'Nunito',sans-serif", color: C.text }}>
      <header style={{ background: C.card, borderBottom: `1px solid ${C.border}`, padding: '16px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 20, fontWeight: 900, color: C.accent, letterSpacing: '-0.02em', flex: 1 }}>
          IALIMP <span style={{ color: C.muted, fontWeight: 400, fontSize: 14 }}>/ Captación (mailing en frío)</span>
        </div>
        <a href="/superadmin" style={{ fontSize: 13, color: C.muted, fontWeight: 700 }}>← Superadmin</a>
      </header>

      <div style={{ padding: 28, maxWidth: 1100, margin: '0 auto' }}>
        {msg && <div style={{ background: C.light, border: `1px solid ${C.accent}40`, color: C.accent, borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontWeight: 700, fontSize: 14 }}>{msg}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
          <button style={btn(tab === 'prospectos')} onClick={() => setTab('prospectos')}>👥 Prospectos</button>
          <button style={btn(tab === 'campana')} onClick={() => setTab('campana')}>✉️ Campaña</button>
          <button style={btn(tab === 'metricas')} onClick={() => setTab('metricas')}>📊 Métricas</button>
        </div>

        {/* ── PROSPECTOS ── */}
        {tab === 'prospectos' && (
          <>
            {seguimiento.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 12, padding: 16, marginBottom: 18 }}>
                <div style={{ fontWeight: 800, marginBottom: 8, color: C.warn }}>📞 Seguimiento para hoy ({seguimiento.length})</div>
                {seguimiento.map(s => (
                  <div key={s.id} style={{ fontSize: 13, padding: '4px 0' }}>
                    <strong>{s.empresa_nombre}</strong> · <a href={`tel:${s.telefono}`} style={{ color: C.accent }}>{s.telefono || 's/tel'}</a> · vence {fmt(s.seguimiento_proximo_at)}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
              <input placeholder="Buscar empresa / email / teléfono" value={q}
                onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && cargarProspectos()}
                style={{ ...inp, maxWidth: 320 }} />
              <button onClick={cargarProspectos} style={btn(false)}>Buscar</button>
              <label style={{ ...btn(false), display: 'inline-flex', alignItems: 'center', gap: 6, background: C.accent, color: '#fff', cursor: busy ? 'default' : 'pointer' }}>
                {busy ? 'Importando…' : '⬆ Importar CSV'}
                <input type="file" accept=".csv,text/csv" hidden disabled={busy}
                  onChange={e => { const f = e.target.files?.[0]; if (f) importarCSV(f); e.currentTarget.value = '' }} />
              </label>
              <span style={{ fontSize: 12, color: C.muted }}>
                {ESTADOS.map(e => stat(e) ? `${e}: ${stat(e)}` : null).filter(Boolean).join(' · ')}
              </span>
            </div>

            <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead><tr style={{ borderBottom: `1px solid ${C.border}` }}>
                    {['Empresa', 'Teléfono', 'Estado', '👁', '🖱', 'Notas', 'Seguim.', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', color: C.muted, fontWeight: 700, fontSize: 11, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {prospectos.map(p => {
                      const caliente = Number(p.clicks) > 0
                      return (
                        <tr key={p.id} style={{ borderBottom: `1px solid ${C.border}30`, background: caliente ? '#fff1f2' : undefined }}>
                          <td style={{ padding: '10px 14px', fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {caliente && '🔥 '}{p.empresa_nombre}
                            <div style={{ fontSize: 11, color: C.muted, fontWeight: 400 }}>{p.email}</div>
                          </td>
                          <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                            {p.telefono ? <a href={`tel:${p.telefono}`} style={{ color: C.accent, fontWeight: 700 }}>{p.telefono}</a> : <span style={{ color: C.muted }}>—</span>}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <select value={p.estado} onChange={e => patchProspecto(p.id, { estado: e.target.value })}
                              style={{ border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 6px', fontSize: 12, fontFamily: 'inherit', color: COLOR_ESTADO[p.estado] || C.text, fontWeight: 700 }}>
                              {ESTADOS.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', color: C.muted }}>{p.aperturas || 0}</td>
                          <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 800, color: caliente ? C.red : C.muted }}>{p.clicks || 0}</td>
                          <td style={{ padding: '10px 14px', minWidth: 160 }}>
                            <input defaultValue={p.notas || ''} placeholder="Notas…" onBlur={e => e.target.value !== (p.notas || '') && patchProspecto(p.id, { notas: e.target.value })}
                              style={{ ...inp, padding: '6px 8px', fontSize: 12, background: '#fff' }} />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <input type="date" defaultValue={p.seguimiento_proximo_at ? new Date(p.seguimiento_proximo_at).toISOString().slice(0, 10) : ''}
                              onChange={e => patchProspecto(p.id, { seguimiento_proximo_at: e.target.value || null })}
                              style={{ ...inp, padding: '5px 6px', fontSize: 11, width: 130, background: '#fff' }} />
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => patchProspecto(p.id, { baja: true })} title="Dar de baja"
                              style={{ border: 'none', background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: 14 }}>🚫</button>
                          </td>
                        </tr>
                      )
                    })}
                    {!prospectos.length && <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: C.muted }}>Sin prospectos. Importa un CSV para empezar.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}

        {/* ── CAMPAÑA ── */}
        {tab === 'campana' && (
          <CampanaEditor detalle={detalle} campanas={campanas} busy={busy}
            onSelect={cargarDetalle} onCrear={crearCampana} onGuardar={guardarCampana}
            onGenerarIA={generarIA} onEnviar={enviarAhora} setDetalle={setDetalle} inp={inp} btn={btn} />
        )}

        {/* ── MÉTRICAS ── */}
        {tab === 'metricas' && (
          <div style={{ display: 'grid', gap: 16 }}>
            {campanas.map(c => (
              <div key={c.id} style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12 }}>{c.nombre} {c.activa && <span style={{ fontSize: 11, color: C.ok }}>● activa</span>}</div>
                <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                  {[['Enviados', c.enviados, C.accent], ['Abiertos', c.abiertos, '#7c3aed'], ['Clicks', c.con_click, C.red], ['Pendientes', c.pendientes, C.muted], ['Fallidos', c.fallidos, C.warn]].map(([l, v, col]: any) => (
                    <div key={l}><div style={{ fontSize: 26, fontWeight: 900, color: col }}>{v}</div><div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>{l}</div></div>
                  ))}
                  <div><div style={{ fontSize: 26, fontWeight: 900, color: C.ok }}>{c.enviados ? Math.round((c.con_click / c.enviados) * 100) : 0}%</div><div style={{ fontSize: 11, color: C.muted, textTransform: 'uppercase' }}>CTR</div></div>
                </div>
              </div>
            ))}
            {!campanas.length && <div style={{ padding: 40, textAlign: 'center', color: C.muted }}>Aún no hay campañas.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

function CampanaEditor({ detalle, campanas, busy, onSelect, onCrear, onGuardar, onGenerarIA, onEnviar, setDetalle, inp, btn }: any) {
  if (!campanas.length) return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 40, textAlign: 'center' }}>
      <p style={{ color: C.muted, marginBottom: 16 }}>No hay ninguna campaña todavía.</p>
      <button onClick={onCrear} style={{ ...btn(true) }}>+ Crear campaña de presentación</button>
    </div>
  )
  if (!detalle) return <div style={{ color: C.muted }}>Cargando…</div>
  const { campana, pasos } = detalle

  return (
    <div style={{ background: C.card, borderRadius: 14, border: `1px solid ${C.border}`, padding: 24 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
        <select value={campana.id} onChange={e => onSelect(e.target.value)} style={{ ...inp, maxWidth: 280 }}>
          {campanas.map((c: any) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
        </select>
        <button onClick={onCrear} style={btn(false)}>+ Nueva</button>
        <div style={{ flex: 1 }} />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, color: campana.activa ? C.ok : C.muted }}>
          <input type="checkbox" checked={!!campana.activa} onChange={e => onGuardar({ activa: e.target.checked })} style={{ accentColor: C.accent, width: 18, height: 18 }} />
          {campana.activa ? '● Agente ACTIVO' : '○ Pausado'}
        </label>
        <button onClick={onEnviar} disabled={busy} style={{ ...btn(true), background: C.ok }}>{busy ? '…' : '▶ Enviar ahora'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 12, marginBottom: 20 }}>
        <div><label style={lbl}>Nombre</label><input defaultValue={campana.nombre} onBlur={e => e.target.value !== campana.nombre && onGuardar({ nombre: e.target.value })} style={inp} /></div>
        <div><label style={lbl}>Enlace a la landing</label><input defaultValue={campana.landing_url} onBlur={e => e.target.value !== campana.landing_url && onGuardar({ landing_url: e.target.value })} style={inp} /></div>
        <div><label style={lbl}>Máx. envíos/día (warm-up)</label><input type="number" defaultValue={campana.max_dia} onBlur={e => Number(e.target.value) !== campana.max_dia && onGuardar({ max_dia: Number(e.target.value) })} style={inp} /></div>
      </div>

      <div style={{ fontWeight: 800, marginBottom: 8 }}>Secuencia de correos</div>
      <div style={{ fontSize: 12, color: C.muted, marginBottom: 14 }}>
        Marcadores disponibles: <code>{'{{opener}}'}</code> (frase IA), <code>{'{{empresa}}'}</code>, <code>{'{{ciudad}}'}</code>.
        Los botones de la web y WhatsApp se añaden solos. El paso 2+ se envía solo a quien NO abrió/pinchó tras los días de espera.
      </div>

      {pasos.map((p: any, i: number) => (
        <div key={i} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 10, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 800, color: C.accent }}>Paso {p.orden || i + 1}</span>
            {i > 0 && <label style={{ fontSize: 12, color: C.muted }}>Espera (días):
              <input type="number" value={p.dias_espera ?? 3} onChange={e => { const ps = [...pasos]; ps[i] = { ...p, dias_espera: Number(e.target.value) }; setDetalle({ ...detalle, pasos: ps }) }}
                style={{ ...inp, width: 70, display: 'inline-block', marginLeft: 6, padding: '4px 8px' }} /></label>}
            <div style={{ flex: 1 }} />
            <button onClick={() => onGenerarIA(i)} disabled={busy} style={{ ...btn(false), fontSize: 12 }}>✨ Generar con IA</button>
            {pasos.length > 1 && <button onClick={() => setDetalle({ ...detalle, pasos: pasos.filter((_: any, j: number) => j !== i) })} style={{ ...btn(false), fontSize: 12, color: C.red }}>Eliminar</button>}
          </div>
          <input placeholder="Asunto" value={p.asunto || ''} onChange={e => { const ps = [...pasos]; ps[i] = { ...p, asunto: e.target.value }; setDetalle({ ...detalle, pasos: ps }) }} style={{ ...inp, marginBottom: 8 }} />
          <textarea placeholder="Cuerpo (HTML simple)" value={p.cuerpo_html || ''} onChange={e => { const ps = [...pasos]; ps[i] = { ...p, cuerpo_html: e.target.value }; setDetalle({ ...detalle, pasos: ps }) }}
            rows={6} style={{ ...inp, fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }} />
        </div>
      ))}

      <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
        <button onClick={() => setDetalle({ ...detalle, pasos: [...pasos, { orden: pasos.length + 1, dias_espera: 3, asunto: '', cuerpo_html: '<p>{{opener}}</p>' }] })} style={btn(false)}>+ Añadir paso de seguimiento</button>
        <button onClick={() => onGuardar({ pasos })} disabled={busy} style={btn(true)}>{busy ? 'Guardando…' : '💾 Guardar secuencia'}</button>
      </div>
    </div>
  )
}

const lbl: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.05em' }
