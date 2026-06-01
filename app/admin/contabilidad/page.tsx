'use client'
import { useState, useEffect, useCallback } from 'react'
import LogoIalimp from '@/components/LogoIalimp'

function Spinner() {
  return <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Cargando...</div>
}

function fmtEur(n: number | null | undefined) {
  if (n == null) return '—'
  return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' })
}

function fmtPct(n: number | null | undefined) {
  if (n == null) return '—'
  return Number(n).toFixed(1) + ' %'
}

// ─── TAB RESULTADO ────────────────────────────────────────────────
function TabResultado() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/contabilidad/resultado?year=${year}`)
    const d = await r.json()
    setRows(d.rows || [])
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  const totIngresos = rows.reduce((a, r) => a + Number(r.ingresos || 0), 0)
  const totGastos   = rows.reduce((a, r) => a + Number(r.gastos || 0), 0)
  const totBenef    = rows.reduce((a, r) => a + Number(r.beneficio ?? (Number(r.ingresos || 0) - Number(r.gastos || 0))), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={() => setYear(y => y - 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'Ingresos', value: fmtEur(totIngresos), color: '#16a34a' },
          { label: 'Gastos', value: fmtEur(totGastos), color: '#dc2626' },
          { label: 'Beneficio neto', value: fmtEur(totBenef), color: totBenef >= 0 ? '#4f46e5' : '#dc2626' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', flex: 1, textAlign: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Mes', 'Ingresos', 'Gastos', 'Beneficio', 'Margen'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Mes' ? 'left' : 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const benef = Number(r.beneficio ?? (Number(r.ingresos || 0) - Number(r.gastos || 0)))
                const margen = Number(r.ingresos || 0) > 0 ? (benef / Number(r.ingresos)) * 100 : 0
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600 }}>{r.mes_label || r.mes}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#16a34a' }}>{fmtEur(r.ingresos)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#dc2626' }}>{fmtEur(r.gastos)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: benef >= 0 ? '#4f46e5' : '#dc2626' }}>{fmtEur(benef)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#6b7280' }}>{fmtPct(margen)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Sin datos para {year}</div>}
        </div>
      )}
    </div>
  )
}

// ─── TAB IVA ──────────────────────────────────────────────────────
function TabIva() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/contabilidad/iva?year=${year}`)
    const d = await r.json()
    setRows(d.rows || [])
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  const totRep = rows.reduce((a, r) => a + Number(r.repercutido || 0), 0)
  const totSop = rows.reduce((a, r) => a + Number(r.soportado || 0), 0)
  const totLiq = rows.reduce((a, r) => a + Number(r.liquidar ?? (Number(r.repercutido || 0) - Number(r.soportado || 0))), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={() => setYear(y => y - 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>›</button>
      </div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        {[
          { label: 'IVA repercutido', value: fmtEur(totRep), color: '#16a34a' },
          { label: 'IVA soportado', value: fmtEur(totSop), color: '#f59e0b' },
          { label: 'A liquidar (Hacienda)', value: fmtEur(totLiq), color: totLiq >= 0 ? '#dc2626' : '#16a34a' },
        ].map(k => (
          <div key={k.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', flex: 1, textAlign: 'center', minWidth: 120 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{k.label}</div>
          </div>
        ))}
      </div>
      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                {['Mes', 'IVA repercutido', 'IVA soportado', 'A liquidar'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Mes' ? 'left' : 'right', fontWeight: 700, color: '#374151', borderBottom: '1px solid #e5e7eb' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                const liq = Number(r.liquidar ?? (Number(r.repercutido || 0) - Number(r.soportado || 0)))
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '9px 14px', fontWeight: 600 }}>{r.mes_label || r.mes}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#16a34a' }}>{fmtEur(r.repercutido)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', color: '#f59e0b' }}>{fmtEur(r.soportado)}</td>
                    <td style={{ padding: '9px 14px', textAlign: 'right', fontWeight: 700, color: liq >= 0 ? '#dc2626' : '#16a34a' }}>{fmtEur(liq)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Sin datos para {year}</div>}
        </div>
      )}
    </div>
  )
}

// ─── TAB TESORERÍA ────────────────────────────────────────────────
function TabTesoreria() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [pendientes, setPendientes] = useState<any[]>([])
  const [marking, setMarking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/contabilidad/tesoreria')
    const d = await r.json()
    setRows(d.movimientos || [])
    setPendientes(d.pendientes || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function marcarPagado(id: string, tipo: string) {
    setMarking(id)
    await fetch('/api/admin/contabilidad/marcar', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, tipo, pagado: true })
    })
    setMarking(null)
    load()
  }

  const saldo = rows.reduce((a, r) => a + (r.tipo === 'ingreso' ? Number(r.importe || 0) : -Number(r.importe || 0)), 0)

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', marginBottom: 16, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: saldo >= 0 ? '#16a34a' : '#dc2626' }}>{fmtEur(saldo)}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Saldo neto</div>
        </div>
        <div style={{ textAlign: 'center', flex: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#f59e0b' }}>{pendientes.length}</div>
          <div style={{ fontSize: 11, color: '#6b7280' }}>Pendientes de cobro</div>
        </div>
      </div>
      {pendientes.length > 0 && (
        <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 12, padding: 14, marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#c2410c', marginBottom: 10 }}>⏳ Pendientes de cobro</div>
          {pendientes.map((p: any) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #fed7aa' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{p.concepto || p.descripcion}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{p.fecha} · {p.cliente_nombre || ''}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontWeight: 700, color: '#c2410c' }}>{fmtEur(p.importe)}</span>
                <button onClick={() => marcarPagado(p.id, p.origen || 'factura')} disabled={marking === p.id}
                  style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 7, padding: '4px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', opacity: marking === p.id ? 0.5 : 1 }}>
                  ✓ Cobrado
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 700, fontSize: 13 }}>Últimos movimientos</div>
          {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Sin movimientos</div>}
          {rows.map((r: any, i: number) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{r.concepto || r.descripcion}</div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>{r.fecha} · {r.tipo}</div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 14, color: r.tipo === 'ingreso' ? '#16a34a' : '#dc2626' }}>
                {r.tipo === 'ingreso' ? '+' : '-'}{fmtEur(r.importe)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB RENTABILIDAD ─────────────────────────────────────────────
function TabRentabilidad() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/contabilidad/rentabilidad?year=${year}`)
    const d = await r.json()
    setRows(d.rows || [])
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={() => setYear(y => y - 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>›</button>
      </div>
      {loading ? <Spinner /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af', background: '#fff', borderRadius: 12 }}>Sin datos para {year}</div>}
          {rows.map((r: any, i: number) => {
            const margen = Number(r.margen_pct || 0)
            return (
              <div key={i} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontWeight: 700, fontSize: 14 }}>{r.propiedad || r.cliente || r.concepto || r.label}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, color: margen >= 20 ? '#16a34a' : margen >= 0 ? '#f59e0b' : '#dc2626' }}>{fmtPct(margen)}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
                  <span>Ingresos: <b style={{ color: '#16a34a' }}>{fmtEur(r.ingresos)}</b></span>
                  <span>Gastos: <b style={{ color: '#dc2626' }}>{fmtEur(r.gastos)}</b></span>
                  <span>Neto: <b style={{ color: '#4f46e5' }}>{fmtEur(Number(r.beneficio ?? (Number(r.ingresos || 0) - Number(r.gastos || 0))))}</b></span>
                </div>
                <div style={{ marginTop: 8, background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                  <div style={{ width: `${Math.min(100, Math.max(0, margen))}%`, height: 6, borderRadius: 4, background: margen >= 20 ? '#16a34a' : margen >= 0 ? '#f59e0b' : '#dc2626', transition: 'width .3s' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── TAB APUNTES (alta manual de gastos) ─────────────────────────
const CATEGORIAS_APUNTE: { key: string; label: string }[] = [
  { key: 'suministros', label: '⚡ Suministros' },
  { key: 'limpieza',    label: '🧹 Limpieza' },
  { key: 'lavanderia',  label: '👕 Lavandería' },
  { key: 'reparacion',  label: '🔧 Reparación' },
  { key: 'menaje',      label: '🛋️ Menaje' },
  { key: 'gestion',     label: '📋 Gestoría' },
  { key: 'plataforma',  label: '💻 Plataformas' },
  { key: 'seguro',      label: '🛡️ Seguro' },
  { key: 'impuesto',    label: '📑 Impuestos' },
  { key: 'marketing',   label: '📣 Marketing' },
  { key: 'otros',       label: '📦 Otros' },
]

function NuevoApunteModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    proveedor: '', concepto: '', fecha: new Date().toISOString().split('T')[0],
    categoria: 'otros', base_imponible: '', porcentaje_iva: '21',
    numero_doc: '', pagado: false, notas: '',
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState('')
  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  const base  = Number(form.base_imponible) || 0
  const pct   = Number(form.porcentaje_iva) || 0
  const cuota = Math.round(base * pct) / 100
  const total = Math.round((base + cuota) * 100) / 100

  async function guardar() {
    if (!form.base_imponible || base <= 0) { setErr('La base imponible debe ser mayor que 0'); return }
    if (!form.proveedor && !form.concepto) { setErr('Indica proveedor o concepto'); return }
    setSaving(true); setErr('')
    const r = await fetch('/api/admin/contabilidad/apuntes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, base_imponible: base, porcentaje_iva: pct }),
    })
    const d = await r.json()
    if (r.ok && (d.ok || d.id)) { onSaved() }
    else { setErr(d.error || 'Error al guardar'); setSaving(false) }
  }

  const inp: any = { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14, fontFamily: 'inherit', color: '#1e1b4b', boxSizing: 'border-box' }
  const lab: any = { fontSize: 11, fontWeight: 700, color: '#6b7280', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '.05em' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 300, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: '#1e1b4b' }}>➕ Nuevo apunte de gasto</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, color: '#6b7280', cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={lab}>Proveedor</label>
            <input value={form.proveedor} onChange={e => set('proveedor', e.target.value)} placeholder="Ej: Endesa, Mapfre, Gestoría…" style={inp} />
          </div>
          <div>
            <label style={lab}>Concepto</label>
            <input value={form.concepto} onChange={e => set('concepto', e.target.value)} placeholder="Ej: Luz mayo, Cuota mensual…" style={inp} />
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={lab}>Fecha *</label>
              <input type="date" value={form.fecha} onChange={e => set('fecha', e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lab}>Nº factura</label>
              <input value={form.numero_doc} onChange={e => set('numero_doc', e.target.value)} placeholder="Opcional" style={inp} />
            </div>
          </div>
          <div>
            <label style={lab}>Categoría</label>
            <select value={form.categoria} onChange={e => set('categoria', e.target.value)} style={inp}>
              {CATEGORIAS_APUNTE.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={lab}>Base imponible € *</label>
              <input type="number" step="0.01" value={form.base_imponible} onChange={e => set('base_imponible', e.target.value)} placeholder="0,00"
                style={{ ...inp, fontSize: 18, fontWeight: 800, color: '#4f46e5' }} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lab}>% IVA</label>
              <input type="number" step="1" value={form.porcentaje_iva} onChange={e => set('porcentaje_iva', e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ background: '#eef2ff', borderRadius: 10, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#1e1b4b' }}>
            <span>IVA: <b>{fmtEur(cuota)}</b></span>
            <span>Total: <b>{fmtEur(total)}</b></span>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#1e1b4b', cursor: 'pointer' }}>
            <input type="checkbox" checked={form.pagado} onChange={e => set('pagado', e.target.checked)} style={{ width: 18, height: 18 }} />
            Ya pagado (cuenta en Tesorería)
          </label>
          <div>
            <label style={lab}>Notas</label>
            <textarea value={form.notas} onChange={e => set('notas', e.target.value)} rows={2} placeholder="Observaciones…"
              style={{ ...inp, resize: 'none' }} />
          </div>
          {err && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ flex: 1, padding: 12, borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
            <button onClick={guardar} disabled={saving}
              style={{ flex: 2, padding: 12, borderRadius: 10, border: 'none', background: '#4f46e5', color: '#fff', fontSize: 13, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : '💾 Guardar apunte'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TabApuntes() {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [year, setYear] = useState(new Date().getFullYear())
  const [showModal, setShowModal] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/contabilidad/apuntes?year=${year}`)
    const d = await r.json()
    setRows(d.rows || [])
    setLoading(false)
  }, [year])

  useEffect(() => { load() }, [load])

  async function borrar(id: string) {
    if (!confirm('¿Eliminar este apunte contable?')) return
    setDeleting(id)
    await fetch(`/api/admin/contabilidad/apuntes/${id}`, { method: 'DELETE' })
    setDeleting(null)
    load()
  }

  const cat = (k: string) => CATEGORIAS_APUNTE.find(c => c.key === k)?.label || '📦 Otros'
  const total = rows.reduce((a, r) => a + Number(r.base_imponible || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
        <button onClick={() => setYear(y => y - 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>‹</button>
        <span style={{ fontWeight: 700, fontSize: 15 }}>{year}</span>
        <button onClick={() => setYear(y => y + 1)} style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 14px', background: '#fff', cursor: 'pointer' }}>›</button>
        <button onClick={() => setShowModal(true)}
          style={{ marginLeft: 'auto', border: 'none', borderRadius: 9, padding: '9px 16px', background: '#4f46e5', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
          ➕ Nuevo apunte
        </button>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '14px 20px', marginBottom: 16, textAlign: 'center' }}>
        <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{fmtEur(total)}</div>
        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Total gastos registrados · {rows.length} apuntes</div>
      </div>

      {loading ? <Spinner /> : (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          {rows.length === 0 && <div style={{ textAlign: 'center', padding: 32, color: '#9ca3af' }}>Sin apuntes en {year}. Pulsa «➕ Nuevo apunte» para añadir uno.</div>}
          {rows.map((r: any) => (
            <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 16px', borderBottom: '1px solid #f3f4f6', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#1e1b4b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.descripcion || r.proveedor || '—'}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280' }}>
                  {r.fecha} · {cat(r.categoria)}{r.proveedor && r.descripcion ? ` · ${r.proveedor}` : ''}
                  {r.tipo_doc === 'manual' ? '' : ' · 📷 escaneado'}
                  {r.pagado ? ' · ✅ pagado' : ' · ⏳ pendiente'}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#dc2626' }}>{fmtEur(r.total ?? r.base_imponible)}</span>
                {r.tipo_doc === 'manual' && (
                  <button onClick={() => borrar(r.id)} disabled={deleting === r.id} title="Eliminar"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: '#9ca3af', opacity: deleting === r.id ? 0.4 : 1 }}>🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <NuevoApunteModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load() }} />}
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────
const TABS = [
  { key: 'resultado',    label: '📊 Resultado' },
  { key: 'apuntes',      label: '📒 Apuntes' },
  { key: 'iva',          label: '🧾 IVA' },
  { key: 'tesoreria',   label: '💰 Tesorería' },
  { key: 'rentabilidad', label: '📈 Rentabilidad' },
]

export default function ContabilidadPage() {
  const [activeTab, setActiveTab] = useState(0)
  const [exporting, setExporting] = useState(false)

  async function exportExcel() {
    setExporting(true)
    try {
      const r = await fetch('/api/admin/contabilidad/export')
      const blob = await r.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contabilidad-${new Date().getFullYear()}.xlsx`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e) {
      alert('Error al exportar')
    }
    setExporting(false)
  }

  return (
    <div style={{ fontFamily: "'Nunito', sans-serif", minHeight: '100vh', background: '#f1f5f9' }}>
      <header style={{ background: '#4f46e5', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0 0' }}>
          <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
          <LogoIalimp size={13} style={{ opacity: 0.8 }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
          <h1 style={{ color: '#fff', fontWeight: 800, fontSize: 22, margin: 0 }}>Contabilidad</h1>
          <button onClick={exportExcel} disabled={exporting}
            style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 9, padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: exporting ? 0.6 : 1 }}>
            {exporting ? 'Exportando...' : '⬇️ Excel'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', scrollbarWidth: 'none', marginTop: 12 }}>
          {TABS.map((t, i) => (
            <button key={t.key} onClick={() => setActiveTab(i)}
              style={{ padding: '10px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'transparent', whiteSpace: 'nowrap', fontSize: 13,
                color: activeTab === i ? '#fff' : 'rgba(255,255,255,0.55)',
                fontWeight: activeTab === i ? 700 : 400,
                borderBottom: `2.5px solid ${activeTab === i ? '#fff' : 'transparent'}` }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
        {activeTab === 0 && <TabResultado />}
        {activeTab === 1 && <TabApuntes />}
        {activeTab === 2 && <TabIva />}
        {activeTab === 3 && <TabTesoreria />}
        {activeTab === 4 && <TabRentabilidad />}
      </div>
    </div>
  )
}
