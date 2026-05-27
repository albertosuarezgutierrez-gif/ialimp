import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

async function getLimpiadora() {
  const jar = await cookies()
  const token = jar.get('limpiadora_token')?.value
  if (!token) return null
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT s.limpiadora_id::text, l.empresa_id::text, l.nombre
    FROM limpiadora_sessions s JOIN limpiadoras l ON l.id = s.limpiadora_id
    WHERE s.token::text = ${token}
      AND l.empresa_id IS NOT NULL
    LIMIT 1
  `)
  return rows[0] || null
}

export async function GET(req: Request) {
  try {
    const l = await getLimpiadora()
    if (!l) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const { searchParams } = new URL(req.url)
    const sesion_id = searchParams.get('sesion_id')
    const mensajes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM chat_mensajes WHERE empresa_id = ${l.empresa_id}::uuid
        ${sesion_id ? Prisma.sql`AND sesion_id = ${sesion_id}::uuid` : Prisma.sql`AND sesion_id IS NULL`}
      ORDER BY creado_at ASC LIMIT 100
    `)
    const noLeidos = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*) as n FROM chat_mensajes
      WHERE empresa_id = ${l.empresa_id}::uuid AND remitente_tipo = 'admin' AND leido = false
    `)
    await prisma.$executeRaw(Prisma.sql`
      UPDATE chat_mensajes SET leido = true
      WHERE empresa_id = ${l.empresa_id}::uuid AND remitente_tipo = 'admin'
        ${sesion_id ? Prisma.sql`AND sesion_id = ${sesion_id}::uuid` : Prisma.sql`AND sesion_id IS NULL`}
    `)
    return NextResponse.json({ mensajes, no_leidos: Number(noLeidos[0]?.n || 0) })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: Request) {
  try {
    const l = await getLimpiadora()
    if (!l) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    const { sesion_id, texto } = await req.json()
    if (!texto?.trim()) return NextResponse.json({ error: 'Texto vacío' }, { status: 400 })
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO chat_mensajes
        (empresa_id, sesion_id, remitente_tipo, remitente_id, remitente_nombre, texto)
      VALUES (
        ${l.empresa_id}::uuid,
        ${sesion_id || null},
        'limpiadora',
        ${l.limpiadora_id}::uuid,
        ${l.nombre},
        ${texto.trim()}
      )
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
