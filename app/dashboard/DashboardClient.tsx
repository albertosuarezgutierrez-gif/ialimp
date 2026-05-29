'use client'
import { useState, useEffect } from 'react'
import NuevaLimpiezaModal from '@/components/NuevaLimpiezaModal'
import AlertasBadge from '@/components/AlertasBadge'

interface Props {
  empresa: any
  sesionesIniciales: any[]
  conexiones: any[]
  clientes: any[]
  limpiadoras: any[]
  today: string
}

const TIPO_COLOR: Record<string,string> = {
  rotacion:'#4f46e5', profunda:'#0ea5e9', comunidad:'#10b981',
  obra:'#f59e0b', mantenimiento:'#64748b',
}
const TIPO_ICON: Record<string,string> = {
  rotacion:'🔄', profunda:'🧽', comunidad:'🏢', obra:'🏗️', mantenimiento:'🔧',
}

const NAV = [
  { href:'/dashboard',       icon:'🏠', label:'Inicio'    },
  { href:'/admin/clientes',  icon:'👥', label:'Clientes'  },
  { href:'/admin/crm',       icon:'📅', label:'Agenda'    },
  { href:'/admin/rrhh',      icon:'👤', label:'RRHH'      },
  { href:'/admin/stock',     icon:'📦', label:'Stock'     },
  { href:'/admin/lenceria',  icon:'🛏️', label:'Lencería'  },
  { href:'/admin/facturas',  icon:'🧾', label:'Facturas'  },
  { href:'/admin/informes',  icon:'📊', label:'Informes'  },
  { href:'/admin/ia',        icon:'🤖', label:'IA'        },
  { href:'/admin/usuarios',  icon:'🔐', label:'Usuarios'  },
  { href:'/admin/cotizador', icon:'💰', label:'Cotizador' },
]

export default function DashboardClient({
  empresa, sesionesIniciales, conexiones, clientes, limpiadoras, today
}: Props) {
  const [sesiones,    setSesiones]   = useState<any[]>(sesionesIniciales)
  const [tab,         setTab]        = useState<'hoy'|'pms'>('hoy')
  const [showNueva,   setShowNueva]  = useState(false)
  const [fecha,       setFecha]      = useState(today)
  const [sideOpen,    setSideOpen]   = useState(false)   // móvil: drawer lateral
  const [sideCollapsed, setSideCollapsed] = useState(false) // desktop: sidebar mini
  const [briefing, setBriefing]   = useState<string|null>(null)
  const [briefingKpis, setBriefingKpis] = useState<any>(null)
  const [loadingBriefing, setLoadingBriefing] = useState(false)

  const pendientes  = sesiones.filter(s => !s.started_at)
  const enCurso     = sesiones.filter(s => s.started_at && !s.completed_at)
  const completadas = sesiones.filter(s => s.completed_at)

  async function cargarBriefing() {
    setLoadingBriefing(true)
    try {
      const r = await fetch('/api/admin/ia/briefing')
      const d = await r.json()
      if (d.ok) {
        setBriefing(d.resumen)
        setBriefingKpis(d.kpis)
      }
    } finally {
      setLoadingBriefing(false)
    }
  }

  async function cambiarFecha(f: string) {
    setFecha(f)
    const res  = await fetch('/api/admin/sesiones?date=' + f)
    const data = await res.json()
    setSesiones(data.sesiones || [])
  }

  function onSesionCreada(sesion: any) {
    if (sesion.session_date === fecha)
      setSesiones(s => [...s, { ...sesion, limpiadora_nombre: null, cliente_nombre: null }])
  }

  async function eliminarSesion(id: string) {
    if (!confirm('¿Eliminar esta limpieza?')) return
    const res = await fetch('/api/admin/sesiones/' + id, { method: 'DELETE' })
    if (res.ok) setSesiones(s => s.filter(x => x.id !== id))
    else { const d = await res.json(); alert(d.error || 'Error') }
  }

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/login'
  }

  // Cerrar drawer al hacer resize a desktop
  useEffect(() => {
    const fn = () => { if (window.innerWidth >= 1024) setSideOpen(false) }
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  /* ───── helpers de estado ───── */
  const statusCls = (s: any) =>
    s.completed_at ? 'ia-pill ia-pill-green' :
    s.started_at   ? 'ia-pill ia-pill-indigo' :
                     'ia-pill ia-pill-gray'
  const statusLbl = (s: any) =>
    s.completed_at ? '✓ Hecha' : s.started_at ? '⟳ En curso' : '○ Pendiente'

  /* ───── sidebar content ───── */
  const SidebarContent = ({ collapsed }: { collapsed?: boolean }) => (
    <div style={{
      display:'flex', flexDirection:'column', height:'100%',
      fontFamily:"'Plus Jakarta Sans',sans-serif",
    }}>
      {/* Logo */}
      <div style={{
        padding: collapsed ? '20px 0' : '20px 20px 18px',
        borderBottom:'1px solid rgba(255,255,255,.08)',
        marginBottom:12, textAlign: collapsed ? 'center' : 'left',
      }}>
        <div style={{
          fontFamily:"'Syne',sans-serif", fontSize: collapsed ? 18 : 20,
          fontWeight:800, color:'white', letterSpacing:'-.01em',
        }}>
          {collapsed ? 'ia' : 'ialimp'}
        </div>
        {!collapsed && (
          <>
            <div style={{fontSize:10,color:'rgba(255,255,255,.35)',letterSpacing:'.1em',textTransform:'uppercase',marginTop:2}}>
              Gestión limpieza
            </div>
            <div style={{fontSize:11,color:'#818cf8',fontWeight:600,marginTop:6}}>
              {empresa.nombre}
            </div>
          </>
        )}
      </div>

      {/* Nav */}
      <nav style={{flex:1,overflowY:'auto',padding:'0 8px'}}>
        {!collapsed && (
          <div style={{fontSize:9,color:'rgba(255,255,255,.25)',letterSpacing:'.12em',textTransform:'uppercase',padding:'0 10px',marginBottom:4}}>
            Módulos
          </div>
        )}
        {NAV.map(item => (
          <a key={item.href} href={item.href} style={{
            display:'flex', alignItems:'center',
            gap: collapsed ? 0 : 10,
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '10px 0' : '9px 10px',
            borderRadius:10, color:'rgba(255,255,255,.5)',
            fontSize:13, fontWeight:500, textDecoration:'none',
            marginBottom:1, transition:'all .15s',
          }}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.background='rgba(255,255,255,.07)';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.9)'}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.background='transparent';(e.currentTarget as HTMLElement).style.color='rgba(255,255,255,.5)'}}>
            <div style={{
              width:28,height:28,borderRadius:8,
              background:'rgba(255,255,255,.08)',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:14,flexShrink:0,
            }}>
              {item.icon}
            </div>
            {!collapsed && <span>{item.label}</span>}
          </a>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: collapsed ? '14px 0' : '14px 16px',
        borderTop:'1px solid rgba(255,255,255,.08)',
        display:'flex', alignItems:'center',
        justifyContent: collapsed ? 'center' : 'space-between',
        gap:8,
      }}>
        {!collapsed && (
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <div style={{
              width:30,height:30,borderRadius:9,background:'#4f46e5',
              display:'flex',alignItems:'center',justifyContent:'center',
              fontSize:13,fontWeight:800,color:'white',flexShrink:0,
            }}>
              {empresa.nombre?.[0] || 'E'}
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'rgba(255,255,255,.75)'}}>
                {empresa.nombre}
              </div>
              <div style={{fontSize:9,color:'rgba(255,255,255,.3)'}}>
                {empresa.plan || 'starter'}
              </div>
            </div>
          </div>
        )}
        <button onClick={logout} title="Cerrar sesión" style={{
          background:'rgba(255,255,255,.07)',border:'none',borderRadius:8,
          width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',
          cursor:'pointer',fontSize:14,color:'rgba(255,255,255,.5)',flexShrink:0,
          transition:'background .15s',
        }}
        onMouseEnter={e=>(e.currentTarget.style.background='rgba(239,68,68,.2)')}
        onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')}>
          🚪
        </button>
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Syne:wght@800&display=swap');

        .dash-root {
          min-height: 100dvh;
          background: #f1f5f9;
          font-family: 'Plus Jakarta Sans', -apple-system, sans-serif;
          display: flex;
        }

        /* ── Sidebar desktop ── */
        .dash-sidebar {
          width: 220px;
          background: #0f172a;
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          position: sticky;
          top: 0;
          height: 100dvh;
          overflow: hidden;
          transition: width .2s ease;
          z-index: 20;
        }
        .dash-sidebar.collapsed { width: 56px; }

        /* tablet: ocultar sidebar, usar drawer */
        @media (max-width: 1023px) {
          .dash-sidebar { display: none; }
          .dash-sidebar.mobile-open {
            display: flex;
            position: fixed;
            left: 0; top: 0;
            width: 240px;
            height: 100dvh;
            z-index: 100;
            box-shadow: 4px 0 32px rgba(0,0,0,.3);
          }
        }

        /* ── Overlay móvil ── */
        .dash-overlay {
          display: none;
          position: fixed; inset: 0;
          background: rgba(0,0,0,.5);
          z-index: 99;
          backdrop-filter: blur(2px);
        }
        @media (max-width: 1023px) {
          .dash-overlay.active { display: block; }
        }

        /* ── Main ── */
        .dash-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }

        /* ── Topbar ── */
        .dash-topbar {
          background: white;
          border-bottom: 1px solid #e2e8f0;
          padding: 12px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .dash-topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; }

        .dash-hamburger {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: white;
          display: none; align-items: center; justify-content: center;
          font-size: 18px; cursor: pointer; flex-shrink: 0;
        }
        @media (max-width: 1023px) { .dash-hamburger { display: flex; } }

        .dash-collapse-btn {
          width: 28px; height: 28px; border-radius: 8px;
          border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.07);
          color: rgba(255,255,255,.5); font-size: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: background .15s;
          position: absolute; bottom: 60px; right: -14px;
          box-shadow: 0 2px 8px rgba(0,0,0,.3);
          background: #1e293b; border: 1px solid #334155;
          color: rgba(255,255,255,.6); border-radius: 50%;
          width: 26px; height: 26px;
        }
        @media (max-width: 1023px) { .dash-collapse-btn { display: none; } }

        .topbar-title {
          font-family: 'Syne', sans-serif;
          font-size: clamp(15px, 3vw, 18px);
          font-weight: 800;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .topbar-date { font-size: 12px; color: #64748b; display: none; }
        @media (min-width: 640px) { .topbar-date { display: block; } }

        .topbar-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .bell-btn {
          width: 36px; height: 36px; border-radius: 10px;
          border: 1px solid #e2e8f0; background: white;
          font-size: 16px; cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          position: relative;
        }

        .add-btn {
          background: #4f46e5; color: white; border: none;
          border-radius: 10px; padding: 8px 14px;
          font-family: inherit; font-size: 13px; font-weight: 700;
          cursor: pointer; white-space: nowrap;
          box-shadow: 0 3px 10px rgba(79,70,229,.3);
          display: flex; align-items: center; gap: 6px;
          transition: all .15s;
        }
        .add-btn:hover { background: #3730a3; transform: translateY(-1px); }
        .add-btn-label { display: none; }
        @media (min-width: 480px) { .add-btn-label { display: inline; } }

        /* ── Content ── */
        .dash-content { padding: clamp(14px, 3vw, 24px); flex: 1; }

        /* ── KPI grid ── */
        .kpi-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: clamp(8px, 2vw, 14px);
          margin-bottom: clamp(14px, 3vw, 20px);
        }
        .kpi-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: clamp(12px, 2.5vw, 18px) clamp(14px, 3vw, 20px);
          box-shadow: 0 1px 3px rgba(15,23,42,.06);
          text-align: center;
        }
        .kpi-num {
          font-family: 'Syne', sans-serif;
          font-size: clamp(26px, 5vw, 34px);
          font-weight: 800;
          line-height: 1;
        }
        .kpi-lbl { font-size: clamp(10px, 1.5vw, 12px); color: #64748b; margin-top: 4px; font-weight: 600; }

        /* ── Date picker + button row ── */
        .date-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
          flex-wrap: wrap;
        }
        .date-input {
          flex: 1;
          min-width: 140px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          padding: 9px 12px;
          font-family: inherit;
          font-size: 13px;
          background: white;
          outline: none;
          color: #0f172a;
          transition: border-color .15s;
        }
        .date-input:focus { border-color: #818cf8; }

        /* ── Tabs ── */
        .tabs { display: flex; gap: 0; border-bottom: 1px solid #e2e8f0; margin-bottom: 16px; }
        .tab-btn {
          padding: 10px 16px; border: none; background: transparent;
          border-bottom: 2px solid transparent; margin-bottom: -1px;
          font-family: inherit; font-size: 13px; font-weight: 600;
          color: #94a3b8; cursor: pointer; transition: all .15s;
          display: flex; align-items: center; gap: 6px;
        }
        .tab-btn.active { border-bottom-color: #4f46e5; color: #4f46e5; font-weight: 700; }
        .tab-count {
          background: #eef2ff; color: #4f46e5;
          font-size: 10px; font-weight: 800;
          padding: 1px 6px; border-radius: 20px;
        }

        /* ── Session card ── */
        .ses-card {
          background: white;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
          border-left: 4px solid transparent;
          box-shadow: 0 1px 3px rgba(15,23,42,.06);
          padding: clamp(12px, 3vw, 16px);
          margin-bottom: 10px;
          transition: box-shadow .15s, transform .15s;
          cursor: default;
        }
        .ses-card:hover { box-shadow: 0 4px 16px rgba(15,23,42,.1); transform: translateY(-1px); }

        .ses-row { display: flex; align-items: flex-start; gap: 10px; }
        .ses-icon {
          width: 42px; height: 42px; border-radius: 11px;
          flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 20px;
          background: #eef2ff;
        }
        .ses-title { font-size: clamp(13px, 2.5vw, 15px); font-weight: 700; color: #0f172a; margin-bottom: 2px; }
        .ses-sub   { font-size: 11px; color: #64748b; margin-bottom: 6px; }
        .ses-chips { display: flex; flex-wrap: wrap; gap: 5px; }
        .ses-chip  {
          display: inline-flex; align-items: center; gap: 3px;
          padding: 3px 8px; border-radius: 20px;
          font-size: 11px; font-weight: 600;
        }

        /* ── PMS card ── */
        .pms-card {
          background: white; border: 1px solid #e2e8f0; border-radius: 12px;
          padding: 14px 16px; margin-bottom: 8px;
          display: flex; align-items: center; justify-content: space-between;
          box-shadow: 0 1px 3px rgba(15,23,42,.06);
        }

        /* ── Bottom nav móvil ── */
        .bottom-nav {
          display: none;
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: white;
          border-top: 1px solid #e2e8f0;
          padding: 8px 0 env(safe-area-inset-bottom, 8px);
          z-index: 50;
          box-shadow: 0 -4px 20px rgba(15,23,42,.1);
        }
        .bottom-nav-inner {
          display: flex;
          justify-content: space-around;
          align-items: center;
          max-width: 480px;
          margin: 0 auto;
        }
        .bottom-nav-item {
          display: flex; flex-direction: column; align-items: center; gap: 2px;
          padding: 4px 8px; border-radius: 10px; border: none; background: transparent;
          cursor: pointer; color: #94a3b8; font-family: inherit; transition: color .15s;
          min-width: 48px;
        }
        .bottom-nav-item.active { color: #4f46e5; }
        .bottom-nav-item span:first-child { font-size: 20px; }
        .bottom-nav-item span:last-child  { font-size: 9px; font-weight: 700; letter-spacing: .02em; }

        @media (max-width: 767px) {
          .bottom-nav { display: block; }
          .dash-content { padding-bottom: 80px; }
        }
      `}</style>

      <div className="dash-root">

        {/* ── Overlay móvil ── */}
        <div
          className={`dash-overlay ${sideOpen ? 'active' : ''}`}
          onClick={() => setSideOpen(false)}
        />

        {/* ── Sidebar ── */}
        <div className={`dash-sidebar ${sideCollapsed ? 'collapsed' : ''} ${sideOpen ? 'mobile-open' : ''}`}
          style={{ position: 'relative' }}>
          <SidebarContent collapsed={sideCollapsed} />
          {/* Botón collapse desktop */}
          <button
            className="dash-collapse-btn"
            onClick={() => setSideCollapsed(v => !v)}
            title={sideCollapsed ? 'Expandir' : 'Colapsar'}
          >
            {sideCollapsed ? '›' : '‹'}
          </button>
        </div>

        {/* ── Main ── */}
        <div className="dash-main">

          {/* Topbar */}
          <div className="dash-topbar">
            <div className="dash-topbar-left">
              <button className="dash-hamburger" onClick={() => setSideOpen(v => !v)}>☰</button>
              <div>
                <div className="topbar-title">Dashboard</div>
                <div className="topbar-date">{empresa.nombre}</div>
              </div>
            </div>
            <div className="topbar-actions">
              <AlertasBadge />
              <button className="add-btn" onClick={() => setShowNueva(true)}>
                ＋<span className="add-btn-label">Nueva limpieza</span>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="dash-content">

            {/* Widget Briefing IA */}
            <div style={{
              background: briefing ? '#eef2ff' : 'white',
              border: '1px solid #c7d2fe',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
              boxShadow: '0 1px 3px rgba(79,70,229,0.08)'
            }}>
              <div style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>🤖</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                {briefing ? (
                  <>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#4f46e5', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      Briefing del día ✨
                    </div>
                    <p style={{ fontSize: 13, color: '#1e1b4b', lineHeight: 1.6, margin: 0 }}>{briefing}</p>
                    {briefingKpis && (
                      <div style={{ display: 'flex', gap: 12, marginTop: 8, flexWrap: 'wrap' }}>
                        {briefingKpis.alertas_pendientes > 0 && (
                          <span style={{ fontSize: 11, color: '#d97706', fontWeight: 600 }}>⚠️ {briefingKpis.alertas_pendientes} alertas</span>
                        )}
                        {briefingKpis.quejas_pendientes > 0 && (
                          <span style={{ fontSize: 11, color: '#dc2626', fontWeight: 600 }}>🔴 {briefingKpis.quejas_pendientes} quejas</span>
                        )}
                        {briefingKpis.productos_bajo_stock > 0 && (
                          <span style={{ fontSize: 11, color: '#ea580c', fontWeight: 600 }}>📦 {briefingKpis.productos_bajo_stock} stock bajo</span>
                        )}
                        {briefingKpis.sesiones_hoy_sin > 0 && (
                          <span style={{ fontSize: 11, color: '#7c3aed', fontWeight: 600 }}>⚡ {briefingKpis.sesiones_hoy_sin} sin asignar</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1e1b4b' }}>Briefing diario con IA</div>
                      <div style={{ fontSize: 11, color: '#64748b' }}>Resumen del estado del equipo y operaciones</div>
                    </div>
                    <button
                      onClick={cargarBriefing}
                      disabled={loadingBriefing}
                      style={{
                        marginLeft: 'auto', flexShrink: 0,
                        padding: '7px 14px', borderRadius: 8, border: 'none',
                        background: loadingBriefing ? '#e2e8f0' : '#4f46e5',
                        color: loadingBriefing ? '#94a3b8' : 'white',
                        fontSize: 12, fontWeight: 700,
                        cursor: loadingBriefing ? 'not-allowed' : 'pointer'
                      }}>
                      {loadingBriefing ? '⏳ Generando...' : '✨ Generar'}
                    </button>
                  </div>
                )}
                {briefing && (
                  <button
                    onClick={cargarBriefing}
                    disabled={loadingBriefing}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: '#6366f1', fontSize: 11, fontWeight: 600, cursor: 'pointer', padding: 0 }}>
                    {loadingBriefing ? '⏳ Actualizando...' : '🔄 Actualizar'}
                  </button>
                )}
              </div>
            </div>

            {/* KPIs */}
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-num" style={{ color:'#f59e0b' }}>{pendientes.length}</div>
                <div className="kpi-lbl">Pendientes</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-num" style={{ color:'#4f46e5' }}>{enCurso.length}</div>
                <div className="kpi-lbl">En curso</div>
              </div>
              <div className="kpi-card">
                <div className="kpi-num" style={{ color:'#10b981' }}>{completadas.length}</div>
                <div className="kpi-lbl">Hechas</div>
              </div>
            </div>

            {/* Fecha + botón */}
            <div className="date-row">
              <input
                type="date"
                value={fecha}
                onChange={e => cambiarFecha(e.target.value)}
                className="date-input"
              />
            </div>

            {/* Tabs */}
            <div className="tabs">
              {(['hoy','pms'] as const).map(t => (
                <button key={t} className={`tab-btn ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                  {t === 'hoy' ? 'Limpiezas' : 'PMS'}
                  {t === 'hoy' && sesiones.length > 0 && (
                    <span className="tab-count">{sesiones.length}</span>
                  )}
                </button>
              ))}
            </div>

            {/* ── TAB LIMPIEZAS ── */}
            {tab === 'hoy' && (
              <>
                {sesiones.length === 0 && (
                  <div style={{ textAlign:'center', padding:'48px 16px', color:'#94a3b8' }}>
                    <div style={{ fontSize:40, marginBottom:12 }}>🧹</div>
                    <div style={{ fontWeight:700, color:'#334155', marginBottom:4 }}>Sin limpiezas para este día</div>
                    <button onClick={() => setShowNueva(true)}
                      style={{ marginTop:8, color:'#4f46e5', background:'none', border:'none', cursor:'pointer', fontSize:13, fontWeight:700 }}>
                      + Añadir limpieza manualmente
                    </button>
                  </div>
                )}
                {sesiones.map(s => {
                  const color  = TIPO_COLOR[s.tipo_servicio] || '#4f46e5'
                  const icon   = TIPO_ICON[s.tipo_servicio]  || '🧹'
                  const manual = s.origen === 'manual'
                  return (
                    <div key={s.id} className="ses-card" style={{ borderLeftColor: color }}>
                      <div className="ses-row">
                        <div className="ses-icon" style={{ background: color + '18' }}>{icon}</div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div className="ses-title">{s.property_name}</div>
                          {s.cliente_nombre && (
                            <div className="ses-sub">👥 {s.cliente_nombre}</div>
                          )}
                          <div className="ses-chips">
                            {s.limpiadora_nombre && (
                              <span className="ses-chip" style={{ background:'#f1f5f9', color:'#334155' }}>
                                👤 {s.limpiadora_nombre}
                              </span>
                            )}
                            {s.hora_inicio && (
                              <span className="ses-chip" style={{ background:'#eef2ff', color:'#4f46e5' }}>
                                🕐 {typeof s.hora_inicio === 'string' ? s.hora_inicio.slice(0,5) : s.hora_inicio}
                              </span>
                            )}
                            {manual && (
                              <span className="ses-chip" style={{ background:'#f5f3ff', color:'#7c3aed' }}>manual</span>
                            )}
                          </div>
                        </div>
                        <div style={{ flexShrink:0, display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6 }}>
                          <span className={statusCls(s)}>{statusLbl(s)}</span>
                          {manual && !s.started_at && (
                            <button onClick={() => eliminarSesion(s.id)}
                              style={{ fontSize:11, color:'#ef4444', background:'none', border:'none', cursor:'pointer' }}>
                              Eliminar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {/* ── TAB PMS ── */}
            {tab === 'pms' && (
              <>
                <a href="/pms/nuevo"
                  style={{ display:'block', background:'#4f46e5', color:'white', textAlign:'center',
                    fontWeight:700, padding:'12px', borderRadius:12, textDecoration:'none',
                    marginBottom:12, fontSize:14, boxShadow:'0 3px 10px rgba(79,70,229,.3)' }}>
                  + Conectar nuevo PMS
                </a>
                {conexiones.length === 0 && (
                  <p style={{ textAlign:'center', color:'#94a3b8', padding:'32px 0', fontSize:13 }}>
                    Sin conexiones PMS configuradas.
                  </p>
                )}
                {conexiones.map((c: any) => (
                  <div key={c.id} className="pms-card">
                    <div>
                      <div style={{ fontWeight:700, fontSize:13, color:'#0f172a' }}>{c.cliente_nombre}</div>
                      <div style={{ fontSize:11, color:'#94a3b8', textTransform:'uppercase', marginTop:2 }}>{c.pms_tipo}</div>
                      {c.ultimo_sync && (
                        <div style={{ fontSize:11, color:'#94a3b8', marginTop:4 }}>
                          Sync: {new Date(c.ultimo_sync).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'})}
                        </div>
                      )}
                    </div>
                    <span style={{
                      fontSize:11, fontWeight:700, padding:'4px 10px', borderRadius:20,
                      background: c.sync_error ? '#fee2e2' : c.activa ? '#d1fae5' : '#f1f5f9',
                      color:      c.sync_error ? '#dc2626' : c.activa ? '#059669' : '#94a3b8',
                    }}>
                      {c.sync_error ? '⚠ Error' : c.activa ? '● Activo' : '○ Inactivo'}
                    </span>
                  </div>
                ))}
              </>
            )}
          </div>{/* dash-content */}

        </div>{/* dash-main */}

        {/* ── Bottom nav móvil ── */}
        <nav className="bottom-nav">
          <div className="bottom-nav-inner">
            <button className="bottom-nav-item active"><span>🏠</span><span>Inicio</span></button>
            <button className="bottom-nav-item" onClick={() => window.location.href='/admin/clientes'}>
              <span>👥</span><span>Clientes</span>
            </button>
            <button className="bottom-nav-item" onClick={() => setShowNueva(true)}>
              <span style={{ background:'#4f46e5', borderRadius:12, width:42, height:42, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, color:'white', boxShadow:'0 3px 10px rgba(79,70,229,.4)' }}>＋</span>
              <span>Nueva</span>
            </button>
            <button className="bottom-nav-item" onClick={() => window.location.href='/admin/rrhh'}>
              <span>👤</span><span>RRHH</span>
            </button>
            <button className="bottom-nav-item" onClick={() => window.location.href='/admin'}>
              <span>⚙️</span><span>Config</span>
            </button>
          </div>
        </nav>

      </div>{/* dash-root */}

      {showNueva && (
        <NuevaLimpiezaModal
          clientes={clientes}
          limpiadoras={limpiadoras}
          onCreada={onSesionCreada}
          onClose={() => setShowNueva(false)}
        />
      )}
    </>
  )
}
