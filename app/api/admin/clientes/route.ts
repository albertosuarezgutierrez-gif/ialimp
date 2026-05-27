import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// GET — listar clientes
export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const tipo    = searchParams.get('tipo')
    const activo  = searchParams.get('activo')
    const search  = searchParams.get('search')

    const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        c.*,
        COUNT(DISTINCT pc.id)  AS pms_count,
        COUNT(DISTINCT cs.id)  AS sesiones_total,
        COUNT(DISTINCT cs.id) FILTER (
          WHERE cs.session_date = CURRENT_DATE
        )                      AS sesiones_hoy
      FROM clientes c
      LEFT JOIN pms_connections pc
        ON pc.cliente_id = c.id AND pc.activa = true
      LEFT JOIN cleaning_sessions cs
        ON cs.cliente_id = c.id
      WHERE c.empresa_id = ${empresa_id}::uuid
        ${activo !== null ? Prisma.sql`AND c.activo = ${activo === 'true'}` : Prisma.sql``}
        ${tipo ? Prisma.sql`AND c.tipo = ${tipo}` : Prisma.sql``}
        ${search ? Prisma.sql`AND (
          c.nombre ILIKE ${'%' + search + '%'}
          OR c.contacto_nombre ILIKE ${'%' + search + '%'}
          OR c.contacto_email  ILIKE ${'%' + search + '%'}
          OR c.direccion       ILIKE ${'%' + search + '%'}
        )` : Prisma.sql``}
      GROUP BY c.id
      ORDER BY c.activo DESC, c.nombre ASC
    `)

    return NextResponse.json({ clientes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — crear cliente
export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const body = await req.json()
    const {
      nombre, tipo = 'apartamentos_turisticos',
      contacto_nombre, contacto_tel, contacto_email,
      direccion, notas
    } = body

    if (!nombre?.trim()) {
      return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
    }

    const TIPOS_VALIDOS = ['apartamentos_turisticos','comunidad','final_obra','oficinas','otro']
    if (!TIPOS_VALIDOS.includes(tipo)) {
      return NextResponse.json({ error: 'Tipo de cliente no válido' }, { status: 400 })
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO clientes (
        empresa_id, nombre, tipo,
        contacto_nombre, contacto_tel, contacto_email,
        direccion, notas
      ) VALUES (
        ${empresa_id}::uuid, ${nombre.trim()}, ${tipo},
        ${contacto_nombre || null}, ${contacto_tel || null}, ${contacto_email || null},
        ${direccion || null}, ${notas || null}
      )
      RETURNING *
    `)

    return NextResponse.json({ ok: true, cliente: result[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
