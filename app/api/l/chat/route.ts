import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const jar = await cookies()
    const limpiadora_id = jar.get('limpiadora_id')?.value
    const empresa_id    = jar.get('empresa_id')?.value
    if (!limpiadora_id || !empresa_id) return NextResponse.json({ error: 'No auth' }, { status: 401 })

    const { searchParams } = new URL(req.url)
    const sesion_id = searchParams.get('sesion_id')

    const mensajes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM chat_mensajes WHERE empresa_id = ${empresa_id}::uuid
        ${sesion_id ? Prisma.sql`AND sesion_id = ${sesion_id}::uuid` : Prisma.sql`AND sesion_id IS NULL`}
      ORDER BY creado_at ASC LIMIT 100
    `)
    const noLeidos = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*) as n FROM chat_mensajes
      WHERE empresa_id = ${empresa_id}::uuid AND remitente_tipo = 'admin' AND leido = false
    `)

    // Marcar leídos
    await prisma.$executeRaw(Prisma.sql`
      UPDATE chat_mensajes SET leido = true
      WHERE empresa_id = ${empresa_id}::uuid AND remitente_tipo = 'admin'
        ${sesion_id ? Prisma.sql`AND sesion_id = ${sesion_id}::uuid` : Prisma.sql``}
    `)

    return NextResponse.json(serialize({ mensajes, no_leidos: Number(noLeidos[0]?.n || 0) }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const jar = await cookies()
    const limpiadora_id = jar.get('limpiadora_id')?.value
    const empresa_id    = jar.get('empresa_id')?.value
    if (!limpiadora_id || !empresa_id) return NextResponse.json({ error: 'No auth' }, { status: 401 })

    const { sesion_id, texto } = await req.json()
    const limp = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT nombre FROM limpiadoras WHERE id = ${limpiadora_id}::uuid`)
    const nombre = limp[0]?.nombre || 'Limpiadora'

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO chat_mensajes (empresa_id, sesion_id, remitente_tipo, remitente_id, remitente_nombre, texto)
      VALUES (${empresa_id}::uuid, ${sesion_id ? sesion_id + '::uuid' : null}, 'limpiadora', ${limpiadora_id}::uuid, ${nombre}, ${texto})
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
