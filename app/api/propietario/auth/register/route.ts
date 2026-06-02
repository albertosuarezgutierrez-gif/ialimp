import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyTurnstile } from '@/lib/turnstile'
import { rateLimit, getIp, genHex, sha256Hex } from '@/lib/propietario-auth'

// Mensaje único: no revela si el correo existe o no (anti-enumeración).
const GENERIC = {
  ok: true,
  message: 'Si tu correo está registrado como propietario, te hemos enviado un enlace para crear tu contraseña. Revisa tu bandeja (y la carpeta de spam).',
}

const MAIL_FROM = process.env.MAIL_FROM || 'hola@ialimp.es'

// Transporte autocontenido (Resend → SMTP IONOS → Gmail). Devuelve null si no
// hay credenciales (entonces no se rompe: simplemente no se envía el correo).
function getTransporter() {
  const t = { connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 15_000 }
  if (process.env.RESEND_API_KEY) {
    return nodemailer.createTransport({ host: 'smtp.resend.com', port: 465, secure: true,
      auth: { user: 'resend', pass: process.env.RESEND_API_KEY }, ...t })
  }
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ionos.es',
      port: Number(process.env.SMTP_PORT || 465), secure: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD }, ...t })
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({ service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }, ...t })
  }
  return null
}

export async function POST(req: Request) {
  const ip = getIp(req)
  const rl = rateLimit('prop-register:' + ip)
  if (!rl.allowed) {
    const mins = Math.ceil((rl.retryAfter || 900) / 60)
    return NextResponse.json({ error: `Demasiados intentos. Espera ${mins} min.` }, { status: 429 })
  }

  try {
    const { email, turnstileToken } = await req.json()
    if (!email) return NextResponse.json({ error: 'Falta el email' }, { status: 400 })

    if (!(await verifyTurnstile(turnstileToken, ip))) {
      return NextResponse.json({ error: 'Verificación anti-bot fallida. Recarga la página.' }, { status: 400 })
    }

    const norm = String(email).toLowerCase().trim()

    // ¿El email pertenece a algún cliente activo? (login_email / contacto / notif / facturación / contactos)
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT c.id, c.empresa_id, c.nombre, e.nombre AS empresa_nombre
      FROM clientes c JOIN empresas e ON e.id = c.empresa_id
      WHERE c.activo = true AND (
            lower(c.login_email)        = ${norm}
         OR lower(c.contacto_email)     = ${norm}
         OR lower(c.notif_email)        = ${norm}
         OR lower(c.email_facturacion)  = ${norm}
         OR EXISTS (SELECT 1 FROM cliente_contactos cc
                    WHERE cc.cliente_id = c.id AND lower(cc.email) = ${norm})
      )
      LIMIT 1
    `)

    // Email no registrado → respondemos genérico igualmente (no filtramos info).
    if (!rows.length) return NextResponse.json(GENERIC)

    const c = rows[0]
    const raw  = genHex(32)
    const hash = await sha256Hex(raw)

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO cliente_auth_tokens (cliente_id, empresa_id, token_hash, purpose, email, expires_at)
      VALUES (${c.id}::uuid, ${c.empresa_id}::uuid, ${hash}, 'set_password', ${norm}, now() + interval '1 hour')
    `)

    const origin = req.headers.get('origin') || new URL(req.url).origin
    const link = `${origin}/propietario/clave/${raw}`

    const transporter = getTransporter()
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"${c.empresa_nombre}" <${MAIL_FROM}>`,
          to: norm,
          subject: 'Crea tu contraseña de acceso a tu portal',
          html: `
            <div style="font-family:'Nunito',Arial,sans-serif;max-width:480px;margin:0 auto;background:#f1f5f9;padding:24px;border-radius:14px;color:#1e1b4b;">
              <div style="background:#4f46e5;color:#fff;padding:20px 24px;border-radius:12px;margin-bottom:20px;">
                <h1 style="margin:0;font-size:19px;">Tu acceso a ${c.empresa_nombre}</h1>
              </div>
              <p style="font-size:15px;line-height:1.6;color:#334155;">
                Hola ${String(c.nombre || '').split(' ')[0] || ''},<br><br>
                Pulsa el botón para crear tu contraseña. Después entrarás siempre desde
                <strong>ialimp.es/propietario</strong> con tu email y tu contraseña — sin enlaces ni tokens.
              </p>
              <a href="${link}" style="display:block;background:#4f46e5;color:#fff;text-align:center;padding:14px;border-radius:10px;text-decoration:none;font-weight:800;margin:18px 0;">
                Crear mi contraseña →
              </a>
              <p style="font-size:12px;color:#94a3b8;line-height:1.5;">
                Este enlace caduca en 1 hora y solo se puede usar una vez. Si no has solicitado esto, ignora este correo.
              </p>
            </div>`,
        })
      } catch (err: any) {
        console.error('[propietario/register] email error:', err?.message)
        // No revelamos el fallo al usuario para no filtrar enumeración.
      }
    } else {
      console.warn('[propietario/register] sin transporte de correo configurado')
    }

    return NextResponse.json(GENERIC)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
