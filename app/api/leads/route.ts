import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const APP_URL = process.env.NEXTAUTH_URL || 'https://ialimp.vercel.app'

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

    const lead_id = result[0]?.id

    // Disparar agente-cotizador en background si hay empresa_id y precio
    if (empresa_id && lead_id && precio_estimado) {
      fetch(APP_URL + '/api/admin/ia/agente-cotizador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lead_id, empresa_id })
      }).catch(() => { /* agente no crítico */ })
    }

    return NextResponse.json({ ok: true, id: lead_id }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
