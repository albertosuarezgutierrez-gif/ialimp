import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const body = await req.json()
    const { id, tipo, pagado } = body

    if (!id) {
      return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    }

    if (tipo === 'factura' || tipo === 'informe') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE informes_mensuales
        SET cobrado = ${pagado}
        WHERE id = ${id}::uuid
          AND empresa_id = ${empresa_id}::uuid
      `)
    } else if (tipo === 'gasto') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE gastos
        SET pagado = ${pagado}
        WHERE id = ${id}::uuid
          AND empresa_id = ${empresa_id}::uuid
      `)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
