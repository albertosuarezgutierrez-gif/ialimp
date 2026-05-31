import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const body = await req.json().catch(() => null)

  // El acceso exige aceptar términos. Lo comercial es opcional.
  if (!body?.acepto_terminos) {
    return NextResponse.json(
      { error: 'Debes aceptar la política de privacidad y las condiciones para acceder.' },
      { status: 400 }
    )
  }

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM clientes WHERE access_token = ${token} LIMIT 1
  `)
  if (!rows.length) {
    return NextResponse.json({ error: 'Enlace no válido.' }, { status: 404 })
  }

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    null
  const aceptaComercial = Boolean(body.acepto_comercial)
  const version = typeof body.consent_version === 'string' ? body.consent_version : null

  await prisma.$executeRaw(Prisma.sql`
    UPDATE clientes SET
      acepto_terminos        = true,
      acepto_terminos_fecha  = now(),
      acepto_comercial       = ${aceptaComercial},
      acepto_comercial_fecha = ${aceptaComercial ? new Date() : null},
      consent_ip             = ${ip},
      consent_version        = ${version},
      consent_canal          = 'portal'
    WHERE id = ${rows[0].id}::uuid
  `)

  return NextResponse.json({ ok: true })
}
