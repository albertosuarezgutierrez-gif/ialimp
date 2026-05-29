'use client'
import { useState, useEffect } from 'react'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff', bg: '#f1f5f9',
  text: '#1e1b4b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', warn: '#d97706', warnBg: '#fffbeb',
  red: '#dc2626', redBg: '#fef2f2', white: '#ffffff'
}

const SECCIONES = [
  { key: 'tipos_servicio_op',    label: 'Tipos de servicio',       emoji: '🔄', desc: 'Tipos de limpieza que ofrece tu empresa', conEmoji: true, conDesc: true  },
  { key: 'categorias_stock',     label: 'Categorías de stock',     emoji: '📦', desc: 'Cómo clasificas tus productos y materiales', conEmoji: true, conDesc: false },
  { key: 'unidades_stock',       label: 'Unidades de medida',      emoji: '📏', desc: 'Cómo se miden tus productos (kg, litros…)',   conEmoji: false, conDesc: false },
  { key: 'tipos_lenceria',       label: 'Tipos de lencería',       emoji: '🛏️', desc: 'Categorías de ropa de cama y baño',          conEmoji: true, conDesc: false },
  { key: 'tipos_cliente',        label: 'Tipos de cliente',        emoji: '🏠', desc: 'Segmentos de clientes que atiendes',          conEmoji: true, conDesc: false, conColor: true },
  { key: 'categorias_incidencia',label: 'Categorías de incidencia',emoji: '⚠️', desc: 'Tipos de problema que puede reportar una limpiadora', conEmoji: true, conDesc: false },
  { key: 'niveles_urgencia',     label: 'Niveles de urgencia',     emoji: '🚨', desc: 'Prioridades para incidencias',               conEmoji: false, conDesc: false, conColor: true },
  { key: 'estados_lead',         label: 'Estados del CRM',         emoji: '📊', desc: 'Fases del pipeline comercial',               conEmoji: false, conDesc: false, conColor: true },
  { key: 'tipos_expediente_rrhh',label: 'Tipos expediente RRHH',  emoji: '📋', desc: 'Categorías para el historial del personal',   conEmoji: true, conDesc: false },
]

function ItemEditor({ item, conEmoji, conDesc, conColor, onChange, onDelete }: any) {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: C.bg, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
      {conEmoji && (
        <input value={item.emoji || ''} onChange={e => onChange({ ...item, emoji: e.target.value })}
          style={{ width: 38, textAlign: 'center', fontSize: 18, border: `1px solid ${C.border}`, borderRadius: 6, padding: '4px 2px', fontFamily: 'inherit', background: C.white }} />
      )}
      <input value={item.label} onChange={e => onChange({ ...item, label: e.target.value })}
        placeholder="Nombre..." style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 13, fontFamily: 'inherit', background: C.white, color: C.text }} />
      {conDesc && (
        <input value={item.desc || ''} onChange={e => onChange({ ...item, desc: e.target.value })}
          placeholder="Descripción..." style={{ flex: 1, border: `1px solid ${C.border}`, borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', background: C.white, color: C.muted }} />
      )}
      {conColor && (
        <input type="color" value={item.color || '#6366f1'} onChange={e => onChange({ ...item, color: e.target.value })}
          style={{ width: 32, height: 32, border: `1px solid ${C.border}`, borderRadius: 6, cursor: 'pointer', padding: 2 }} />
      )}
      <button onClick={() => onChange({ ...item, activo: !item.activo })}
        style={{ padding: '4px 10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 700,
          background: item.activo !== false ? C.okBg : C.redBg, color: item.activo !== false ? C.ok : C.red }}>
        {item.activo !== false ? '✓ Activo' : '✗ Oculto'}
      </button>
      <button onClick={onDelete}
        style={{ padding: '4px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 14, background: C.redBg, color: C.red }}>
        ✕
      </button>
    </div>
  )
}

export default function CatalogosPage() {
  const [data, setData]       = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState<string | null>(null)
  const [saved, setSaved]     = useState<string | null>(null)
  const [seccion, setSeccion] = useState(SECCIONES[0].key)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/admin/catalogos')
    const d = await r.json()
    setData(d.catalogos || {})
    setLoading(false)
  }

  async function guardar(key: string) {
    setSaving(key)
    await fetch('/api/admin/catalogos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: data[key] })
    })
    setSaving(null)
    setSaved(key)
    setTimeout(() => setSaved(null), 2000)
  }

  function addItem(key: string, sec: any) {
    const newItem: any = { id: Date.now().toString(), label: '', activo: true }
    if (sec.conEmoji)  newItem.emoji = '📋'
    if (sec.conDesc)   newItem.desc  = ''
    if (sec.conColor)  newItem.color = '#6366f1'
    setData((d: any) => ({ ...d, [key]: [...(d[key] || []), newItem] }))
  }

  function updateItem(key: string, idx: number, item: any) {
    setData((d: any) => {
      const arr = [...(d[key] || [])]
      arr[idx] = item
      return { ...d, [key]: arr }
    })
  }

  function deleteItem(key: string, idx: number) {
    setData((d: any) => {
      const arr = [...(d[key] || [])]
      arr.splice(idx, 1)
      return { ...d, [key]: arr }
    })
  }

  const sec = SECCIONES.find(s => s.key === seccion)!

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <header style={{ background: C.primary, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: C.white, fontWeight: 800, fontSize: 20 }}>⚙️ Configuración — Catálogos</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12 }}>Personaliza todos los tipos, categorías y estados de tu empresa</p>
        </div>
      </header>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.muted }}>Cargando configuración…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 0, maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>

          {/* Sidebar secciones */}
          <div style={{ background: C.white, borderRadius: '12px 0 0 12px', border: `1px solid ${C.border}`, overflow: 'hidden' }}>
            {SECCIONES.map(s => (
              <button key={s.key} onClick={() => setSeccion(s.key)}
                style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', cursor: 'pointer', borderBottom: `1px solid ${C.border}`,
                  background: seccion === s.key ? C.light : C.white,
                  borderLeft: `3px solid ${seccion === s.key ? C.primary : 'transparent'}`,
                  fontFamily: 'inherit' }}>
                <div style={{ fontSize: 13, fontWeight: seccion === s.key ? 700 : 500, color: seccion === s.key ? C.primary : C.text }}>
                  {s.emoji} {s.label}
                </div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{(data[s.key] || []).filter((i: any) => i.activo !== false).length} activos</div>
              </button>
            ))}
          </div>

          {/* Panel edición */}
          <div style={{ background: C.white, borderRadius: '0 12px 12px 0', border: `1px solid ${C.border}`, borderLeft: 'none', padding: 24 }}>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontWeight: 800, fontSize: 18, color: C.text, margin: 0 }}>{sec.emoji} {sec.label}</h2>
              <p style={{ color: C.muted, fontSize: 13, margin: '4px 0 0' }}>{sec.desc}</p>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', gap: 6, fontSize: 11, color: C.muted, padding: '0 10px', marginBottom: 6 }}>
                {sec.conEmoji && <div style={{ width: 38 }}>Emoji</div>}
                <div style={{ flex: 1 }}>Nombre</div>
                {sec.conDesc && <div style={{ flex: 1 }}>Descripción</div>}
                {sec.conColor && <div style={{ width: 32 }}>Color</div>}
                <div style={{ width: 72 }}>Estado</div>
                <div style={{ width: 28 }}></div>
              </div>
              {(data[seccion] || []).map((item: any, idx: number) => (
                <ItemEditor key={item.id || idx} item={item}
                  conEmoji={sec.conEmoji} conDesc={sec.conDesc} conColor={sec.conColor}
                  onChange={(updated: any) => updateItem(seccion, idx, updated)}
                  onDelete={() => deleteItem(seccion, idx)} />
              ))}
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <button onClick={() => addItem(seccion, sec)}
                style={{ padding: '8px 16px', borderRadius: 8, border: `2px dashed ${C.brand}`, background: C.light, color: C.brand, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                + Añadir {sec.label.toLowerCase().replace(/s$/, '')}
              </button>
              <button onClick={() => guardar(seccion)} disabled={!!saving}
                style={{ padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                  background: saved === seccion ? C.ok : C.primary, color: C.white,
                  opacity: saving ? 0.7 : 1 }}>
                {saving === seccion ? 'Guardando…' : saved === seccion ? '✓ Guardado' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
