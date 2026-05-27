import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const sesion_id = searchParams.get('sesion_id')

    const mensajes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM chat_mensajes
      WHERE empresa_id = ${empresa_id}::uuid
        ${sesion_id ? Prisma.sql`AND sesion_id = ${sesion_id}::uuid` : Prisma.sql``}
      ORDER BY creado_at ASC
      LIMIT 100
    `)

    // Marcar como leídos
    if (sesion_id) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE chat_mensajes SET leido = true
        WHERE sesion_id = ${sesion_id}::uuid AND empresa_id = ${empresa_id}::uuid
          AND remitente_tipo = 'limpiadora'
      `)
    }

    return NextResponse.json({ mensajes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { sesion_id, texto } = await req.json()

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO chat_mensajes (empresa_id, sesion_id, remitente_tipo, remitente_nombre, texto)
      VALUES (${empresa_id}::uuid, ${sesion_id ? sesion_id + '::uuid' : null}, 'admin', 'Sique Brilla', ${texto})
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
