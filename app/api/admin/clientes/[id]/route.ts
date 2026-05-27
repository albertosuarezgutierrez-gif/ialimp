import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// GET — detalle de un cliente con sus conexiones PMS y sesiones recientes
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    const [clientes, conexiones, sesiones_recientes, facturas] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM clientes
        WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM pms_connections
        WHERE cliente_id = ${id}::uuid
        ORDER BY created_at DESC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT cs.*, l.nombre as limpiadora_nombre
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.cliente_id = ${id}::uuid
        ORDER BY cs.session_date DESC
        LIMIT 10
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id, numero_factura, periodo_desde, periodo_hasta, total, estado, fecha_emision
        FROM facturas_clientes
        WHERE cliente_id = ${id}::uuid
        ORDER BY created_at DESC
        LIMIT 5
      `)
    ])

    if (!clientes.length) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    return NextResponse.json({
      cliente: clientes[0],
      conexiones,
      sesiones_recientes,
      facturas
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// PATCH — actualizar cliente
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const body = await req.json()
    const {
      nombre, tipo, contacto_nombre, contacto_tel,
      contacto_email, direccion, notas, activo
    } = body

    // Verificar que pertenece a esta empresa
    const check = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM clientes WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!check.length) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE clientes SET
        nombre          = COALESCE(${nombre || null}, nombre),
        tipo            = COALESCE(${tipo || null}, tipo),
        contacto_nombre = COALESCE(${contacto_nombre !== undefined ? contacto_nombre : null}, contacto_nombre),
        contacto_tel    = COALESCE(${contacto_tel    !== undefined ? contacto_tel    : null}, contacto_tel),
        contacto_email  = COALESCE(${contacto_email  !== undefined ? contacto_email  : null}, contacto_email),
        direccion       = COALESCE(${direccion        !== undefined ? direccion        : null}, direccion),
        notas           = COALESCE(${notas            !== undefined ? notas            : null}, notas),
        activo          = COALESCE(${activo           !== undefined ? activo           : null}, activo)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      RETURNING *
    `)

    return NextResponse.json({ ok: true, cliente: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — desactivar (soft delete)
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    // Verificar que no tiene sesiones pendientes
    const pendientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*) as count FROM cleaning_sessions
      WHERE cliente_id = ${id}::uuid
        AND completed_at IS NULL
        AND session_date >= CURRENT_DATE
    `)

    if (Number(pendientes[0]?.count) > 0) {
      return NextResponse.json({
        error: \`No se puede desactivar: tiene \${pendientes[0].count} sesiones pendientes\`
      }, { status: 409 })
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE clientes SET activo = false
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)

    // Desactivar también sus conexiones PMS
    await prisma.$executeRaw(Prisma.sql`
      UPDATE pms_connections SET activa = false WHERE cliente_id = ${id}::uuid
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
