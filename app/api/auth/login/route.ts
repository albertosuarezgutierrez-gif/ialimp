import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { verifyPassword, createSessionToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()
    if (!email || !password) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })

    const empresas = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre, email, password_hash, activa
      FROM empresas WHERE email = ${email.toLowerCase()}
      LIMIT 1
    `)

    if (!empresas.length) return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })
    const empresa = empresas[0]
    if (!empresa.activa) return NextResponse.json({ error: 'Cuenta desactivada' }, { status: 403 })

    const ok = await verifyPassword(password, empresa.password_hash)
    if (!ok) return NextResponse.json({ error: 'Email o contraseña incorrectos' }, { status: 401 })

    const token = await createSessionToken(empresa.id, empresa.email)
    const cookieStore = await cookies()
    cookieStore.set('ialimp_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax'
    })

    return NextResponse.json({ ok: true, empresa: { id: empresa.id, nombre: empresa.nombre } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
