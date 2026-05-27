'use client'
import { useState } from 'react'

const C = { primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff', bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0', ok: '#16a34a', okBg: '#f0fdf4' }

const SERVICIOS = [
  { id: 'rotacion',     label: 'Cambio de huéspedes (turístico)', base: 25, por_m2: 0.12 },
  { id: 'particular',   label: 'Limpieza de casa / piso',          base: 30, por_m2: 0.10 },
  { id: 'comunidad',    label: 'Comunidad de vecinos',              base: 80, por_m2: 0.08 },
  { id: 'oficina',      label: 'Oficina / local comercial',         base: 40, por_m2: 0.09 },
]

const FRECUENCIAS = [
  { id: 'puntual',   label: 'Puntual',       mult: 1.2  },
  { id: 'semanal',   label: 'Semanal',       mult: 1.0  },
  { id: 'quincenal', label: 'Quincenal',     mult: 1.05 },
  { id: 'mensual',   label: 'Mensual',       mult: 1.1  },
]

export default function CotizadorPage() {
  const [paso, setPaso]   = useState(0)
  const [form, setForm]   = useState({ tipo: '', m2: '', frecuencia: '', nombre: '', telefono: '', email: '' })
  const [enviado, setEnv] = useState(false)
  const [loading, setL]   = useState(false)

  const servicio   = SERVICIOS.find(s => s.id === form.tipo)
  const frecuencia = FRECUENCIAS.find(f => f.id === form.frecuencia)
  const precio     = servicio && form.m2 ? Math.round((servicio.base + Number(form.m2) * servicio.por_m2) * (frecuencia?.mult || 1)) : null

  async function enviar() {
    setL(true)
    await fetch('/api/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: form.nombre, telefono: form.telefono, email: form.email,
        zona: 'Sevilla', tipo_servicio: form.tipo, m2: Number(form.m2),
        frecuencia: form.frecuencia, precio_estimado: precio
      })
    })
    setEnv(true); setL(false)
  }

  if (enviado) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
        <h2 style={{ fontWeight: 800, fontSize: 24, color: C.text, marginBottom: 8 }}>¡Presupuesto solicitado!</h2>
        <p style={{ color: C.muted, fontSize: 15 }}>Te contactamos en menos de 24h. Precio estimado: <strong>{precio}€</strong></p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ background: C.primary, padding: '20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 6 }}>🧹</div>
        <h1 style={{ color: 'white', fontWeight: 800, fontSize: 22, letterSpacing: '-0.02em' }}>Calcula tu presupuesto</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 4 }}>Gratis y sin compromiso</p>
      </div>

      <div style={{ maxWidth: 520, margin: '0 auto', padding: '24px 16px' }}>

        {/* TIPO */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>¿Qué tipo de limpieza necesitas?</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {SERVICIOS.map(s => (
              <button key={s.id} onClick={() => setForm(f => ({ ...f, tipo: s.id }))}
                style={{ padding: '12px', borderRadius: 10, border: `2px solid ${form.tipo === s.id ? C.primary : C.border}`, background: form.tipo === s.id ? C.light : 'white', color: form.tipo === s.id ? C.primary : C.text, fontSize: 12, fontWeight: form.tipo === s.id ? 700 : 500, cursor: 'pointer', textAlign: 'left', lineHeight: 1.4, fontFamily: 'inherit' }}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* M2 */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>¿Cuántos m²?</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[50,80,100,150].map(v => (
              <button key={v} onClick={() => setForm(f => ({ ...f, m2: String(v) }))}
                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `2px solid ${form.m2 === String(v) ? C.primary : C.border}`, background: form.m2 === String(v) ? C.light : 'white', color: form.m2 === String(v) ? C.primary : C.muted, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {v}m²
              </button>
            ))}
            <input type="number" value={form.m2} onChange={e => setForm(f => ({ ...f, m2: e.target.value }))} placeholder="Otro"
              style={{ width: 70, padding: '10px 8px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', textAlign: 'center', fontFamily: 'inherit' }} />
          </div>
        </div>

        {/* FRECUENCIA */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>¿Con qué frecuencia?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {FRECUENCIAS.map(f => (
              <button key={f.id} onClick={() => setForm(p => ({ ...p, frecuencia: f.id }))}
                style={{ padding: '8px 14px', borderRadius: 8, border: `2px solid ${form.frecuencia === f.id ? C.primary : C.border}`, background: form.frecuencia === f.id ? C.light : 'white', color: form.frecuencia === f.id ? C.primary : C.muted, fontSize: 12, fontWeight: form.frecuencia === f.id ? 700 : 500, cursor: 'pointer', fontFamily: 'inherit' }}>
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* PRECIO */}
        {precio && (
          <div style={{ background: C.primary, borderRadius: 14, padding: '18px 20px', marginBottom: 20, textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>Precio estimado</div>
            <div style={{ color: 'white', fontSize: 42, fontWeight: 800, letterSpacing: '-0.03em' }}>{precio}€</div>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>por limpieza · sin IVA · sin compromiso</div>
          </div>
        )}

        {/* CONTACTO */}
        <div style={{ background: 'white', borderRadius: 12, border: `1px solid ${C.border}`, padding: '18px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.text, marginBottom: 12 }}>Déjanos tus datos y te llamamos</div>
          {[
            { k: 'nombre',   label: 'Nombre *',   ph: 'Tu nombre', type: 'text' },
            { k: 'telefono', label: 'Teléfono *',  ph: '6xx xxx xxx', type: 'tel' },
            { k: 'email',    label: 'Email',        ph: 'tu@email.com', type: 'email' },
          ].map(f => (
            <div key={f.k} style={{ marginBottom: 10 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: C.muted, marginBottom: 4 }}>{f.label}</label>
              <input type={f.type} value={(form as any)[f.k]} onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                placeholder={f.ph}
                style={{ width: '100%', padding: '10px 12px', border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 13, outline: 'none', fontFamily: 'inherit' }} />
            </div>
          ))}
          <button onClick={enviar} disabled={loading || !form.nombre || !form.telefono || !form.tipo}
            style={{ width: '100%', padding: 13, background: C.primary, color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: 'pointer', marginTop: 4, opacity: (!form.nombre || !form.telefono || !form.tipo) ? 0.5 : 1, fontFamily: 'inherit' }}>
            {loading ? 'Enviando...' : '📩 Solicitar presupuesto gratis'}
          </button>
        </div>
      </div>
    </div>
  )
}
