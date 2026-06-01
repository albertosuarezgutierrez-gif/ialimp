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
        TO_CHAR(mes, 'YYYY-MM') AS mes,
        TO_CHAR(mes, 'Mon YYYY') AS mes_label,
        iva_repercutido AS repercutido,
        iva_soportado   AS soportado,
        (iva_repercutido - iva_soportado) AS liquidar
      FROM v_contab_iva
      WHERE empresa_id = ${empresa_id}::uuid
        AND EXTRACT(YEAR FROM mes) = ${year}
      ORDER BY mes
    `)

    return NextResponse.json({ rows })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
