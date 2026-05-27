import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

async function getCliente(token: string) {
  const r = await prisma.$queryRaw<any[]>(Prisma.sql`SELECT id, nombre, empresa_id FROM clientes WHERE access_token = ${token}`)
  return r[0] || null
}

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const cliente = await getCliente(token)
    if (!cliente) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })

    const mensajes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM chat_mensajes
      WHERE empresa_id = ${cliente.empresa_id}::uuid AND sesion_id IS NULL
      ORDER BY creado_at ASC LIMIT 100
    `)
    await prisma.$executeRaw(Prisma.sql`
      UPDATE chat_mensajes SET leido = true
      WHERE empresa_id = ${cliente.empresa_id}::uuid AND sesion_id IS NULL AND remitente_tipo = 'admin'
    `)
    return NextResponse.json({ mensajes })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const cliente = await getCliente(token)
    if (!cliente) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    const { texto } = await req.json()
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO chat_mensajes (empresa_id, sesion_id, remitente_tipo, remitente_nombre, texto)
      VALUES (${cliente.empresa_id}::uuid, NULL, 'propietario', ${cliente.nombre}, ${texto})
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
