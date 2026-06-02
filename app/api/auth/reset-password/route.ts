import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { hashPassword, hashToken } from '@/lib/auth'

// /api/auth/reset-password  (público; /api/auth está exento en middleware)
// GET ?token=...  → valida el token y devuelve { ok, email enmascarado }
// POST { token, password } → fija la nueva contraseña y consume el token

// Tabla destino según entity_type (validado contra esta lista, nunca interpolado libre).
const TABLA: Record<string, ReturnType<typeof Prisma.sql>> = {
  empresa:    Prisma.sql`empresas`,
  usuario:    Prisma.sql`usuarios_empresa`,
  superadmin: Prisma.sql`superadmins`,
}

function enmascarar(email: string): string {
  const [u, d] = email.split('@')
  if (!d) return email
  const vis = u.slice(0, Math.min(2, u.length))
  return `${vis}${'•'.repeat(Math.max(1, u.length - vis.length))}@${d}`
}

async function buscarToken(token: string) {
  const t = (token || '').toString()
  if (!t) return null
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id, entity_type, entity_id, email
    FROM password_reset_tokens
    WHERE token_hash = ${hashToken(t)} AND used_at IS NULL AND expires_at > now()
    LIMIT 1
  `)
  return rows[0] || null
}

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get('token') || ''
    const row = await buscarToken(token)
    if (!row) return NextResponse.json({ ok: false })
    return NextResponse.json({ ok: true, email: enmascarar(row.email), entity_type: row.entity_type })
  } catch {
    return NextResponse.json({ ok: false })
  }
}

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json().catch(() => ({}))
    if (!password || password.toString().length < 8) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
    }

    const row = await buscarToken(token)
    if (!row) return NextResponse.json({ error: 'El enlace no es válido o ha caducado. Solicita uno nuevo.' }, { status: 400 })

    const tabla = TABLA[row.entity_type]
    if (!tabla) return NextResponse.json({ error: 'Tipo de cuenta no válido' }, { status: 400 })

    const hash = await hashPassword(password.toString())
    await prisma.$executeRaw(Prisma.sql`
      UPDATE ${tabla} SET password_hash = ${hash} WHERE id = ${row.entity_id}::uuid
    `)

    // Consumir este token e invalidar el resto de la cuenta.
    await prisma.$executeRaw(Prisma.sql`
      UPDATE password_reset_tokens SET used_at = now()
      WHERE entity_type = ${row.entity_type} AND entity_id = ${row.entity_id}::uuid AND used_at IS NULL
    `)

    return NextResponse.json({ ok: true, entity_type: row.entity_type })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
