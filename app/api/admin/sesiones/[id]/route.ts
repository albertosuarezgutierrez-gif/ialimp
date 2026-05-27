import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// PATCH — editar sesión
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const { property_name, session_date, hora_inicio, limpiadora_id, tipo_servicio, notas } = await req.json()

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE cleaning_sessions SET
        property_name = COALESCE(${property_name ?? null}, property_name),
        session_date  = COALESCE(${session_date  ? session_date + '::date' : null}, session_date),
        hora_inicio   = COALESCE(${hora_inicio   ?? null}, hora_inicio),
        limpiadora_id = COALESCE(${limpiadora_id ? limpiadora_id + '::uuid' : null}, limpiadora_id),
        tipo_servicio = COALESCE(${tipo_servicio ?? null}, tipo_servicio),
        notas         = COALESCE(${notas         ?? null}, notas)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      RETURNING *
    `)

    if (!result.length) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })
    return NextResponse.json({ ok: true, sesion: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — eliminar sesión (solo manuales o si no ha empezado)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    const check = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, started_at, origen FROM cleaning_sessions
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!check.length) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    if (check[0].started_at) return NextResponse.json({ error: 'No se puede eliminar: ya empezó' }, { status: 409 })

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM cleaning_sessions WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
