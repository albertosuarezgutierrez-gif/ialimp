import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT c.*, encode(gen_random_bytes(0),'hex') as _,
        '${`https://ialimp.vercel.app/propietario/`}' || c.access_token AS propietario_url
      FROM clientes c
      WHERE c.id = ${id}::uuid AND c.empresa_id = ${empresa_id}::uuid
    `)
    if (!result.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ cliente: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const { nombre, tipo, contacto_nombre, contacto_tel, contacto_email,
            direccion, notas, notif_email, notif_whatsapp, notif_activa } = await req.json()

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE clientes SET
        nombre           = COALESCE(${nombre            ?? null}, nombre),
        tipo             = COALESCE(${tipo              ?? null}, tipo),
        contacto_nombre  = COALESCE(${contacto_nombre  ?? null}, contacto_nombre),
        contacto_tel     = COALESCE(${contacto_tel     ?? null}, contacto_tel),
        contacto_email   = COALESCE(${contacto_email   ?? null}, contacto_email),
        direccion        = COALESCE(${direccion         ?? null}, direccion),
        notas            = COALESCE(${notas             ?? null}, notas),
        notif_email      = COALESCE(${notif_email      ?? null}, notif_email),
        notif_whatsapp   = COALESCE(${notif_whatsapp   ?? null}, notif_whatsapp),
        notif_activa     = COALESCE(${notif_activa     ?? null}, notif_activa)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      RETURNING *
    `)
    if (!result.length) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })
    return NextResponse.json({ ok: true, cliente: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
