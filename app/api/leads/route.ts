import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  return NextResponse.json({ ok: true, message: 'Endpoint público de leads' })
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'Nombre obligatorio' }, { status: 400 })
    }

    // empresa_id es UUID — usar cast solo si viene en el body
    const emp_val = empresa_id ? Prisma.sql`${empresa_id}::uuid` : Prisma.sql`NULL`

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO leads (empresa_id, nombre, telefono, email, zona, tipo_servicio, m2, frecuencia, precio_estimado, origen)
      SELECT
        ${emp_val} AS empresa_id,
        ${nombre.trim()} AS nombre,
        ${telefono || null} AS telefono,
        ${email    || null} AS email,
        ${zona     || null} AS zona,
        ${tipo_servicio || null} AS tipo_servicio,
        ${m2  ? Number(m2)  : null} AS m2,
        ${frecuencia || null} AS frecuencia,
        ${precio_estimado ? Number(precio_estimado) : null} AS precio_estimado,
        'cotizador' AS origen
      RETURNING id
    `)

    return NextResponse.json({ ok: true, id: result[0]?.id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
