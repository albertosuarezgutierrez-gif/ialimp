import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const items = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT l.*, p.nombre AS propiedad_nombre
      FROM lenceria_items l LEFT JOIN propiedades p ON p.id = l.propiedad_id
      WHERE l.empresa_id = ${empresa_id}::uuid
      ORDER BY l.estado, l.tipo
    `)
    return NextResponse.json(serialize({ items }))
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { tipo, cantidad, propiedad_id } = await req.json()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO lenceria_items (empresa_id, tipo, cantidad, propiedad_id)
      VALUES (${empresa_id}::uuid, ${tipo}, ${Number(cantidad)}, ${propiedad_id ? propiedad_id + '::uuid' : null})
    `)
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
