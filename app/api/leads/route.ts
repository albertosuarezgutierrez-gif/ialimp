import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// GET para el admin (sin auth para el cotizador público)
export async function GET() {
  return NextResponse.json({ ok: true, message: 'Use POST para crear lead' })
}

// POST público — desde cotizador de la web (sin autenticación)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO leads (empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado, origen)
      VALUES (
        ${empresa_id || null},
        ${nombre.trim()},
        ${telefono || null},
        ${email    || null},
        ${zona     || null},
        ${tipo_servicio || null},
        ${m2 ? Number(m2) : null},
        ${frecuencia || null},
        ${precio_estimado ? Number(precio_estimado) : null},
        'cotizador'
      )
      RETURNING id
    `)

    return NextResponse.json({ ok: true, id: result[0]?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
