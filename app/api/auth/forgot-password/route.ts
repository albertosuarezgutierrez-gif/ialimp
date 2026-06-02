import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { genResetToken, hashToken } from '@/lib/auth'
import { getTransporter, MAIL_FROM } from '@/lib/mailer'

// POST /api/auth/forgot-password  (público; /api/auth está exento en middleware)
// Body { email }. Genera un token de recuperación y manda el enlace por email.
// Anti-enumeración: SIEMPRE responde el mismo mensaje genérico.

// ── Rate limiter en memoria (mismo patrón que /api/l/auth) ────────────
const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000

function getClientIP(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for')
  return (fwd?.split(',')[0] || 'unknown').trim()
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = attempts.get(ip)
  if (!entry || now > entry.resetAt) { attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS }); return true }
  if (entry.count >= MAX_ATTEMPTS) return false
  entry.count++
  return true
}

// Orden de prioridad si el mismo email existiera en varias tablas.
const ENTIDADES = [
  { type: 'empresa',    tabla: Prisma.sql`empresas`,         activa: Prisma.sql`activa` },
  { type: 'usuario',    tabla: Prisma.sql`usuarios_empresa`, activa: Prisma.sql`activo` },
  { type: 'superadmin', tabla: Prisma.sql`superadmins`,      activa: Prisma.sql`activo` },
] as const

const GENERICO = { ok: true, message: 'Si ese email tiene una cuenta, te hemos enviado un enlace para restablecer la contraseña.' }

export async function POST(req: Request) {
  try {
    const ip = getClientIP(req)
    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: 'Demasiados intentos. Espera unos minutos.' }, { status: 429 })
    }

    const { email } = await req.json().catch(() => ({}))
    const correo = (email || '').toString().trim().toLowerCase()
    if (!correo) return NextResponse.json({ error: 'Falta el email' }, { status: 400 })

    // Buscar la cuenta por prioridad (empresa → usuario → superadmin), solo activas.
    let match: { type: string; id: string } | null = null
    for (const e of ENTIDADES) {
      const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM ${e.tabla} WHERE email = ${correo} AND ${e.activa} = true LIMIT 1
      `)
      if (rows.length) { match = { type: e.type, id: rows[0].id }; break }
    }

    // Sin cuenta: responder genérico igualmente (no revelar si existe).
    if (!match) return NextResponse.json(GENERICO)

    // Token de un solo uso, caduca en 1h. Invalidar previos no usados de la cuenta.
    const tokenClaro = genResetToken()
    await prisma.$executeRaw(Prisma.sql`
      UPDATE password_reset_tokens SET used_at = now()
      WHERE entity_type = ${match.type} AND entity_id = ${match.id}::uuid AND used_at IS NULL
    `)
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO password_reset_tokens (token_hash, entity_type, entity_id, email, expires_at)
      VALUES (${hashToken(tokenClaro)}, ${match.type}, ${match.id}::uuid, ${correo}, now() + interval '1 hour')
    `)

    // Enviar email con el enlace (si SMTP no está configurado, no romper).
    const base = process.env.NEXTAUTH_URL || 'https://ialimp.vercel.app'
    const url  = `${base}/recuperar/${tokenClaro}`
    const transporter = getTransporter()
    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"IALIMP" <${MAIL_FROM}>`,
          to: correo,
          subject: 'Recupera tu contraseña — IALIMP',
          html: `
            <div style="font-family:'Nunito',-apple-system,sans-serif;max-width:480px;margin:0 auto;background:#f8fafc;padding:24px;border-radius:12px;">
              <div style="background:#4f46e5;color:white;padding:20px 24px;border-radius:10px;margin-bottom:20px;">
                <h1 style="margin:0;font-size:20px;font-weight:800;">🔑 Recupera tu contraseña</h1>
              </div>
              <p style="color:#475569;font-size:15px;line-height:1.6;">
                Hemos recibido una solicitud para restablecer la contraseña de tu cuenta de IALIMP.
                Pulsa el botón para crear una nueva:
              </p>
              <a href="${url}" style="display:block;background:#4f46e5;color:white;text-align:center;padding:13px;border-radius:8px;text-decoration:none;font-weight:700;margin:18px 0;">
                Crear nueva contraseña →
              </a>
              <p style="color:#94a3b8;font-size:12px;line-height:1.5;">
                Si el botón no funciona, copia y pega este enlace:<br>
                <span style="color:#6366f1;word-break:break-all;">${url}</span>
              </p>
              <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:18px;border-top:1px solid #e2e8f0;padding-top:14px;">
                Este enlace caduca en <strong>1 hora</strong> y solo puede usarse una vez.<br>
                Si no has solicitado este cambio, ignora este correo: tu contraseña no cambiará.
              </p>
            </div>
          `,
        })
      } catch (err: any) {
        console.error('Email recuperación error:', err.message)
      }
    } else {
      console.error('Recuperación: email no configurado (faltan credenciales SMTP)')
    }

    return NextResponse.json(GENERICO)
  } catch (e: any) {
    // No filtrar detalles: responder genérico también ante error interno.
    console.error('forgot-password error:', e.message)
    return NextResponse.json(GENERICO)
  }
}
