import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const year = new Date().getFullYear()

    // Import xlsx dynamically to avoid build errors if not installed
    let xlsx: any
    try {
      xlsx = await import('xlsx')
    } catch {
      return NextResponse.json({ error: 'xlsx no instalado. Añade "xlsx" a package.json' }, { status: 500 })
    }

    // Resultado anual
    const resultado = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        TO_CHAR(mes, 'Mon YYYY') AS Mes,
        ingresos_base AS Ingresos,
        gastos_base AS Gastos,
        (ingresos_base - gastos_base) AS Beneficio
      FROM v_contab_resultado
      WHERE empresa_id = ${empresa_id}::uuid
        AND EXTRACT(YEAR FROM mes) = ${year}
      ORDER BY mes
    `)

    // IVA anual
    const iva = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        TO_CHAR(mes, 'Mon YYYY') AS Mes,
        iva_repercutido AS "IVA repercutido",
        iva_soportado AS "IVA soportado",
        (iva_repercutido - iva_soportado) AS "A liquidar"
      FROM v_contab_iva
      WHERE empresa_id = ${empresa_id}::uuid
        AND EXTRACT(YEAR FROM mes) = ${year}
      ORDER BY mes
    `)

    // Crear workbook
    const wb = xlsx.utils.book_new()

    const wsRes = xlsx.utils.json_to_sheet(resultado)
    xlsx.utils.book_append_sheet(wb, wsRes, 'Resultado')

    const wsIva = xlsx.utils.json_to_sheet(iva)
    xlsx.utils.book_append_sheet(wb, wsIva, 'IVA')

    const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="contabilidad-${year}.xlsx"`,
      }
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
