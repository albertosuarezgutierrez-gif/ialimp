import type { ReactNode } from 'react'

export const metadata = {
  title: 'Aviso Legal · IALIMP',
  description: 'Información legal del titular del sitio web IALIMP (art. 10 LSSI).',
}

const C = { indigo: '#4f46e5', soft: '#eef2ff', bg: '#f1f5f9', dark: '#0f172a', mid: '#334155', mut: '#64748b' }

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ marginTop: 28 }}>
      <h2 style={{ fontSize: 17, fontWeight: 800, color: C.dark, margin: 0 }}>{title}</h2>
      <div style={{ marginTop: 8, fontSize: 15, lineHeight: 1.7, color: C.mid }}>{children}</div>
    </section>
  )
}

export default function AvisoLegalPage() {
  return (
    <main style={{ minHeight: '100vh', background: C.bg, padding: '40px 16px' }}>
      <article style={{ margin: '0 auto', maxWidth: 760, background: '#fff', borderRadius: 24, padding: 'clamp(24px,5vw,40px)', color: C.dark, boxShadow: '0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06)' }}>
        <header style={{ borderBottom: `1px solid ${C.soft}`, paddingBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Aviso Legal</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: C.mut }}>Última actualización: 31/05/2026.</p>
        </header>

        <Section title="1. Titular del sitio web">
          <p>En cumplimiento del art. 10 de la Ley 34/2002 (LSSI-CE), se informa de que este sitio web es titularidad de:</p>
          <ul style={{ paddingLeft: 20, margin: '8px 0 0' }}>
            <li style={{ marginTop: 6 }}><b>Titular:</b> Alberto Suárez Gutiérrez</li>
            <li style={{ marginTop: 6 }}><b>NIF:</b> 28823484E</li>
            <li style={{ marginTop: 6 }}><b>Domicilio:</b> Calle San Juan de la Palma 28, 41003 Sevilla</li>
            <li style={{ marginTop: 6 }}><b>Email:</b> <a style={{ color: C.indigo, fontWeight: 600 }} href="mailto:alberto.suarez.gutierrez@gmail.com">alberto.suarez.gutierrez@gmail.com</a></li>
            <li style={{ marginTop: 6 }}><b>Sitio web:</b> ialimp.vercel.app</li>
            <li style={{ marginTop: 6 }}><b>Actividad:</b> plataforma de software para la gestión de servicios de limpieza.</li>
          </ul>
        </Section>

        <Section title="2. Objeto y condiciones de uso">
          <p>Este sitio ofrece información y acceso a la plataforma IALIMP. El acceso y uso del sitio atribuye la condición de usuario e implica la aceptación de este aviso legal. El usuario se compromete a un uso lícito y a no realizar actividades que dañen, inutilicen o sobrecarguen el servicio.</p>
        </Section>

        <Section title="3. Propiedad intelectual e industrial">
          <p>Los contenidos, marcas, logotipos y software del sitio son propiedad del titular o de terceros que han autorizado su uso. Queda prohibida su reproducción o distribución sin autorización.</p>
        </Section>

        <Section title="4. Responsabilidad">
          <p>El titular no se responsabiliza de los daños derivados del uso del sitio ni de interrupciones ajenas a su control. Los enlaces a sitios de terceros no implican responsabilidad sobre sus contenidos.</p>
        </Section>

        <Section title="5. Protección de datos">
          <p>El tratamiento de datos personales se rige por la <a style={{ color: C.indigo, fontWeight: 600 }} href="/privacidad">Política de Privacidad</a> y la <a style={{ color: C.indigo, fontWeight: 600 }} href="/cookies">Política de Cookies</a>.</p>
        </Section>

        <Section title="6. Legislación aplicable">
          <p>Este aviso legal se rige por la legislación española. Para cualquier controversia, las partes se someten a los juzgados y tribunales que correspondan conforme a derecho.</p>
        </Section>
      </article>
    </main>
  )
}
