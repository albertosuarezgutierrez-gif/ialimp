'use client'
import { useState, useEffect } from 'react'

const C = {
  primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
  bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  ok: '#16a34a', okBg: '#f0fdf4', red: '#dc2626', redBg: '#fef2f2',
  warn: '#d97706', warnBg: '#fffbeb',
}

const MODULOS = [
  { id: 'sesiones',      label: 'Sesiones',     icon: '📋', desc: 'Ver y gestionar sesiones' },
  { id: 'limpiadora',    label: 'App Limpieza',  icon: '🧹', desc: 'Acceso a /l con PIN propio', destacado: true },
  { id: 'clientes',      label: 'Clientes',      icon: '🏠', desc: 'Clientes y propiedades' },
  { id: 'rrhh',          label: 'RRHH',          icon: '👥', desc: 'Equipo y calidad' },
  { id: 'lenceria',      label: 'Lencería',      icon: '🛏️', desc: 'Control de lencería' },
  { id: 'stock',         label: 'Stock',         icon: '🧴', desc: 'Productos y consumo' },
  { id: 'facturacion',   label: 'Facturación',   icon: '💶', desc: 'Facturas y cobros' },
  { id: 'informes',      label: 'Informes',      icon: '📊', desc: 'Estadísticas' },
  { id: 'agenda',        label: 'Agenda',        icon: '📅', desc: 'Planificación' },
  { id: 'configuracion', label: 'Configuración', icon: '⚙️', desc: 'Ajustes empresa' },
]

const EMPTY_FORM = {
  nombre: '', email: '', password: '', pin: '',
  modulos: [] as string[], activo: true,
}

export default function UsuariosPage() {
  const [usuarios, setUsuarios]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editando, setEditando]         = useState<any>(null)
  const [form, setForm]                 = useState({ ...EMPTY_FORM })
  const [saving, setSaving]             = useState(false)
  const [error, setError]               = useState('')
  const [confirmarDel, setConfirmarDel] = useState<any>(null)

  useEffect(() => { cargar() }, [])

  async function cargar() {
    setLoading(true)
    const r = await fetch('/api/admin/usuarios-empresa')
    const d = await r.json()
    setUsuarios(d.usuarios || [])
    setLoading(false)
  }

  function abrirNuevo() {
    setEditando(null)
    setForm({ ...EMPTY_FORM })
    setError('')
    setShowModal(true)
  }

  function abrirEditar(u: any) {
    setEditando(u)
    setForm({
      nombre: u.nombre, email: u.email, password: '', pin: '',
      modulos: u.modulos || [], activo: u.activo,
    })
    setError('')
    setShowModal(true)
  }

  function toggleModulo(id: string) {
    setForm(f => ({
      ...f,
      modulos: f.modulos.includes(id)
        ? f.modulos.filter(m => m !== id)
        : [...f.modulos, id],
      // Si se quita limpiadora, limpiar PIN
      ...(id === 'limpiadora' && f.modulos.includes(id) ? { pin: '' } : {})
    }))
  }

  const tieneModuloLimpiadora = form.modulos.includes('limpiadora')

  async function guardar() {
    setError('')

    // Validaciones
    if (!form.nombre.trim()) return setError('El nombre es obligatorio')
    if (!editando && !form.email.trim()) return setError('El email es obligatorio')
    if (!editando && !form.password.trim()) return setError('La contraseña es obligatoria')
    if (tieneModuloLimpiadora && !editando && !form.pin) return setError('El PIN es obligatorio para el módulo de limpieza')
    if (form.pin && (form.pin.length < 4 || !/^\d+$/.test(form.pin))) return setError('PIN: mínimo 4 dígitos numéricos')

    setSaving(true)
    try {
      const method = editando ? 'PATCH' : 'POST'
      const body = editando
        ? { id: editando.id, nombre: form.nombre, modulos: form.modulos, activo: form.activo,
            ...(form.password ? { password: form.password } : {}),
            ...(form.pin ? { pin: form.pin } : {}) }
        : { nombre: form.nombre, email: form.email, password: form.password,
            modulos: form.modulos, ...(form.pin ? { pin: form.pin } : {}) }

      const r = await fetch('/api/admin/usuarios-empresa', {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const d = await r.json()
      if (!d.ok) { setError(d.error || 'Error al guardar'); setSaving(false); return }
      await cargar()
      setShowModal(false)
    } catch { setError('Error de conexión') }
    setSaving(false)
  }

  async function eliminar(u: any) {
    const r = await fetch('/api/admin/usuarios-empresa', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: u.id }),
    })
    const d = await r.json()
    if (d.ok) { await cargar(); setConfirmarDel(null) }
  }

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <header style={{ background: C.primary, padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <a href="/dashboard" style={{ color: 'rgba(255,255,255,0.7)', fontSize: 13, textDecoration: 'none' }}>← Dashboard</a>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', fontWeight: 800, fontSize: 20, margin: 0 }}>Usuarios del panel</h1>
          <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, margin: 0 }}>
            {usuarios.length} usuario{usuarios.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={abrirNuevo}
          style={{ background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          + Nuevo usuario
        </button>
      </header>

      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>

        {/* Info */}
        <div style={{ background: C.light, border: `1px solid ${C.brand}30`, borderRadius: 12, padding: '14px 18px', marginBottom: 20, fontSize: 13, color: C.text, lineHeight: 1.6 }}>
          <strong>¿Cómo funciona?</strong> Crea un usuario por persona. Marca los módulos que puede ver.
          Si activas <strong>🧹 App Limpieza</strong>, esa persona también podrá entrar a <code>/l</code> con su PIN — sin necesidad de crear una limpiadora aparte.
        </div>

        {loading && <div style={{ textAlign: 'center', padding: 40, color: C.muted }}>Cargando...</div>}

        {!loading && usuarios.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', background: 'white', borderRadius: 14, border: `1px solid ${C.border}` }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <div style={{ fontWeight: 700, fontSize: 16, color: C.text, marginBottom: 6 }}>Sin usuarios todavía</div>
            <div style={{ fontSize: 13, color: C.muted, marginBottom: 20 }}>Crea el primer usuario para dar acceso al panel</div>
            <button onClick={abrirNuevo}
              style={{ background: C.primary, color: 'white', border: 'none', borderRadius: 10, padding: '10px 20px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
              + Crear primer usuario
            </button>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {usuarios.map((u: any) => (
            <div key={u.id} style={{
              background: 'white', borderRadius: 14, border: `1px solid ${C.border}`,
              padding: '16px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
              opacity: u.activo ? 1 : 0.55,
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: C.light, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                {(u.modulos || []).includes('limpiadora') ? '🧹' : '👤'}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: C.text }}>{u.nombre}</span>
                  {(u.modulos || []).includes('limpiadora') && (
                    <span style={{ fontSize: 11, fontWeight: 700, background: '#eef2ff', color: C.primary, borderRadius: 6, padding: '2px 8px' }}>
                      🧹 App Limpieza
                    </span>
                  )}
                  {!u.activo && <span style={{ fontSize: 11, color: C.muted, background: C.bg, borderRadius: 6, padding: '2px 8px' }}>Inactivo</span>}
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>{u.email}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {(u.modulos || []).filter((m: string) => m !== 'limpiadora').length === 0
                    ? <span style={{ fontSize: 11, color: C.muted }}>Solo app limpieza</span>
                    : (u.modulos || []).filter((m: string) => m !== 'limpiadora').map((m: string) => {
                        const mod = MODULOS.find(x => x.id === m)
                        return mod ? (
                          <span key={m} style={{ fontSize: 11, background: C.bg, borderRadius: 6, padding: '3px 8px', color: C.text }}>
                            {mod.icon} {mod.label}
                          </span>
                        ) : null
                      })
                  }
                </div>
                {u.ultimo_acceso && (
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                    Último acceso: {new Date(u.ultimo_acceso).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button onClick={() => abrirEditar(u)}
                  style={{ background: C.light, color: C.primary, border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => setConfirmarDel(u)}
                  style={{ background: C.redBg, color: C.red, border: 'none', borderRadius: 8, padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── MODAL ──────────────────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 50, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: '20px 20px 0 0', width: '100%', maxWidth: 520, maxHeight: '94vh', overflow: 'auto' }}>

            {/* Header modal */}
            <div style={{ background: C.primary, borderRadius: '20px 20px 0 0', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, position: 'sticky', top: 0, zIndex: 1 }}>
              <div style={{ flex: 1, color: 'white', fontWeight: 800, fontSize: 16 }}>
                {editando ? `Editar — ${editando.nombre}` : 'Nuevo usuario'}
              </div>
              <button onClick={() => setShowModal(false)}
                style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', width: 32, height: 32, borderRadius: 8, fontSize: 16, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ padding: '20px' }}>
              {error && (
                <div style={{ background: C.redBg, border: `1px solid #fca5a5`, borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: C.red }}>
                  ⚠️ {error}
                </div>
              )}

              {/* Nombre */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Nombre *</label>
                <input value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej. Carmen García"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              {/* Email — solo en creación */}
              {!editando && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email *</label>
                  <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    type="email" placeholder="carmen@empresa.com"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              )}

              {/* Contraseña */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {editando ? 'Nueva contraseña (vacío = no cambiar)' : 'Contraseña *'}
                </label>
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  type="password" placeholder={editando ? '••••••••' : 'Mínimo 8 caracteres'}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${C.border}`, fontSize: 14, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              {/* Módulos */}
              <div style={{ marginBottom: tieneModuloLimpiadora ? 0 : 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: C.muted, display: 'block', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Módulos con acceso
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                  {MODULOS.map(m => {
                    const activo = form.modulos.includes(m.id)
                    const esDest = m.id === 'limpiadora'
                    return (
                      <button key={m.id} type="button" onClick={() => toggleModulo(m.id)}
                        style={{
                          padding: '10px 12px', borderRadius: 10,
                          border: `2px solid ${activo ? C.primary : esDest ? C.brand + '55' : C.border}`,
                          background: activo ? C.light : esDest ? '#fafaff' : 'white',
                          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                          display: 'flex', alignItems: 'center', gap: 8,
                          gridColumn: esDest ? 'span 2' : undefined,
                        }}>
                        <span style={{ fontSize: 18 }}>{m.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: activo ? C.primary : C.text }}>{m.label}</div>
                          <div style={{ fontSize: 10, color: C.muted }}>{m.desc}</div>
                        </div>
                        {activo && <span style={{ color: C.primary, fontSize: 16, marginLeft: 'auto' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* PIN — solo si módulo limpiadora activo */}
              {tieneModuloLimpiadora && (
                <div style={{
                  margin: '14px 0 20px',
                  background: C.light, border: `2px solid ${C.primary}30`,
                  borderRadius: 12, padding: '16px'
                }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.primary, marginBottom: 4 }}>
                    🔑 PIN para la app de limpieza
                  </div>
                  <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
                    {editando
                      ? 'Deja vacío para mantener el PIN actual. El PIN debe ser único en toda la empresa.'
                      : 'Este PIN se usará para entrar a /l. Debe ser único en toda la empresa.'}
                  </div>
                  <input
                    value={form.pin}
                    onChange={e => setForm(f => ({ ...f, pin: e.target.value.replace(/\D/g, '') }))}
                    placeholder={editando ? 'Nuevo PIN (vacío = no cambiar)' : 'Ej. 5678'}
                    inputMode="numeric"
                    maxLength={8}
                    style={{
                      width: '100%', padding: '12px 14px', borderRadius: 10,
                      border: `1.5px solid ${C.primary}50`, fontSize: 22,
                      letterSpacing: '0.4em', textAlign: 'center',
                      fontFamily: 'monospace', fontWeight: 700,
                      color: C.primary, background: 'white', boxSizing: 'border-box'
                    }}
                  />
                  <div style={{ fontSize: 11, color: C.muted, marginTop: 8, textAlign: 'center' }}>
                    Mínimo 4 dígitos · Solo números
                  </div>
                </div>
              )}

              {/* Toggle activo — solo en edición */}
              {editando && (
                <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: C.bg, borderRadius: 10, padding: '12px 14px' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Usuario activo</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Si lo desactivas, no podrá entrar al panel ni a /l</div>
                  </div>
                  <button type="button" onClick={() => setForm(f => ({ ...f, activo: !f.activo }))}
                    style={{ width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', background: form.activo ? C.ok : C.border, transition: 'background 0.2s', position: 'relative', flexShrink: 0 }}>
                    <span style={{ position: 'absolute', top: 2, left: form.activo ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: 'white', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </button>
                </div>
              )}

              {/* Botones */}
              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" onClick={() => setShowModal(false)}
                  style={{ flex: 1, padding: '12px', background: 'white', border: `1px solid ${C.border}`, borderRadius: 10, fontSize: 14, color: C.muted, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                  Cancelar
                </button>
                <button type="button" onClick={guardar} disabled={saving}
                  style={{ flex: 2, padding: '12px', background: saving ? C.muted : C.primary, border: 'none', borderRadius: 10, fontSize: 14, color: 'white', cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                  {saving ? 'Guardando...' : editando ? '💾 Guardar cambios' : '✅ Crear usuario'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmar eliminar */}
      {confirmarDel && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 16, padding: 24, maxWidth: 340, width: '100%' }}>
            <div style={{ fontSize: 32, textAlign: 'center', marginBottom: 12 }}>🗑️</div>
            <div style={{ fontWeight: 700, fontSize: 16, textAlign: 'center', marginBottom: 8 }}>¿Eliminar a {confirmarDel.nombre}?</div>
            <div style={{ fontSize: 13, color: C.muted, textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
              Esta acción no se puede deshacer. Perderá acceso al panel y a la app de limpieza.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmarDel(null)}
                style={{ flex: 1, padding: '10px', background: C.bg, border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                Cancelar
              </button>
              <button onClick={() => eliminar(confirmarDel)}
                style={{ flex: 1, padding: '10px', background: C.red, color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
