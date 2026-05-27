import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const desde      = searchParams.get('desde') || new Date().toISOString().split('T')[0]
    const hasta      = searchParams.get('hasta') || desde
    const limp_id    = searchParams.get('limpiadora_id')

    const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id, cs.session_date::text, cs.property_name,
        cs.started_at, cs.completed_at,
        cs.hora_checkout::text AS hora_checkout,
        cs.limpiadora_id::text,
        cs.propiedad_id::text,
        cs.num_huespedes,
        l.nombre AS limpiadora_nombre
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      WHERE cs.empresa_id = ${empresa_id}::uuid
        AND cs.session_date BETWEEN ${desde}::date AND ${hasta}::date
        ${limp_id ? Prisma.sql`AND cs.limpiadora_id = ${limp_id}::uuid` : Prisma.sql``}
      ORDER BY cs.session_date, cs.hora_checkout NULLS LAST
    `)
    return NextResponse.json({ sesiones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
