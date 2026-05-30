'use client'
import { useState, useEffect, useCallback, useRef } from 'react'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff', bg: '#f1f5f9',
  text: '#1e1b4b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb',
  red: '#dc2626', redBg: '#fef2f2', white: '#ffffff'
}


const PROPS = [
  { id: 'prop_house_sevillana', name: 'House Sevillana', color: '#16a34a', short: 'HS' },
  { id: 'prop_duplex_center',   name: 'Dúplex Center',   color: '#2563eb', short: 'DC' },
  { id: 'prop_luxury_busto',    name: 'Luxury Busto',    color: '#9333ea', short: 'LB' },
  { id: 'prop_busto_reform',    name: 'Busto Reform',    color: '#ea580c', short: 'BR' },
]
const TIPO_LENCERIA = [
  'sabana_bajera', 'sabana_encimera', 'funda_almohada', 'toalla_bano',
  'toalla_mano', 'alfombrin', 'colcha', 'almohada', 'nórdico', 'otro',
]
const CAT_PROVEEDOR = ['general', 'limpieza', 'lenceria', 'lavanderia', 'mantenimiento']
const CAT_PRODUCTO  = ['limpieza', 'lenceria', 'amenities', 'consumible', 'herramienta']

function pBy(id: string) { return PROPS.find(p => p.id === id) }

function Spinner() { return <div style={{textAlign:'center',padding:32,color:'#9ca3af'}}>Cargando...</div> }
function StatCard({ value, label, color = '#4f46e5' }: { value: any; label: string; color?: string }) {
  return (
    <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',padding:'12px 16px',flex:1,minWidth:100}}>
      <div style={{fontWeight:800,fontSize:24,color}}>{value}</div>
      <div style={{fontSize:12,color:'#64748b'}}>{label}</div>
    </div>
  )
}


const FREQ_OPTS = [
  { value:'per_change', label:'Cada cambio' },
  { value:'weekly',     label:'Semanal'     },
  { value:'monthly',    label:'Mensual'     },
  { value:'one_time',   label:'Puntual'     },
]


const TABS = [
  { id: 'stock',       label: '📦 Stock'       },
  { id: 'lenceria',    label: '🛏️ Lencería'    },
  { id: 'proveedores', label: '🏪 Proveedores'  },
  { id: 'checklists',  label: '✅ Checklists'   },
  { id: 'documentos',  label: '📄 Documentos'  },
]

export default function MaterialesPage() {
  const [tab, setTab] = useState('stock')

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <header style={{ background: C.primary, padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 0 0' }}>
          <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
          <h1 style={{ color: C.white, fontWeight: 800, fontSize: 20 }}>Materiales</h1>
        </div>
        <div style={{ display: 'flex', gap: 0, overflowX: 'auto', marginTop: 12 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                padding: '10px 16px', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                background: 'transparent', whiteSpace: 'nowrap', fontSize: 13,
                color: tab === t.id ? C.white : 'rgba(255,255,255,0.55)',
                fontWeight: tab === t.id ? 700 : 400,
                borderBottom: `2.5px solid ${tab === t.id ? C.white : 'transparent'}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </header>
      <div style={{ padding: '20px 24px', maxWidth: 960, margin: '0 auto' }}>
        {tab === 'stock'       && <TabStockMateriales />}
        {tab === 'lenceria'    && <TabLenceriaMateriales />}
        {tab === 'proveedores' && <TabProveedoresMateriales />}
        {tab === 'checklists'  && <TabChecklistsMateriales />}
        {tab === 'documentos'  && <TabDocumentosMateriales />}
      </div>
    </div>
  )
}

// ─── TAB STOCK ───────────────────────────────────────────────────
function TabStockMateriales() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selProp, setSelProp] = useState('all')

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/items')
    const d = await r.json()
    setItems(d.items || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = selProp === 'all' ? items : items.filter(i => i.property_id === selProp)
  const alertas = filtered.filter(i => i.stock_actual < i.stock_minimo)

  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <StatCard value={filtered.length} label="Artículos" />
        <StatCard value={alertas.length} label="⚠️ Alertas" color={alertas.length > 0 ? '#dc2626' : '#16a34a'} />
      </div>
      {alertas.length > 0 && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 12, marginBottom: 14 }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#dc2626', marginBottom: 8 }}>⚠️ Stock bajo</div>
          {alertas.map(i => (
            <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #fecaca' }}>
              <span>{i.articulo} — {pBy(i.property_id)?.short}</span>
              <span style={{ color: '#dc2626', fontWeight: 700 }}>{i.stock_actual} / mín {i.stock_minimo} {i.unidad}</span>
            </div>
          ))}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
        <button onClick={() => setSelProp('all')}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: selProp === 'all' ? '#1B4332' : '#fff', color: selProp === 'all' ? '#fff' : '#374151', fontSize: 12, cursor: 'pointer' }}>
          Todos
        </button>
        {PROPS.map(p => (
          <button key={p.id} onClick={() => setSelProp(p.id)}
            style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${p.color}`, background: selProp === p.id ? p.color : '#fff', color: selProp === p.id ? '#fff' : p.color, fontSize: 12, cursor: 'pointer' }}>
            {p.short}
          </button>
        ))}
      </div>
      {filtered.map(i => {
        const bajo = i.stock_actual < i.stock_minimo
        const pct = Math.min(100, Math.round(i.stock_actual / Math.max(1, i.stock_minimo) * 100))
        return (
          <div key={i.id} style={{ background: bajo ? '#fff7ed' : '#fff', border: `1px solid ${bajo ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: 13 }}>{i.articulo}</span>
                <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{pBy(i.property_id)?.short} · {i.categoria}</span>
              </div>
              <span style={{ fontWeight: 700, fontSize: 13, color: bajo ? '#c2410c' : '#111' }}>{i.stock_actual} {i.unidad}</span>
            </div>
            <div style={{ background: '#f3f4f6', borderRadius: 4, height: 4 }}>
              <div style={{ width: `${pct}%`, height: 4, borderRadius: 4, background: bajo ? '#ef4444' : '#16a34a', transition: 'width .3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 3 }}>Mínimo: {i.stock_minimo} {i.unidad}</div>
            {bajo && (
              <button onClick={async()=>{
                const prov = i.proveedor_nombre || 'proveedor'
                if(!confirm(`¿Crear pedido de ${i.articulo} a ${prov}?`)) return
                const r = await fetch('/api/admin/proveedores')
                const d = await r.json()
                alert('📦 Para crear el pedido, ve a la tab Proveedores y selecciona el proveedor')
              }} style={{marginTop:6,padding:'5px 12px',borderRadius:8,border:'1px solid #fed7aa',background:'#fff7ed',color:'#c2410c',fontSize:11,fontWeight:600,cursor:'pointer',width:'100%'}}>
                ⚡ Pedir reposición
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── TAB LENCERÍA ────────────────────────────────────────────────
function TabLenceriaMateriales() {
  const [items, setItems] = useState<any[]>([])
  const [envios, setEnvios] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selProp, setSelProp] = useState<string>('all')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ property_id: PROPS[0].id, tipo: 'sabana_bajera', talla: 'matrimonio', cantidad_total: '', cantidad_disponible: '', coste_unidad: '' })

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/admin/lenceria')
    const d = await r.json()
    setItems(d.items || []); setEnvios(d.envios || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = selProp === 'all' ? items : items.filter(i => i.property_id === selProp)

  async function saveItem() {
    await fetch('/api/admin/lenceria', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, cantidad_total: +form.cantidad_total, cantidad_disponible: +form.cantidad_disponible, coste_unidad: +form.coste_unidad || null })
    })
    setShowForm(false); load()
  }

  async function updateStock(item: any, field: string, val: number) {
    await fetch('/api/admin/lenceria', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, [field]: val })
    })
    load()
  }

  if (loading) return <Spinner />

  const totalPiezas = filtered.reduce((a, i) => a + (i.cantidad_total || 0), 0)
  const enLavanderia = filtered.reduce((a, i) => a + (i.cantidad_lavanderia || 0), 0)
  const disponibles = filtered.reduce((a, i) => a + (i.cantidad_disponible || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <StatCard value={totalPiezas} label="Total piezas" />
        <StatCard value={disponibles} label="Disponibles" color="#16a34a" />
        <StatCard value={enLavanderia} label="En lavandería" color="#2563eb" />
        <StatCard value={filtered.reduce((a, i) => a + (i.cantidad_sucia || 0), 0)} label="Sucias" color="#f59e0b" />
      </div>

      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        <button onClick={() => setSelProp('all')}
          style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: selProp === 'all' ? '#1B4332' : '#fff', color: selProp === 'all' ? '#fff' : '#374151', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Todos
        </button>
        {PROPS.map(p => (
          <button key={p.id} onClick={() => setSelProp(p.id)}
            style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${p.color}`,
              background: selProp === p.id ? p.color : '#fff', color: selProp === p.id ? '#fff' : p.color,
              fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
            {p.short}
          </button>
        ))}
        <button onClick={() => setShowForm(v => !v)}
          style={{ marginLeft: 'auto', padding: '6px 14px', borderRadius: 8, background: '#1B4332', color: '#fff', border: 'none', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          + Añadir
        </button>
      </div>

      {showForm && (
        <div style={{ background: '#f9fafb', borderRadius: 12, padding: 14, marginBottom: 14 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 8 }}>
            <select value={form.property_id} onChange={e => setForm((p: any) => ({ ...p, property_id: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
              {PROPS.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={form.tipo} onChange={e => setForm((p: any) => ({ ...p, tipo: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
              {TIPO_LENCERIA.map(t => <option key={t}>{t}</option>)}
            </select>
            <input placeholder="Talla (matrimonio, 90…)" value={form.talla} onChange={e => setForm((p: any) => ({ ...p, talla: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
            <input type="number" placeholder="Total piezas" value={form.cantidad_total} onChange={e => setForm((p: any) => ({ ...p, cantidad_total: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
            <input type="number" placeholder="Disponibles ahora" value={form.cantidad_disponible} onChange={e => setForm((p: any) => ({ ...p, cantidad_disponible: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
            <input type="number" placeholder="Coste/ud €" value={form.coste_unidad} onChange={e => setForm((p: any) => ({ ...p, coste_unidad: e.target.value }))}
              style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
          </div>
          <button onClick={saveItem}
            style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
            Guardar
          </button>
        </div>
      )}

      {Object.entries(filtered.reduce((acc: any, i: any) => {
        const p = pBy(i.property_id)?.name || i.property_id
        if (!acc[p]) acc[p] = []; acc[p].push(i); return acc
      }, {})).map(([propName, its]: any) => (
        <div key={propName} style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8, color: '#374151' }}>{propName}</div>
          {its.map((item: any) => {
            const bajoBajo = item.cantidad_disponible < 2
            return (
              <div key={item.id} style={{ background: bajoBajo ? '#fff7ed' : '#fff', border: `1px solid ${bajoBajo ? '#fed7aa' : '#e5e7eb'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 6 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{item.tipo.replace(/_/g, ' ')}</span>
                    {item.talla && <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 6 }}>{item.talla}</span>}
                    {bajoBajo && <span style={{ marginLeft: 8, fontSize: 11, fontWeight: 700, color: '#c2410c' }}>⚠️ Stock bajo</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 12, fontSize: 12, alignItems: 'center' }}>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Disp: </span>
                      <input type="number" value={item.cantidad_disponible} min={0}
                        onChange={e => updateStock(item, 'cantidad_disponible', +e.target.value)}
                        style={{ width: 48, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Lav: </span>
                      <input type="number" value={item.cantidad_lavanderia} min={0}
                        onChange={e => updateStock(item, 'cantidad_lavanderia', +e.target.value)}
                        style={{ width: 48, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                    </div>
                    <div>
                      <span style={{ color: '#9ca3af' }}>Sucia: </span>
                      <input type="number" value={item.cantidad_sucia} min={0}
                        onChange={e => updateStock(item, 'cantidad_sucia', +e.target.value)}
                        style={{ width: 48, border: '1px solid #e5e7eb', borderRadius: 6, padding: '2px 6px', fontSize: 12, textAlign: 'center' }} />
                    </div>
                    <div style={{ color: '#9ca3af', fontSize: 11 }}>/{item.cantidad_total}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

// ─── TAB PROVEEDORES ─────────────────────────────────────────────
function TabProveedoresMateriales() {
  const [proveedores, setProveedores] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'proveedores' | 'productos'>('proveedores')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ nombre: '', empresa: '', telefono: '', email: '', whatsapp: '', categoria: 'general', notas: '' })
  const [formProd, setFormProd] = useState<any>({ proveedor_id: '', nombre: '', referencia: '', categoria: 'limpieza', unidad: 'unidad', precio_unitario: '', notas: '' })
  const [showFormProd, setShowFormProd] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [r1, r2] = await Promise.all([
      fetch('/api/admin/proveedores'),
      fetch('/api/admin/productos'),
    ])
    const d1 = await r1.json(); const d2 = await r2.json()
    setProveedores(d1.proveedores || []); setProductos(d2.productos || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function saveProveedor() {
    if (!form.nombre) return
    await fetch('/api/admin/proveedores', {
      method: form.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    setForm({ nombre: '', empresa: '', telefono: '', email: '', whatsapp: '', categoria: 'general', notas: '' })
    setShowForm(false); load()
  }

  async function saveProducto() {
    if (!formProd.nombre) return
    await fetch('/api/admin/productos', {
      method: formProd.id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formProd)
    })
    setFormProd({ proveedor_id: '', nombre: '', referencia: '', categoria: 'limpieza', unidad: 'unidad', precio_unitario: '', notas: '' })
    setShowFormProd(false); load()
  }

  if (loading) return <Spinner />
  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {['proveedores', 'productos'].map(v => (
          <button key={v} onClick={() => setView(v as any)}
            style={{ padding: '7px 18px', borderRadius: 9, border: '1px solid #e5e7eb', fontWeight: 600, fontSize: 13, cursor: 'pointer',
              background: view === v ? '#1B4332' : '#fff', color: view === v ? '#fff' : '#374151' }}>
            {v === 'proveedores' ? `🏢 Proveedores (${proveedores.length})` : `📦 Catálogo (${productos.length})`}
          </button>
        ))}
      </div>

      {view === 'proveedores' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowForm(v => !v)}
              style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              + Nuevo proveedor
            </button>
          </div>
          {showForm && (
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                {[['nombre', 'Nombre *'], ['empresa', 'Empresa'], ['telefono', 'Teléfono'], ['email', 'Email'], ['whatsapp', 'WhatsApp']].map(([k, l]) => (
                  <input key={k} placeholder={l} value={form[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
                ))}
                <select value={form.categoria} onChange={e => setForm((p: any) => ({ ...p, categoria: e.target.value }))}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
                  {CAT_PROVEEDOR.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <textarea placeholder="Notas" value={form.notas || ''} onChange={e => setForm((p: any) => ({ ...p, notas: e.target.value }))} rows={2}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12, resize: 'none', marginBottom: 8, boxSizing: 'border-box' }} />
              <button onClick={saveProveedor}
                style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          )}
          {proveedores.map(p => (
            <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 14, marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{p.nombre}</div>
                  {p.empresa && <div style={{ fontSize: 12, color: '#6b7280' }}>{p.empresa}</div>}
                  <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap' }}>
                    <Badge label={p.categoria} color="#1B4332" bg="#f0fdf4" />
                    {p.num_productos > 0 && <Badge label={`${p.num_productos} productos`} color="#2563eb" bg="#eff6ff" />}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                  {p.telefono && <a href={`tel:${p.telefono}`} style={{ fontSize: 18, textDecoration: 'none' }}>📞</a>}
                  {p.whatsapp && <a href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 18, textDecoration: 'none' }}>💬</a>}
                  {p.email && <a href={`mailto:${p.email}`} style={{ fontSize: 18, textDecoration: 'none' }}>✉️</a>}
                  <button onClick={() => { setForm({ ...p }); setShowForm(true) }}
                    style={{ background: 'none', border: '1px solid #e5e7eb', borderRadius: 7, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>✏️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'productos' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button onClick={() => setShowFormProd(v => !v)}
              style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              + Nuevo producto
            </button>
          </div>
          {showFormProd && (
            <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <select value={formProd.proveedor_id} onChange={e => setFormProd((p: any) => ({ ...p, proveedor_id: e.target.value }))}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
                  <option value="">Sin proveedor</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
                <select value={formProd.categoria} onChange={e => setFormProd((p: any) => ({ ...p, categoria: e.target.value }))}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }}>
                  {CAT_PRODUCTO.map(c => <option key={c}>{c}</option>)}
                </select>
                {[['nombre', 'Nombre producto *'], ['referencia', 'Referencia'], ['unidad', 'Unidad (litro, kg…)'], ['precio_unitario', 'Precio unitario €']].map(([k, l]) => (
                  <input key={k} placeholder={l} value={formProd[k] || ''} type={k === 'precio_unitario' ? 'number' : 'text'}
                    onChange={e => setFormProd((p: any) => ({ ...p, [k]: e.target.value }))}
                    style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '7px 10px', fontSize: 12 }} />
                ))}
              </div>
              <button onClick={saveProducto}
                style={{ background: '#1B4332', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                Guardar
              </button>
            </div>
          )}
          {Object.entries(productos.reduce((acc: any, p: any) => {
            if (!acc[p.categoria]) acc[p.categoria] = []
            acc[p.categoria].push(p); return acc
          }, {})).map(([cat, prods]: any) => (
            <div key={cat} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 }}>{cat}</div>
              {prods.map((p: any) => (
                <div key={p.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '10px 14px', marginBottom: 6, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{p.nombre}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.proveedor_nombre || 'Sin proveedor'} · {p.unidad}{p.referencia ? ` · Ref: ${p.referencia}` : ''}</div>
                  </div>
                  {p.precio_unitario && <div style={{ fontWeight: 700, fontSize: 14, color: '#1B4332' }}>{Number(p.precio_unitario).toFixed(2)} €</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── TAB CHECKLISTS ──────────────────────────────────────────────
function TabChecklistsMateriales() {
  const [selProp, setSelProp] = useState(PROPS[0].id)
  const [items, setItems] = useState<any[]>([])
  const [templates, setTemplates] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string|null>(null)
  const [editData, setEditData] = useState<any>({})
  const [newItem, setNewItem] = useState({ description:'', frequency:'per_change', requires_photo:false, es_critico:false })
  const [saving, setSaving] = useState(false)
  const uploadRefs = useRef<Record<string,HTMLInputElement|null>>({})

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch(`/api/admin/checklist?property_id=${selProp}`)
    const d = await r.json()
    setItems(d.items||[]); setTemplates(d.templates||[])
    setLoading(false)
  }, [selProp])
  useEffect(()=>{ load() }, [load])

  const template = templates[0]

  async function addItem() {
    if (!newItem.description.trim()||!template) return
    setSaving(true)
    await fetch('/api/admin/checklist',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({...newItem,template_id:template.id,property_id:selProp})})
    setNewItem({description:'',frequency:'per_change',requires_photo:false,es_critico:false})
    setSaving(false); load()
  }

  async function saveEdit() {
    if (!editId) return
    setSaving(true)
    await fetch('/api/admin/checklist',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id:editId,...editData})})
    setEditId(null); setSaving(false); load()
  }

  async function deleteItem(id: string) {
    if (!confirm('¿Eliminar este ítem?')) return
    await fetch('/api/admin/checklist',{method:'DELETE',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({id})})
    load()
  }

  async function move(item: any, dir: 'up'|'down') {
    const idx = items.findIndex(i=>i.id===item.id)
    const other = dir==='up' ? items[idx-1] : items[idx+1]
    if (!other) return
    await fetch('/api/admin/checklist',{method:'PUT',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({_action:'reorder',id:item.id,new_sort:other.sort_order||idx*10,
        swap_id:other.id,old_sort:item.sort_order||(idx+1)*10})})
    load()
  }

  async function uploadRef(itemId: string, file: File) {
    const form = new FormData()
    form.append('file',file); form.append('session_id','reference')
    form.append('item_id',itemId); form.append('slot','ref')
    const r = await fetch('/api/l/upload-photo',{method:'POST',body:form})
    const d = await r.json()
    if (d.url) {
      await fetch('/api/admin/checklist',{method:'PUT',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({id:itemId,...items.find(i=>i.id===itemId),foto_referencia_url:d.url})})
      load()
    }
  }

  const prop = pBy(selProp)
  if (loading) return <Spinner/>

  return (
    <div>
      {/* Selector piso */}
      <div style={{display:'flex',gap:8,marginBottom:16,flexWrap:'wrap'}}>
        {PROPS.map(p=>(
          <button key={p.id} onClick={()=>setSelProp(p.id)}
            style={{padding:'7px 16px',borderRadius:10,border:`2px solid ${p.color}`,
              background:selProp===p.id?p.color:'#fff',color:selProp===p.id?'#fff':p.color,
              fontWeight:700,fontSize:13,cursor:'pointer'}}>
            {p.short}
          </button>
        ))}
      </div>

      {/* Lista de ítems */}
      <div style={{marginBottom:20}}>
        {items.length===0&&<div style={{color:'#9ca3af',textAlign:'center',padding:24}}>Sin ítems configurados</div>}
        {items.map((item,idx)=>(
          <div key={item.id} style={{background:'#fff',border:'1px solid #e5e7eb',borderRadius:12,padding:'12px 14px',marginBottom:8}}>
            {editId===item.id ? (
              <div>
                <input value={editData.description||''} onChange={e=>setEditData((p:any)=>({...p,description:e.target.value}))}
                  style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 10px',fontSize:14,marginBottom:8,boxSizing:'border-box' as const}}/>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
                  <select value={editData.frequency||'per_change'} onChange={e=>setEditData((p:any)=>({...p,frequency:e.target.value}))}
                    style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'6px 8px',fontSize:13}}>
                    {FREQ_OPTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                  <div style={{display:'flex',gap:12,alignItems:'center'}}>
                    <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
                      <input type="checkbox" checked={!!editData.requires_photo}
                        onChange={e=>setEditData((p:any)=>({...p,requires_photo:e.target.checked}))}/>
                      📷 Foto
                    </label>
                    <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
                      <input type="checkbox" checked={!!editData.es_critico}
                        onChange={e=>setEditData((p:any)=>({...p,es_critico:e.target.checked}))}/>
                      🔴 Crítico
                    </label>
                  </div>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={saveEdit} disabled={saving}
                    style={{background:prop?.color||'#1B4332',color:'#fff',border:'none',borderRadius:8,padding:'7px 16px',fontSize:13,fontWeight:700,cursor:'pointer'}}>
                    Guardar
                  </button>
                  <button onClick={()=>setEditId(null)}
                    style={{background:'none',border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 14px',fontSize:13,cursor:'pointer'}}>
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'flex-start',gap:10}}>
                {/* Sort buttons */}
                <div style={{display:'flex',flexDirection:'column',gap:2}}>
                  <button onClick={()=>move(item,'up')} disabled={idx===0}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:14,padding:'0 4px',opacity:idx===0 ? 0.3 : 1}}>▲</button>
                  <button onClick={()=>move(item,'down')} disabled={idx===items.length-1}
                    style={{background:'none',border:'none',cursor:'pointer',color:'#9ca3af',fontSize:14,padding:'0 4px',opacity:idx===items.length-1 ? 0.3 : 1}}>▼</button>
                </div>
                {/* Content */}
                <div style={{flex:1}}>
                  <div style={{fontWeight:600,fontSize:14,marginBottom:4}}>{item.description}</div>
                  <div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}>
                    <Badge label={FREQ_OPTS.find(f=>f.value===item.frequency)?.label||item.frequency} color="#374151" bg="#f3f4f6"/>
                    {item.requires_photo&&<Badge label="📷 Foto" color="#1d4ed8" bg="#eff6ff"/>}
                    {item.es_critico&&<Badge label="🔴 Crítico" color="#dc2626" bg="#fee2e2"/>}
                    {item.foto_referencia_url&&<Badge label="🖼️ Ref" color="#16a34a" bg="#dcfce7"/>}
                  </div>
                </div>
                {/* Actions */}
                <div style={{display:'flex',gap:6,alignItems:'center'}}>
                  {/* Upload foto referencia */}
                  <input ref={el=>{ uploadRefs.current[item.id]=el }} type="file" accept="image/*" style={{display:'none'}}
                    onChange={e=>{const f=e.target.files?.[0];if(f)uploadRef(item.id,f)}}/>
                  <button onClick={()=>uploadRefs.current[item.id]?.click()}
                    style={{background:'none',border:'1px solid #e5e7eb',borderRadius:7,padding:'4px 8px',fontSize:11,cursor:'pointer'}}
                    title="Subir foto de referencia">
                    {item.foto_referencia_url?'🖼️':'📷'}
                  </button>
                  <button onClick={()=>{setEditId(item.id);setEditData({...item})}}
                    style={{background:'none',border:'1px solid #e5e7eb',borderRadius:7,padding:'4px 8px',fontSize:11,cursor:'pointer'}}>✏️</button>
                  <button onClick={()=>deleteItem(item.id)}
                    style={{background:'none',border:'none',color:'#ef4444',cursor:'pointer',fontSize:16,padding:'0 4px'}}>×</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Añadir nuevo ítem */}
      <div style={{background:'#f9fafb',borderRadius:12,padding:16,border:'1px dashed #d1d5db'}}>
        <div style={{fontWeight:700,fontSize:13,marginBottom:12,color:'#374151'}}>+ Nuevo ítem</div>
        <input value={newItem.description} onChange={e=>setNewItem(p=>({...p,description:e.target.value}))}
          placeholder="Descripción del ítem..."
          style={{width:'100%',border:'1px solid #e5e7eb',borderRadius:8,padding:'8px 10px',fontSize:14,marginBottom:8,boxSizing:'border-box' as const}}/>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:10}}>
          <select value={newItem.frequency} onChange={e=>setNewItem(p=>({...p,frequency:e.target.value}))}
            style={{border:'1px solid #e5e7eb',borderRadius:8,padding:'7px 10px',fontSize:13}}>
            {FREQ_OPTS.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
              <input type="checkbox" checked={newItem.requires_photo} onChange={e=>setNewItem(p=>({...p,requires_photo:e.target.checked}))}/>
              📷 Foto
            </label>
            <label style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
              <input type="checkbox" checked={newItem.es_critico} onChange={e=>setNewItem(p=>({...p,es_critico:e.target.checked}))}/>
              🔴 Crítico
            </label>
          </div>
        </div>
        <button onClick={addItem} disabled={saving||!newItem.description.trim()}
          style={{background:prop?.color||'#1B4332',color:'#fff',border:'none',borderRadius:9,padding:'9px 20px',fontWeight:700,fontSize:13,cursor:'pointer',opacity:(saving||!newItem.description.trim()) ? 0.5 : 1}}>
          {saving?'Guardando...':'+ Añadir ítem'}
        </button>
      </div>
    </div>
  )
}


// ─── TAB DOCUMENTOS ──────────────────────────────────────────────
const TIPO_EMOJI: Record<string, string> = {
  factura: '🧾', albaran: '📦', ticket: '🏷️', otro: '📄'
}
const CONFIANZA_COLOR: Record<string, string> = {
  alta: '#16a34a', media: '#d97706', baja: '#dc2626'
}

function TabDocumentosMateriales() {
  const [fase, setFase] = useState<'lista'|'escaner'|'analizando'|'resultado'>('lista')
  const [docs, setDocs]       = useState<any[]>([])
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [imgSrc, setImgSrc]   = useState<string | null>(null)
  const [imgFile, setImgFile] = useState<File | null>(null)
  const [resultado, setResultado] = useState<any>(null)
  const [error, setError]     = useState<string | null>(null)
  const [expandId, setExpandId] = useState<string | null>(null)
  const camRef = useRef<HTMLInputElement>(null)
  const galRef = useRef<HTMLInputElement>(null)

  const cargarDocs = useCallback(async () => {
    setLoadingDocs(true)
    const r = await fetch('/api/admin/escanear?limit=30')
    const d = await r.json()
    setDocs(d.docs || [])
    setLoadingDocs(false)
  }, [])

  useEffect(() => { cargarDocs() }, [cargarDocs])

  const cargarImagen = useCallback((file: File) => {
    setImgFile(file)
    const r = new FileReader()
    r.onload = (e) => { setImgSrc(e.target?.result as string); setFase('escaner') }
    r.readAsDataURL(file)
  }, [])

  const analizar = async () => {
    if (!imgSrc || !imgFile) return
    setFase('analizando')
    setError(null)
    try {
      const base64 = imgSrc.split(',')[1]
      // Step 1: Submit image — returns immediately with doc_id
      const res = await fetch('/api/admin/escanear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_base64: base64, media_type: imgFile.type || 'image/jpeg' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error servidor')
      const doc_id = data.doc_id
      // Step 2: Poll until doc leaves 'pendiente' state (max 120s)
      let attempts = 0
      while (attempts < 24) {
        await new Promise(r => setTimeout(r, 5000))
        attempts++
        const poll = await fetch('/api/admin/escanear?limit=5')
        const pollData = await poll.json()
        const doc = (pollData.docs || []).find((d: any) => d.id === doc_id)
        if (doc && doc.tipo_doc !== 'pendiente') {
          setResultado({ ...doc, datos_ia: { lineas: doc.lineas_json || [], ...doc }, apunte: doc.apunte_json || [] })
          setFase('resultado')
          return
        }
      }
      throw new Error('Tiempo de espera agotado — el documento se procesará en breve')
    } catch (e: any) {
      setError(e.message)
      setFase('escaner')
    }
  }

  const reiniciar = () => {
    setFase('lista'); setImgSrc(null); setImgFile(null)
    setResultado(null); setError(null)
    cargarDocs()
  }

  // ── LISTA ──
  if (fase === 'lista') return (
    <div>
      {/* KPIs rápidos */}
      {!loadingDocs && docs.length > 0 && (() => {
        const totalGasto = docs.reduce((s, d) => s + (Number(d.total) || 0), 0)
        const conStock   = docs.filter(d => d.procesado_stock).length
        return (
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatCard value={docs.length}             label="Documentos"    />
            <StatCard value={`${totalGasto.toFixed(0)} €`} label="Gasto total" color={C.primary} />
            <StatCard value={conStock}                label="📦 Stock actualizados" color={C.ok} />
          </div>
        )
      })()}

      {/* Botón escanear */}
      <button
        onClick={() => { setFase('escaner'); camRef.current?.click() }}
        style={{
          width: '100%', background: `linear-gradient(135deg, ${C.primary}, ${C.brand})`,
          color: C.white, border: 'none', borderRadius: 14, padding: '18px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 16,
          boxShadow: '0 4px 18px rgba(79,70,229,.3)',
        }}>
        <span style={{ fontSize: 28 }}>📷</span>
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>Escanear documento</div>
          <div style={{ fontSize: 12, opacity: 0.8 }}>Factura · Albarán · Ticket — la IA lo registra</div>
        </div>
      </button>

      {/* También desde galería */}
      <button onClick={() => { setFase('escaner'); galRef.current?.click() }}
        style={{ width: '100%', background: C.white, border: `2px solid ${C.primary}`, color: C.primary,
          borderRadius: 11, padding: '11px 16px', fontSize: 14, fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit', marginBottom: 20 }}>
        🖼️ Subir desde galería / archivo
      </button>

      <input ref={camRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={e => e.target.files?.[0] && cargarImagen(e.target.files[0])} />
      <input ref={galRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={e => e.target.files?.[0] && cargarImagen(e.target.files[0])} />

      {/* Lista documentos */}
      {loadingDocs ? <Spinner /> : docs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '32px 16px', color: C.muted }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>📄</div>
          <div style={{ fontWeight: 600 }}>Sin documentos escaneados</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>Escanea tu primera factura o albarán</div>
        </div>
      ) : docs.map(doc => {
        const isOpen = expandId === doc.id
        const lineas: any[] = doc.lineas_json || []
        const apunte: any[] = doc.apunte_json || []
        return (
          <div key={doc.id} style={{
            background: C.white, border: `1px solid ${C.border}`, borderRadius: 12,
            marginBottom: 8, overflow: 'hidden',
          }}>
            {/* Cabecera */}
            <div onClick={() => setExpandId(isOpen ? null : doc.id)}
              style={{ padding: '12px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 26 }}>{TIPO_EMOJI[doc.tipo_doc] || '📄'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>
                  {doc.proveedor || doc.descripcion || doc.tipo_doc}
                </div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                  {doc.fecha_doc ? new Date(doc.fecha_doc).toLocaleDateString('es-ES') : 'Sin fecha'}
                  {doc.numero_doc ? ` · ${doc.numero_doc}` : ''}
                  {doc.categoria ? ` · ${doc.categoria}` : ''}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                {doc.total != null && (
                  <div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>
                    {Number(doc.total).toFixed(2)} €
                  </div>
                )}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', marginTop: 3 }}>
                  {doc.procesado_stock && (
                    <span style={{ fontSize: 10, background: C.okBg, color: C.ok, borderRadius: 6, padding: '2px 6px', fontWeight: 700 }}>📦</span>
                  )}
                  <span style={{ fontSize: 10, color: C.muted }}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>
            </div>

            {/* Detalle expandible */}
            {isOpen && (
              <div style={{ borderTop: `1px solid ${C.border}`, padding: '12px 14px' }}>
                {/* Líneas */}
                {lineas.length > 0 && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Líneas</div>
                    {lineas.map((l: any, i: number) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: `1px solid ${C.bg}` }}>
                        <span style={{ color: C.text }}>
                          {l.cantidad}× {l.descripcion}
                          {l.producto_id && <span style={{ marginLeft: 4, color: C.ok, fontWeight: 700 }}>✓</span>}
                        </span>
                        <span style={{ color: C.muted }}>{l.total_linea != null ? `${Number(l.total_linea).toFixed(2)} €` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Apunte PGC */}
                {apunte.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 6 }}>Apunte PGC</div>
                    {apunte.map((a: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: 8, fontSize: 12, padding: '3px 0' }}>
                        <span style={{ color: C.primary, fontWeight: 700, minWidth: 52 }}>{a.cuenta}</span>
                        <span style={{ flex: 1, color: '#374151' }}>{a.nombre}</span>
                        <span style={{ color: C.ok, minWidth: 52, textAlign: 'right' }}>{a.debe ? `D: ${a.debe}` : ''}</span>
                        <span style={{ color: C.red, minWidth: 52, textAlign: 'right' }}>{a.haber ? `H: ${a.haber}` : ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  // ── PREVIEW FOTO ──
  if (fase === 'escaner') return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {imgSrc ? (
        <>
          <div style={{ borderRadius: 13, overflow: 'hidden', boxShadow: '0 4px 14px rgba(0,0,0,.11)', background: C.white, maxHeight: 380, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src={imgSrc} alt="doc" style={{ width: '100%', maxHeight: 380, objectFit: 'contain' }} />
          </div>
          {error && <div style={{ background: C.redBg, border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 9, padding: '9px 13px', fontSize: 13 }}>{error}</div>}
          <button onClick={analizar}
            style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.brand})`, color: C.white, border: 'none', padding: '14px 24px', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(79,70,229,.28)' }}>
            ✨ Analizar con IA
          </button>
          <button onClick={reiniciar}
            style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', alignSelf: 'center' }}>
            Cancelar
          </button>
        </>
      ) : (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: C.muted }}>
          Selecciona una imagen…
          <br />
          <button onClick={reiniciar} style={{ marginTop: 12, background: 'none', border: 'none', color: C.primary, cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>Cancelar</button>
        </div>
      )}
      <input ref={camRef} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={e => e.target.files?.[0] && cargarImagen(e.target.files[0])} />
      <input ref={galRef} type="file" accept="image/*"
        style={{ display: 'none' }} onChange={e => e.target.files?.[0] && cargarImagen(e.target.files[0])} />
    </div>
  )

  // ── ANALIZANDO ──
  if (fase === 'analizando') return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 16px', gap: 20 }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', border: `4px solid ${C.light}`, borderTop: `4px solid ${C.primary}`, animation: 'giro .85s linear infinite' }} />
      <div style={{ fontWeight: 700, fontSize: 17 }}>Analizando con IA…</div>
      {[
        { t: 'Leyendo imagen',               done: true  },
        { t: 'Identificando tipo documento', done: false, active: true },
        { t: 'Extrayendo líneas e importes', done: false },
        { t: 'Mapeando productos en stock',  done: false },
        { t: 'Generando apunte PGC',         done: false },
      ].map((st, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center', width: '100%', maxWidth: 300 }}>
          <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700,
            background: st.done ? C.primary : st.active ? C.light : '#e5e7eb',
            border: st.active ? `2px solid ${C.primary}` : '2px solid transparent',
            color: st.done ? '#fff' : st.active ? C.primary : '#9ca3af' }}>
            {st.done ? '✓' : st.active ? '●' : ''}
          </div>
          <span style={{ fontSize: 14, color: st.done ? C.text : st.active ? C.primary : '#9ca3af', fontWeight: st.active ? 600 : 400 }}>{st.t}</span>
        </div>
      ))}
      <style>{`@keyframes giro { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── RESULTADO ──
  if (fase === 'resultado' && resultado) {
    const lineas: any[] = resultado.datos_ia?.lineas || []
    const apunte: any[] = resultado.apunte_json || resultado.apunte || []
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Tipo + total */}
        <div style={{ background: C.white, borderRadius: 13, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
            <span style={{ fontSize: 34 }}>{TIPO_EMOJI[resultado.tipo_doc] || '📄'}</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.primary }}>{((resultado.tipo_doc && resultado.tipo_doc !== 'pendiente' ? resultado.tipo_doc : 'documento') || 'doc').toUpperCase()} detectado</div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{resultado.descripcion || resultado.datos_ia?.descripcion_corta}</div>
              <div style={{ fontSize: 11, marginTop: 2 }}>
                Confianza: <span style={{ fontWeight: 700, color: CONFIANZA_COLOR[resultado.confianza] || C.muted }}>{resultado.confianza}</span>
              </div>
            </div>
          </div>
          {(resultado.total != null) && (
            <div style={{ fontWeight: 800, fontSize: 22, color: C.text }}>{Number(resultado.total).toFixed(2)} €</div>
          )}
        </div>

        {/* Datos IA */}
        <div style={{ background: C.white, borderRadius: 13, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
          <div style={{ fontWeight: 700, fontSize: 11, color: C.primary, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${C.light}`, paddingBottom: 7, marginBottom: 8 }}>Datos extraídos</div>
          {[
            ['Proveedor',        resultado.proveedor],
            ['Fecha',            resultado.fecha_doc || resultado.datos_ia?.fecha],
            ['Nº documento',     resultado.numero_doc || resultado.datos_ia?.numero_doc],
            ['Base imponible',   resultado.base_imponible != null ? `${Number(resultado.base_imponible).toFixed(2)} €` : null],
            [`IVA (${resultado.porcentaje_iva ?? resultado.datos_ia?.porcentaje_iva ?? '?'}%)`, resultado.cuota_iva != null ? `${Number(resultado.cuota_iva).toFixed(2)} €` : null],
          ].map(([lbl, val]: any) => val ? (
            <div key={lbl} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.bg}`, fontSize: 13 }}>
              <span style={{ color: C.muted, fontWeight: 600, fontSize: 12 }}>{lbl}</span>
              <span style={{ color: C.text, fontWeight: 600 }}>{val}</span>
            </div>
          ) : null)}
        </div>

        {/* Líneas */}
        {lineas.length > 0 && (
          <div style={{ background: C.white, borderRadius: 13, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: C.primary, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${C.light}`, paddingBottom: 7, marginBottom: 8 }}>Líneas detectadas</div>
            {lineas.map((l: any, i: number) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${C.bg}`, fontSize: 13 }}>
                <div>
                  <span style={{ fontWeight: 600 }}>{l.cantidad}× {l.descripcion}</span>
                  <div style={{ fontSize: 11, color: C.muted }}>{l.categoria} · {l.unidad}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  {l.total_linea != null && <div style={{ fontWeight: 700 }}>{Number(l.total_linea).toFixed(2)} €</div>}
                  {l.producto_id
                    ? <span style={{ fontSize: 10, background: C.okBg, color: C.ok, borderRadius: 5, padding: '1px 5px', fontWeight: 700 }}>📦 Stock ✓</span>
                    : <span style={{ fontSize: 10, color: C.muted }}>Sin match</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Apunte PGC */}
        {apunte.length > 0 && (
          <div style={{ background: C.white, borderRadius: 13, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,.06)' }}>
            <div style={{ fontWeight: 700, fontSize: 11, color: C.primary, textTransform: 'uppercase', letterSpacing: '.05em', borderBottom: `1px solid ${C.light}`, paddingBottom: 7, marginBottom: 8 }}>Apunte contable PGC</div>
            <div style={{ display: 'flex', fontWeight: 700, fontSize: 11, color: C.muted, textTransform: 'uppercase', padding: '0 0 4px' }}>
              <span style={{ flex: '0 0 56px' }}>Cuenta</span>
              <span style={{ flex: 1 }}>Descripción</span>
              <span style={{ width: 56, textAlign: 'right' }}>Debe</span>
              <span style={{ width: 56, textAlign: 'right' }}>Haber</span>
            </div>
            {apunte.map((a: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '5px 0', borderBottom: `1px solid ${C.bg}`, fontSize: 13 }}>
                <span style={{ flex: '0 0 56px', color: C.primary, fontWeight: 700 }}>{a.cuenta}</span>
                <span style={{ flex: 1, color: '#374151' }}>{a.nombre}</span>
                <span style={{ width: 56, textAlign: 'right', color: C.ok, fontWeight: a.debe ? 700 : 400 }}>{a.debe || '—'}</span>
                <span style={{ width: 56, textAlign: 'right', color: C.red, fontWeight: a.haber ? 700 : 400 }}>{a.haber || '—'}</span>
              </div>
            ))}
          </div>
        )}

        {/* Stock badge */}
        {resultado.stock_actualizado > 0 && (
          <div style={{ background: C.okBg, border: `1px solid #bbf7d0`, borderRadius: 12, padding: '12px 16px', fontSize: 14, color: C.ok, fontWeight: 700 }}>
            📦 {resultado.stock_actualizado} artículo(s) actualizados en stock automáticamente
          </div>
        )}

        {/* Confirmación guardado */}
        <div style={{ background: C.light, borderRadius: 12, padding: '12px 16px', fontSize: 13, color: C.brand }}>
          ✅ Guardado en contabilidad · ID <b>{resultado.doc_id?.slice(0, 8)}…</b>
        </div>

        <button onClick={reiniciar}
          style={{ background: `linear-gradient(135deg, ${C.primary}, ${C.brand})`, color: C.white, border: 'none', padding: '14px 24px', borderRadius: 11, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', boxShadow: '0 4px 12px rgba(79,70,229,.28)' }}>
          ✓ Volver a documentos
        </button>
        <button onClick={() => { setFase('escaner'); setImgSrc(null); setImgFile(null); setResultado(null) }}
          style={{ background: 'transparent', border: 'none', color: C.muted, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', alignSelf: 'center' }}>
          Escanear otro documento
        </button>
      </div>
    )
  }

  return null
}
