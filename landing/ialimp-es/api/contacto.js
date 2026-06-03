// Función serverless del formulario de contacto de la landing ialimp.es.
// Vercel trata `api/*.js` como Serverless Function (Node) aunque el resto del
// proyecto sea estático → el formulario hace POST a /api/contacto (mismo origen,
// sin CORS). Envía un aviso por email vía la API HTTP de Resend (sin dependencias
// npm; la landing sigue sin package.json ni build).
//
// Requiere la variable de entorno RESEND_API_KEY en el proyecto Vercel
// `ialimp-landing` (Settings → Environment Variables → Production).

const AVISO_TO = 'alberto.suarez.gutierrez@gmail.com';
const MAIL_FROM = 'IALIMP <hola@ialimp.es>';

// Escapa el contenido del usuario antes de incrustarlo en el HTML del email.
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  // El body puede venir ya parseado (Vercel) o como string crudo.
  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  body = body || {};

  const nombre = (body.nombre || '').toString().trim();
  const email = (body.email || '').toString().trim();
  const telefono = (body.telefono || '').toString().trim();
  const mensaje = (body.mensaje || '').toString().trim();
  const consentimiento = body.consentimiento === true || body.consentimiento === 'true';
  const honeypot = (body.website || '').toString().trim();

  // Honeypot: si un bot rellena el campo oculto, fingimos éxito y no enviamos.
  if (honeypot) return res.status(200).json({ ok: true });

  // Validación de servidor (no fiarse solo del HTML).
  if (!nombre || !email || !telefono || !consentimiento) {
    return res.status(400).json({ ok: false, error: 'Faltan campos obligatorios.' });
  }
  if (!EMAIL_RE.test(email)) {
    return res.status(400).json({ ok: false, error: 'Email no válido.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Sin credenciales no podemos enviar; el formulario muestra el fallback.
    return res.status(502).json({ ok: false, error: 'Envío no disponible.' });
  }

  const fecha = new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const html = `
    <h2 style="font-family:sans-serif;color:#1e1b4b">Nueva solicitud de demo — ialimp.es</h2>
    <table style="font-family:sans-serif;font-size:15px;color:#1e1b4b;border-collapse:collapse">
      <tr><td style="padding:4px 12px 4px 0"><strong>Nombre</strong></td><td>${esc(nombre)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Email</strong></td><td>${esc(email)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Teléfono</strong></td><td>${esc(telefono)}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;vertical-align:top"><strong>Mensaje</strong></td><td>${esc(mensaje) || '<em>(sin mensaje)</em>'}</td></tr>
      <tr><td style="padding:4px 12px 4px 0"><strong>Fecha</strong></td><td>${esc(fecha)}</td></tr>
    </table>
    <p style="font-family:sans-serif;font-size:12px;color:#64748b">El interesado aceptó la política de privacidad al enviar el formulario.</p>
  `;
  const text =
    `Nueva solicitud de demo — ialimp.es\n\n` +
    `Nombre: ${nombre}\nEmail: ${email}\nTeléfono: ${telefono}\n` +
    `Mensaje: ${mensaje || '(sin mensaje)'}\nFecha: ${fecha}\n`;

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: MAIL_FROM,
        to: [AVISO_TO],
        reply_to: email,
        subject: `Nueva solicitud de demo — ${nombre}`,
        html,
        text,
      }),
    });
    if (!r.ok) {
      return res.status(502).json({ ok: false, error: 'No se pudo enviar.' });
    }
    return res.status(200).json({ ok: true });
  } catch {
    return res.status(502).json({ ok: false, error: 'No se pudo enviar.' });
  }
};
