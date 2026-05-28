import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const expedientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ex.id::text, ex.tipo, ex.descripcion, ex.fecha_inicio::text,
             ex.fecha_resolucion::text, ex.estado, ex.gravedad,
             l.nombre AS limpiadora_nombre
      FROM expedientes_rrhh ex
      LEFT JOIN limpiadoras l ON l.id = ex.limpiadora_id
      WHERE ex.empresa_id = ${empresa_id}::uuid
      ORDER BY ex.fecha_inicio DESC
    `)
    return NextResponse.json({ expedientes })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { limpiadora_id, tipo, descripcion, gravedad } = await req.json()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO expedientes_rrhh (empresa_id, limpiadora_id, tipo, descripcion, gravedad, estado)
      VALUES (${empresa_id}::uuid, ${limpiadora_id}::uuid, ${tipo}, ${descripcion}, ${gravedad || 'leve'}, 'abierto')
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
