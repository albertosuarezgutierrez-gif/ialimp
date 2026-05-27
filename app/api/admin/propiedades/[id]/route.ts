import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    const [props, sesiones] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT p.*, c.nombre AS cliente_nombre
        FROM propiedades p JOIN clientes c ON c.id = p.cliente_id
        WHERE p.id = ${id}::uuid AND p.empresa_id = ${empresa_id}::uuid
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT cs.*, l.nombre AS limpiadora_nombre
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.propiedad_id = ${id}::uuid
        ORDER BY cs.session_date DESC LIMIT 20
      `)
    ])

    if (!props.length) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ propiedad: props[0], sesiones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const {
      nombre, tipo, direccion, m2, habitaciones,
      pms_connection_id, pms_propiedad_id,
      zonas, precio_limpieza, notas, activa
    } = await req.json()

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE propiedades SET
        nombre            = COALESCE(${nombre            ?? null}, nombre),
        tipo              = COALESCE(${tipo              ?? null}, tipo),
        direccion         = COALESCE(${direccion         ?? null}, direccion),
        m2                = COALESCE(${m2                ?? null}, m2),
        habitaciones      = COALESCE(${habitaciones      ?? null}, habitaciones),
        pms_propiedad_id  = COALESCE(${pms_propiedad_id  ?? null}, pms_propiedad_id),
        precio_limpieza   = COALESCE(${precio_limpieza   ?? null}, precio_limpieza),
        notas             = COALESCE(${notas             ?? null}, notas),
        activa            = COALESCE(${activa            ?? null}, activa)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      RETURNING *
    `)

    if (!result.length) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })
    return NextResponse.json({ ok: true, propiedad: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    const pendientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*) as count FROM cleaning_sessions
      WHERE propiedad_id = ${id}::uuid
        AND completed_at IS NULL AND session_date >= CURRENT_DATE
    `)

    if (Number(pendientes[0]?.count) > 0) {
      return NextResponse.json(
        { error: 'Tiene ' + pendientes[0].count + ' sesiones pendientes' },
        { status: 409 }
      )
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE propiedades SET activa = false
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
