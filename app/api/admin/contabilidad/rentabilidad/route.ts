import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        propiedad,
        ingresos,
        gastos,
        (ingresos - gastos) AS beneficio,
        CASE WHEN ingresos > 0
             THEN ROUND(((ingresos - gastos) / ingresos * 100)::numeric, 1)
             ELSE 0 END AS margen_pct
      FROM v_contab_rentabilidad
      WHERE empresa_id = ${empresa_id}::uuid
        AND anno = ${year}
      ORDER BY ingresos DESC
    `)

    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
