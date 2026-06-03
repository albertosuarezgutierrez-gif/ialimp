// Núcleo del módulo de mailing en frío (prospección de IALIMP).
// Plantilla de correo con la paleta IALIMP, personalización con IA, reescritura
// de enlaces para tracking y utilidades de horario/warm-up.
//
// Cumplimiento LSSI/RGPD: todo correo lleva identificación del responsable
// (RGPD_RESPONSABLE), enlace de baja funcional y pixel de apertura.
import { MAIL_FROM } from '@/lib/mailer'
import { RGPD_RESPONSABLE } from '@/lib/rgpd'
import { aiComplete } from '@/lib/ai-client'

// Remitente del cold mailing. Separado del transaccional (hola@ialimp.es) para
// NO quemar la reputación del dominio principal: usar MAILING_FROM si existe.
export const MAILING_FROM = process.env.MAILING_FROM || MAIL_FROM
export const MAILING_FROM_NAME = process.env.MAILING_FROM_NAME || 'IALIMP'

// Número de WhatsApp de IALIMP para los CTAs wa.me (solo dígitos, con prefijo país).
export const IALIMP_WHATSAPP = (process.env.IALIMP_WHATSAPP || '34637349990').replace(/\D/g, '')

// Tamaño de lote y ritmo de envío del agente (cabe en el timeout serverless y
// respeta los límites de Resend → goteo natural).
export const MAILING_BATCH_SIZE = Number(process.env.MAILING_BATCH_SIZE || 20)
export const MAILING_RATE_MS = Number(process.env.MAILING_RATE_MS || 400)

// Base de URLs públicas (pixel/click/baja). Mismo criterio que agente-cotizador.
export function appBase(): string {
  return (process.env.NEXTAUTH_URL || 'https://app.ialimp.es').replace(/\/+$/, '')
}

export interface ProspectoLite {
  id: string
  empresa_nombre: string
  email: string
  telefono?: string | null
  ciudad?: string | null
  web?: string | null
  ia_opener?: string | null
}

// ── Horario laboral (Europe/Madrid): lun-vie, 9:00–19:00 ──────────────────
// Evita enviar de noche/fines de semana (mejor apertura y deliverability).
export function enHorarioLaboral(d: Date = new Date()): boolean {
  const fmt = new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid', weekday: 'short', hour: '2-digit', hour12: false,
  })
  const parts = fmt.formatToParts(d)
  const weekday = parts.find(p => p.type === 'weekday')?.value || ''
  const hour = Number(parts.find(p => p.type === 'hour')?.value || '0')
  const finde = /sá|sáb|dom/i.test(weekday) // sábado / domingo
  return !finde && hour >= 9 && hour < 19
}

// ── Personalización con IA: una línea de apertura por prospecto ───────────
export async function aiOpener(p: ProspectoLite): Promise<string> {
  const prompt = `Eres comercial de IALIMP, un software para gestionar empresas de limpieza ` +
    `(apartamentos turísticos y limpiezas profesionales). Escribe UNA sola frase breve ` +
    `(máx. 18 palabras, en español, cercana e **intrigante**, que despierte curiosidad y ` +
    `conecte con el día a día de coordinar limpiezas; sin comillas ni emojis) ` +
    `para abrir un email en frío dirigido a la empresa de limpieza "${p.empresa_nombre}"` +
    `${p.ciudad ? ` de ${p.ciudad}` : ''}. No vendas todavía, solo engancha. ` +
    `No saludes ("Hola"), no inventes datos concretos; solo la frase de apertura.`
  try {
    const out = (await aiComplete(prompt)).trim().replace(/^["'\s]+|["'\s]+$/g, '')
    return out.split('\n')[0].slice(0, 240)
  } catch {
    return `Imagino que en ${p.empresa_nombre} cuadrar quién limpia cada piso se lleva más horas de las que te gustaría.`
  }
}

// ── Generación del cuerpo de una campaña con IA (lo edita el superadmin) ──
export async function aiGenerarCuerpo(brief: string): Promise<string> {
  const prompt = `Redacta el CUERPO (solo HTML simple: párrafos <p> y <strong>; sin <html>, <head>, ` +
    `<style>, listas ni imágenes) de un email en frío B2B en español, dirigido a empresas de ` +
    `limpieza, para presentar IALIMP (software de gestión de limpiezas). Tiene que ser **MUY ` +
    `CORTO (máx. 3 párrafos breves), intrigante y que invite a pedir información** (responder al ` +
    `correo o pedir una demo, sin compromiso). Deja claro que **nos adaptamos a su forma de ` +
    `trabajar, no al revés**. Tono cercano, sin tecnicismos ni exageraciones. Empieza por el ` +
    `marcador {{opener}} (frase de apertura personalizada) y usa {{empresa}} para el nombre. ` +
    `NO incluyas botones ni enlaces (se añaden automáticamente). ${brief || ''}`
  return (await aiComplete(prompt)).trim()
}

function esc(s: string): string {
  return String(s || '').replace(/[&<>"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as Record<string, string>)[c]!)
}

// Sustituye los merge-tags del asunto/cuerpo por los datos del prospecto.
export function aplicarMergeTags(texto: string, p: ProspectoLite): string {
  return (texto || '')
    .replace(/\{\{\s*empresa(_nombre)?\s*\}\}/gi, esc(p.empresa_nombre))
    .replace(/\{\{\s*ciudad\s*\}\}/gi, esc(p.ciudad || 'tu zona'))
    .replace(/\{\{\s*opener\s*\}\}/gi, esc(p.ia_opener || ''))
}

interface ConstruirParams {
  asunto: string
  cuerpoHtml: string
  prospecto: ProspectoLite
  token: string
  landingUrl: string
}

// Construye { subject, html } del correo final: cuerpo con merge-tags dentro del
// marco IALIMP + CTAs con tracking + pie legal + pixel de apertura.
export function construirEmail({ asunto, cuerpoHtml, prospecto, token, landingUrl }: ConstruirParams) {
  const base = appBase()
  const subject = aplicarMergeTags(asunto, prospecto).replace(/<[^>]+>/g, '')
  const cuerpo = aplicarMergeTags(cuerpoHtml, prospecto)

  // Enlaces con tracking (pasan por /api/m/c y redirigen al destino real).
  const urlWeb = `${base}/api/m/c/${token}?u=${encodeURIComponent(landingUrl)}`
  const waText = encodeURIComponent(`Hola, soy de ${prospecto.empresa_nombre}. Me interesa IALIMP.`)
  const urlWa = `${base}/api/m/c/${token}?u=${encodeURIComponent(`https://wa.me/${IALIMP_WHATSAPP}?text=${waText}`)}`
  const urlBaja = `${base}/api/m/baja/${token}`
  const urlPixel = `${base}/api/m/o/${token}`

  const r = RGPD_RESPONSABLE
  const html = `<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;color:#1e1b4b;line-height:1.6}
  .page{max-width:600px;margin:0 auto;background:#fff}
  .header{background:#4f46e5;color:#fff;padding:28px 36px}
  .header .logo{font-size:24px;font-weight:800;letter-spacing:-.03em}
  .header .logo span{color:#c7d2fe;font-weight:400}
  .content{padding:32px 36px;font-size:15px;color:#374151}
  .content p{margin-bottom:14px}
  .content ul{margin:0 0 16px 20px}.content li{margin-bottom:6px}
  .ctas{padding:8px 36px 28px;text-align:center}
  .btn{display:inline-block;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px;padding:13px 26px;margin:6px}
  .btn-primary{background:#4f46e5;color:#fff}
  .btn-wa{background:#25d366;color:#fff}
  .footer{background:#f8fafc;padding:20px 36px;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0}
  .footer a{color:#94a3b8}
</style></head>
<body><div class="page">
  <div class="header"><div class="logo">ia<span>limp</span></div></div>
  <div class="content">${cuerpo}</div>
  <div class="ctas">
    <a class="btn btn-primary" href="${urlWeb}">Ver cómo funciona →</a>
    <a class="btn btn-wa" href="${urlWa}">Escríbenos por WhatsApp</a>
  </div>
  <div class="footer">
    Este correo lo envía <strong>${esc(r.marca)}</strong> — ${esc(r.nombre)}, NIF ${esc(r.nif)},
    ${esc(r.direccion)}. Te escribimos porque creemos que IALIMP puede ayudar a tu empresa de limpieza.
    Si no quieres recibir más correos, <a href="${urlBaja}">date de baja aquí</a>.
  </div>
  <img src="${urlPixel}" width="1" height="1" alt="" style="display:none">
</div></body></html>`

  const text = `${cuerpo.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()}\n\n` +
    `Ver cómo funciona: ${landingUrl}\n` +
    `Enviado por ${r.marca} (${r.nombre}). Baja: ${urlBaja}`

  return { subject, html, text, urlBaja }
}
