import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()

    // Movimientos recientes (ingresos y gastos reales)
    const movimientos = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        id,
        fecha,
        concepto,
        importe,
        tipo,
        descripcion
      FROM v_contab_tesoreria
      WHERE empresa_id = ${empresa_id}::uuid
      ORDER BY fecha DESC
      LIMIT 100
    `)

    // Facturas/cobros pendientes
    const pendientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        im.id,
        im.periodo AS fecha,
        CONCAT('Factura ', im.periodo, ' — ', c.nombre) AS concepto,
        im.total_facturado AS importe,
        c.nombre AS cliente_nombre,
        'factura' AS origen
      FROM informes_mensuales im
      JOIN clientes c ON c.id = im.cliente_id
      WHERE im.empresa_id = ${empresa_id}::uuid
        AND (im.cobrado IS NULL OR im.cobrado = false)
        AND im.total_facturado > 0
      ORDER BY im.periodo DESC
      LIMIT 50
    `)

    return NextResponse.json({ movimientos, pendientes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
