import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { cliente_nombre, pms_tipo, ical_url } = await req.json()

    if (!cliente_nombre || !pms_tipo) {
      return NextResponse.json({ error: 'Faltan datos' }, { status: 400 })
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO pms_connections (empresa_id, cliente_nombre, pms_tipo, ical_url)
      VALUES (${empresa_id}::uuid, ${cliente_nombre}, ${pms_tipo}, ${ical_url || null})
      RETURNING id, cliente_nombre, pms_tipo
    `)

    // Lanzar sync inmediato si hay URL iCal
    if (ical_url) {
      fetch(\`\${process.env.NEXT_PUBLIC_APP_URL || ''}/api/pms/sync?connection_id=\${result[0].id}\`, {
        method: 'GET'
      }).catch(() => {})
    }

    return NextResponse.json({ ok: true, connection: result[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
