import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const { estado } = await req.json()
    const extra = estado === 'en_lavanderia' ? Prisma.sql`, lavanderia_envio_at = NOW()` : estado === 'limpio' ? Prisma.sql`, lavanderia_vuelta_at = NOW()` : Prisma.sql``
    await prisma.$executeRaw(Prisma.sql`UPDATE lenceria_items SET estado = ${estado}${extra} WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid`)
    return NextResponse.json({ ok: true })
  } catch (e: any) { return NextResponse.json({ error: e.message }, { status: 500 }) }
}
