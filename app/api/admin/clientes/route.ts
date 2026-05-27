import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT c.*, COUNT(DISTINCT p.id)::int AS num_propiedades
      FROM clientes c LEFT JOIN propiedades p ON p.cliente_id = c.id
      WHERE c.empresa_id = ${empresa_id}::uuid
      GROUP BY c.id ORDER BY c.nombre
    `)
    return NextResponse.json({ clientes })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
