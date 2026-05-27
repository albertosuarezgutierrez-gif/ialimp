import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// POST público — desde cotizador de la web
export async function POST(req: Request) {
  try {
    const { empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado } = await req.json()

    if (!nombre?.trim()) return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO leads (empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado)
      VALUES (
        ${empresa_id ? empresa_id + '::uuid' : null},
        ${nombre.trim()}, ${telefono || null}, ${email || null}, ${zona || null},
        ${tipo_servicio || null}, ${m2 ? Number(m2) : null}, ${frecuencia || null},
        ${precio_estimado ? Number(precio_estimado) : null}
      )
      RETURNING id
    `)

    return NextResponse.json({ ok: true, id: result[0]?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
