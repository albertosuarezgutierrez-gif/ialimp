'use client'

// Bloque de privacidad + consentimiento comercial para formularios públicos
// (/cotizador, /registro, /propuesta...). Colócalo encima del botón de envío.
// En estos formularios el responsable es IALIMP (leads del propio IALIMP).
// No hace falta casilla de "acepto privacidad" para tramitar (base = la solicitud);
// solo es obligatoria la casilla SEPARADA y OPCIONAL para lo comercial.

export default function FormPrivacidadConsent({
  aceptaComercial, setAceptaComercial,
}: {
  aceptaComercial: boolean
  setAceptaComercial: (v: boolean) => void
}) {
  return (
    <div style={{ color: '#0f172a' }}>
      <p style={{ fontSize: 12, lineHeight: 1.6, color: '#64748b', margin: 0 }}>
        Responsable: Alberto Suárez Gutiérrez (IALIMP). Finalidad: atender tu solicitud. Tus datos no se ceden a
        terceros salvo obligación legal. Consulta el detalle en la{' '}
        <a href="/privacidad" target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', fontWeight: 600 }}>
          Política de Privacidad
        </a>.
      </p>
      <label style={{ marginTop: 12, display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
        <input type="checkbox" checked={aceptaComercial} onChange={(e) => setAceptaComercial(e.target.checked)} style={{ marginTop: 2, width: 16, height: 16, accentColor: '#4f46e5', flexShrink: 0 }} />
        <span style={{ fontSize: 12, lineHeight: 1.6, color: '#334155' }}>
          Acepto recibir comunicaciones comerciales de IALIMP por email. Puedo darme de baja en cualquier momento.{' '}
          <span style={{ color: '#94a3b8' }}>(opcional)</span>
        </span>
      </label>
    </div>
  )
}
