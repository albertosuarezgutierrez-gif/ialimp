'use client'
import { useState } from 'react'
import LogoIalimp from '@/components/LogoIalimp'

const C = {
  primary:'#4f46e5', brand:'#6366f1', light:'#eef2ff',
  bg:'#f1f5f9', text:'#1e1b4b', muted:'#64748b', border:'#e2e8f0',
}

// Pantalla bloqueante: el cliente no ve sus datos hasta autorizar el tratamiento.
// La página servidor (page.tsx) solo renderiza esto cuando NO hay consentimiento
// vigente, así que aquí no se ha cargado ningún dato personal de limpiezas.
export default function ConsentimientoRGPD({
  token, empresaNombre, empresaEmail, version,
}: { token: string; empresaNombre: string; empresaEmail?: string; version: string }) {
  const [acepto, setAcepto]   = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const empresa = empresaNombre || 'la empresa'
  const contacto = empresaEmail ? `${empresaEmail}` : empresa

  async function aceptar() {
    if (!acepto || enviando) return
    setEnviando(true); setError(null)
    try {
      const r = await fetch(`/api/propietario/${token}/consentimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ version }),
      })
      if (!r.ok) {
        const d = await r.json().catch(() => ({}))
        throw new Error(d.error || 'No se pudo registrar tu autorización. Inténtalo de nuevo.')
      }
      // Recarga: la página servidor ya pasa el gate y carga la intranet.
      window.location.reload()
    } catch (e: any) {
      setError(e.message)
      setEnviando(false)
    }
  }

  return (
    <div style={{ fontFamily:"'Nunito',-apple-system,sans-serif", background:C.bg, minHeight:'100vh',
      display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-start',
      padding:'24px 16px' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0} ::-webkit-scrollbar{display:none}`}</style>

      <div style={{ width:'100%', maxWidth:480, background:'#fff', borderRadius:16,
        border:`1px solid ${C.border}`, overflow:'hidden', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

        {/* Cabecera */}
        <div style={{ background:C.primary, color:'#fff', padding:'20px 22px' }}>
          <div style={{ marginBottom:8 }}><LogoIalimp /></div>
          <h1 style={{ fontSize:19, fontWeight:800, lineHeight:1.25 }}>
            🔒 Antes de entrar, necesitamos tu autorización
          </h1>
        </div>

        {/* Cuerpo (scroll si no cabe) */}
        <div style={{ padding:'18px 22px', overflowY:'auto', color:C.text, fontSize:14.5, lineHeight:1.6 }}>
          <p style={{ marginBottom:14 }}>
            <strong>{empresa}</strong> gestiona las limpiezas de tus alojamientos y, para que puedas
            seguirlas, te da acceso a esta intranet privada (estado de cada limpieza en tiempo real,
            fotos, facturas y documentos). La intranet es un software prestado por su titular de forma
            <strong> gratuita</strong> para ti. A cambio, necesitamos que autorices el tratamiento de tus datos.
          </p>

          <h2 style={{ fontSize:14, fontWeight:800, margin:'14px 0 6px', color:C.primary }}>¿Qué datos tratamos y para qué?</h2>
          <p style={{ marginBottom:12 }}>
            Tus datos de contacto y fiscales, los datos de tus propiedades y el historial de limpiezas,
            con la finalidad de prestar y facturar el servicio de limpieza y mostrarte esta información
            en tu intranet privada.
          </p>

          <h2 style={{ fontSize:14, fontWeight:800, margin:'14px 0 6px', color:C.primary }}>¿Quién trata tus datos?</h2>
          <p style={{ marginBottom:12 }}>
            Tus datos los tratan <strong>{empresa}</strong>, como empresa que presta tu servicio de
            limpieza, y el <strong>titular de la plataforma</strong> que hace funcionar esta intranet.
            No se ceden a terceros salvo obligación legal o para prestar el propio servicio.
          </p>

          <h2 style={{ fontSize:14, fontWeight:800, margin:'14px 0 6px', color:C.primary }}>Acceso gratuito y retirada</h2>
          <p style={{ marginBottom:12 }}>
            El acceso a esta intranet se te ofrece sin coste a cambio de que autorices este tratamiento.
            Puedes retirar tu consentimiento en cualquier momento escribiendo a <strong>{contacto}</strong>;
            ello implicará dejar de tener acceso a la intranet.
          </p>

          <h2 style={{ fontSize:14, fontWeight:800, margin:'14px 0 6px', color:C.primary }}>Tus derechos</h2>
          <p style={{ marginBottom:4 }}>
            Puedes acceder, rectificar o suprimir tus datos, así como ejercer el resto de derechos que
            te reconoce el RGPD, dirigiéndote a <strong>{contacto}</strong>.
          </p>
        </div>

        {/* Pie: check + botón (siempre visibles) */}
        <div style={{ padding:'14px 22px 20px', borderTop:`1px solid ${C.border}`, background:'#fff' }}>
          <label style={{ display:'flex', gap:10, alignItems:'flex-start', cursor:'pointer',
            background:C.light, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 14px', marginBottom:12 }}>
            <input type="checkbox" checked={acepto} onChange={e => setAcepto(e.target.checked)}
              style={{ width:20, height:20, marginTop:1, accentColor:C.primary, flexShrink:0 }} />
            <span style={{ fontSize:13.5, color:C.text, lineHeight:1.5 }}>
              He leído y <strong>autorizo el tratamiento de mis datos</strong> por parte de {empresa} y del
              titular de la plataforma, en los términos descritos, a cambio del acceso gratuito a esta intranet.
            </span>
          </label>

          {error && (
            <p style={{ color:'#dc2626', fontSize:13, marginBottom:10, fontWeight:600 }}>{error}</p>
          )}

          <button onClick={aceptar} disabled={!acepto || enviando}
            style={{ width:'100%', padding:'13px', borderRadius:10, border:'none',
              background: (!acepto || enviando) ? '#c7d2fe' : C.primary, color:'#fff',
              fontWeight:800, fontSize:15, fontFamily:'inherit',
              cursor:(!acepto || enviando) ? 'default' : 'pointer' }}>
            {enviando ? 'Guardando…' : 'Aceptar y entrar →'}
          </button>
        </div>
      </div>
    </div>
  )
}
