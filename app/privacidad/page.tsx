import type { ReactNode } from 'react'

export const metadata = {
  title: 'Política de Privacidad · IALIMP',
  description: 'Cómo IALIMP trata los datos personales conforme al RGPD y la LOPDGDD.',
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

export default function PrivacidadPage() {
  return (
    <main style={{ minHeight: '100vh', background: C.bg, padding: '40px 16px' }}>
      <article style={{ margin: '0 auto', maxWidth: 760, background: '#fff', borderRadius: 24, padding: 'clamp(24px,5vw,40px)', color: C.dark, boxShadow: '0 1px 3px rgba(15,23,42,.08), 0 4px 16px rgba(15,23,42,.06)' }}>
        <header style={{ borderBottom: `1px solid ${C.soft}`, paddingBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, margin: 0 }}>Política de Privacidad</h1>
          <p style={{ marginTop: 8, fontSize: 14, color: C.mut }}>Última actualización: 31/05/2026. Versión 2026-05-v1.</p>
        </header>

        <Section title="1. Responsable del tratamiento">
          <p>El responsable del tratamiento de los datos recogidos a través de este sitio web es <b>Alberto Suárez Gutiérrez</b>, con NIF <b>28823484E</b>, domicilio en Calle San Juan de la Palma 28, 41003 Sevilla, y correo de contacto <a style={{ color: C.indigo, fontWeight: 600 }} href="mailto:alberto.suarez.gutierrez@gmail.com">alberto.suarez.gutierrez@gmail.com</a>.</p>
        </Section>

        <Section title="2. Qué datos tratamos y con qué finalidad">
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li style={{ marginTop: 6 }}><b>Visitantes del sitio:</b> datos de navegación y cookies (ver apartado 9), para el funcionamiento y la mejora del sitio.</li>
            <li style={{ marginTop: 6 }}><b>Formularios de contacto, registro o presupuesto:</b> nombre, email, teléfono y los datos que nos facilites, para atender tu solicitud y, en su caso, prestarte el servicio.</li>
            <li style={{ marginTop: 6 }}><b>Comunicaciones comerciales:</b> si das tu consentimiento, tu email/teléfono para enviarte información sobre nuestros servicios. Puedes retirarlo en cualquier momento.</li>
          </ul>
        </Section>

        <Section title="3. Base jurídica">
          <p>La ejecución de un contrato o de medidas precontractuales (atención de solicitudes y prestación del servicio); tu consentimiento (comunicaciones comerciales y cookies no esenciales); y nuestro interés legítimo en el mantenimiento y la seguridad del sitio.</p>
        </Section>

        <Section title="4. Plazo de conservación">
          <p>Conservamos los datos mientras dure la relación y, después, durante los plazos legales aplicables (fiscales y mercantiles). Los datos de comunicaciones comerciales se conservan hasta que retires tu consentimiento.</p>
        </Section>

        <Section title="5. Destinatarios y encargados">
          <p>No cedemos datos a terceros salvo obligación legal. Para prestar el servicio utilizamos proveedores que actúan como encargados del tratamiento bajo contrato (art. 28 RGPD): alojamiento e infraestructura (Supabase, en la UE; Vercel), procesamiento con IA (NVIDIA) y, en su caso, envío de correos.</p>
        </Section>

        <Section title="6. IALIMP como encargado del tratamiento">
          <p>Cuando una empresa cliente utiliza IALIMP para gestionar a sus propietarios, clientes o personal, dicha empresa es la <b>responsable</b> de esos datos e IALIMP actúa como <b>encargado del tratamiento</b>, tratándolos únicamente conforme a sus instrucciones y al contrato de encargado suscrito.</p>
        </Section>

        <Section title="7. Transferencias internacionales">
          <p>Algunos proveedores están ubicados fuera del Espacio Económico Europeo (EE. UU.). En esos casos se aplican garantías adecuadas: Cláusulas Contractuales Tipo de la UE o adhesión al Marco de Privacidad de Datos UE–EE. UU.</p>
        </Section>

        <Section title="8. Tus derechos">
          <p>Puedes ejercer tus derechos de acceso, rectificación, supresión, oposición, limitación y portabilidad escribiendo a <a style={{ color: C.indigo, fontWeight: 600 }} href="mailto:alberto.suarez.gutierrez@gmail.com">alberto.suarez.gutierrez@gmail.com</a>. También puedes reclamar ante la Agencia Española de Protección de Datos (AEPD), <a style={{ color: C.indigo, fontWeight: 600 }} href="https://www.aepd.es" target="_blank" rel="noopener noreferrer">www.aepd.es</a>.</p>
        </Section>

        <Section title="9. Cookies">
          <p>Este sitio utiliza cookies técnicas necesarias y, previo consentimiento, cookies de análisis o marketing. Puedes configurarlas o rechazarlas desde el banner de cookies. Consulta la <a style={{ color: C.indigo, fontWeight: 600 }} href="/cookies">Política de Cookies</a> para más detalle.</p>
        </Section>

        <Section title="10. Cambios en esta política">
          <p>Podemos actualizar esta política para adaptarla a cambios normativos o del servicio. Publicaremos cualquier cambio en esta misma página.</p>
        </Section>
      </article>
    </main>
  )
}
