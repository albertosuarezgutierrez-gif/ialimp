import type { ReactNode } from 'react'

export const metadata = {
  title: 'Política de Cookies · IALIMP',
  description: 'Información sobre el uso de cookies en IALIMP.',
}

// NOTA: este texto asume SOLO cookies técnicas (sesión / autenticación).
// Si se añade analítica o pixel de marketing, hay que actualizar este texto
// Y mostrar un banner de consentimiento que cargue esas cookies solo tras aceptar.

const C = { indigo: '#4f46e5', soft: '#eef2ff', bg: '#f1f5f9', dark: '#0f172a', mid: '#334155', mut: '#64748b' }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: 0 }}>{title}</h2>
      <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: C.mid }}>{children}</div>
    </section>
  )
}

export default function CookiesPage() {
  return (
    <main style={{ minHeight: '100vh', background: C.bg, padding: '40px 16px' }}>
      <article style={{ margin: '0 auto', maxWidth: 760, background: '#fff', borderRadius: 24, padding: 'clamp(24px,5vw,40px)', color: C.dark, boxShadow: '0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06)' }}>
        <header style={{ borderBottom: `1px solid ${C.soft}`, paddingBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Política de Cookies</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: C.mut }}>Última actualización: 31/05/2026.</p>
        </header>

        <Section title="1. Qué son las cookies">
          <p>Las cookies son pequeños archivos que se almacenan en tu dispositivo al navegar. Sirven para que el sitio funcione y recuerde tu sesión.</p>
        </Section>

        <Section title="2. Qué cookies utilizamos">
          <p>IALIMP utiliza únicamente <b>cookies técnicas necesarias</b> para el funcionamiento del servicio:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginTop: 6 }}><b>Cookie de sesión / autenticación:</b> mantener tu sesión iniciada de forma segura.</li>
            <li style={{ marginTop: 6 }}><b>Preferencias técnicas:</b> recordar ajustes básicos de la interfaz.</li>
          </ul>
          <p style={{ marginTop: 8 }}>No utilizamos cookies de análisis, publicidad ni de seguimiento de terceros. Las cookies técnicas están exentas del deber de consentimiento previo, conforme a la normativa y a las guías de la AEPD.</p>
        </Section>

        <Section title="3. Cómo gestionarlas">
          <p>Puedes bloquear o eliminar las cookies desde la configuración de tu navegador. Ten en cuenta que desactivar las cookies técnicas puede impedir el correcto funcionamiento del servicio (por ejemplo, mantener la sesión iniciada).</p>
        </Section>

        <Section title="4. Cambios">
          <p>Si en el futuro incorporamos cookies no esenciales (analítica o marketing), actualizaremos esta política y solicitaremos tu consentimiento mediante un banner antes de instalarlas.</p>
        </Section>
      </article>
    </main>
  )
}
