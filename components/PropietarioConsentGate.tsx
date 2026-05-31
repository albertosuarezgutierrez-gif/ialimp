'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Sube la versión cuando cambie el texto legal. Queda guardada como prueba.
const CONSENT_VERSION = '2026-05-v1'

const C = {
  indigo: '#4f46e5', indigoD: '#3730a3', soft: '#eef2ff',
  bg: '#f1f5f9', dark: '#0f172a', mid: '#334155', mut: '#64748b', border: '#e2e8f0',
}

export default function PropietarioConsentGate({
  token, empresaNombre, empresaNif, empresaEmail, politicaUrl = '/privacidad',
}: {
  token: string
  empresaNombre: string
  empresaNif: string
  empresaEmail: string
  politicaUrl?: string
}) {
  const router = useRouter()
  const [aceptaTerminos, setAceptaTerminos] = useState(false)
  const [aceptaComercial, setAceptaComercial] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!aceptaTerminos) return
    setEnviando(true); setError(null)
    try {
      const res = await fetch(`/api/propietario/${token}/consentimiento`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acepto_terminos: aceptaTerminos,
          acepto_comercial: aceptaComercial,
          consent_version: CONSENT_VERSION,
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => null)
        throw new Error(d?.error || 'No se pudo registrar tu aceptación. Inténtalo de nuevo.')
      }
      router.refresh() // re-ejecuta la página: ya verá acepto_terminos = true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error inesperado.')
      setEnviando(false)
    }
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 'clamp(16px,5vw,48px)', background: C.bg }}>
      <div style={{ width: '100%', maxWidth: 520, background: '#fff', borderRadius: 24, border: `1px solid ${C.border}`, overflow: 'hidden', boxShadow: '0 10px 40px rgba(79,70,229,.10)' }}>
        <div style={{ background: C.indigo, color: '#fff', padding: '24px 28px' }}>
          <p style={{ margin: 0, fontSize: 14, opacity: .9 }}>{empresaNombre}</p>
          <h1 style={{ margin: '4px 0 0', fontSize: 20, fontWeight: 800 }}>Acceso a tu portal de propietario</h1>
        </div>

        <div style={{ padding: '24px 28px', color: C.dark }}>
          <p style={{ marginTop: 0, fontSize: 15, lineHeight: 1.6 }}>
            Antes de entrar, confirma que has leído cómo tratamos tus datos.
          </p>

          <div style={{ marginTop: 18, borderRadius: 14, background: C.soft, padding: 16, fontSize: 13, lineHeight: 1.6, color: C.mid }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, color: C.dark }}>Información básica sobre protección de datos</p>
            <p style={{ margin: 0 }}><b>Responsable:</b> {empresaNombre} · NIF {empresaNif} · {empresaEmail}.</p>
            <p style={{ margin: '4px 0 0' }}><b>Finalidad:</b> gestionar los servicios de limpieza de tu propiedad y, si lo autorizas, enviarte comunicaciones comerciales.</p>
            <p style={{ margin: '4px 0 0' }}><b>Legitimación:</b> ejecución del contrato de servicios; tu consentimiento para las comunicaciones comerciales.</p>
            <p style={{ margin: '4px 0 0' }}><b>Destinatarios:</b> no se ceden datos a terceros salvo obligación legal. Los datos se tratan en la plataforma IALIMP (encargada del tratamiento, art. 28 RGPD).</p>
            <p style={{ margin: '4px 0 0' }}><b>Derechos:</b> acceder, rectificar, suprimir, oponerte, limitar y portar tus datos en {empresaEmail}, así como reclamar ante la AEPD.</p>
            <p style={{ margin: '8px 0 0' }}>
              <a href={politicaUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.indigo, fontWeight: 600 }}>
                Leer la política de privacidad completa
              </a>
            </p>
          </div>

          <label style={{ marginTop: 18, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptaTerminos} onChange={(e) => setAceptaTerminos(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: C.indigo, flexShrink: 0 }} />
            <span style={{ fontSize: 14, lineHeight: 1.6 }}>
              He leído y acepto la política de privacidad y las condiciones de uso del portal.{' '}
              <span style={{ color: C.indigo, fontWeight: 600 }}>(obligatorio)</span>
            </span>
          </label>

          <label style={{ marginTop: 14, display: 'flex', alignItems: 'flex-start', gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={aceptaComercial} onChange={(e) => setAceptaComercial(e.target.checked)} style={{ marginTop: 3, width: 18, height: 18, accentColor: C.indigo, flexShrink: 0 }} />
            <span style={{ fontSize: 14, lineHeight: 1.6 }}>
              Acepto recibir comunicaciones comerciales e informativas de {empresaNombre} por email, SMS o WhatsApp. Puedo retirar este consentimiento en cualquier momento.{' '}
              <span style={{ color: C.mut }}>(opcional)</span>
            </span>
          </label>

          {error && <p style={{ marginTop: 16, fontSize: 13, color: '#dc2626' }}>{error}</p>}

          <button
            onClick={handleSubmit}
            disabled={!aceptaTerminos || enviando}
            style={{
              marginTop: 24, width: '100%', borderRadius: 14, border: 'none',
              padding: '12px 16px', fontSize: 15, fontWeight: 700, color: '#fff',
              background: (!aceptaTerminos || enviando) ? '#a5b4fc' : C.indigo,
              cursor: (!aceptaTerminos || enviando) ? 'not-allowed' : 'pointer',
            }}
          >
            {enviando ? 'Guardando…' : 'Aceptar y acceder al portal'}
          </button>

          <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: C.mut }}>
            Aceptar las comunicaciones comerciales es opcional y no condiciona el acceso al portal.
          </p>
        </div>
      </div>
    </div>
  )
}
