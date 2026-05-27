import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// GET — sesiones por fecha (para el dashboard)
export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const date  = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const desde = searchParams.get('desde') || date
    const hasta = searchParams.get('hasta') || date

    const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.*,
        l.nombre  AS limpiadora_nombre,
        c.nombre  AS cliente_nombre,
        c.tipo    AS cliente_tipo
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      LEFT JOIN clientes     c ON c.id = cs.cliente_id
      WHERE cs.empresa_id = ${empresa_id}::uuid
        AND cs.session_date BETWEEN ${desde}::date AND ${hasta}::date
      ORDER BY cs.session_date ASC, cs.hora_inicio ASC NULLS LAST, l.nombre ASC
    `)

    return NextResponse.json({ sesiones })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — crear sesión manual (desde WhatsApp o cualquier fuente)
export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const {
      cliente_id, property_name, session_date,
      hora_inicio, limpiadora_id, tipo_servicio, notas
    } = await req.json()

    if (!property_name?.trim() || !session_date) {
      return NextResponse.json({ error: 'Propiedad y fecha son obligatorias' }, { status: 400 })
    }

    // Verificar cliente si se envía
    if (cliente_id) {
      const check = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM clientes
        WHERE id = ${cliente_id}::uuid AND empresa_id = ${empresa_id}::uuid
      `)
      if (!check.length) return NextResponse.json({ error: 'Cliente no válido' }, { status: 403 })
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO cleaning_sessions (
        empresa_id, cliente_id, property_name, session_date,
        hora_inicio, limpiadora_id, tipo_servicio, notas, origen
      ) VALUES (
        ${empresa_id}::uuid,
        ${cliente_id ? cliente_id : null}::uuid,
        ${property_name.trim()},
        ${session_date}::date,
        ${hora_inicio || null},
        ${limpiadora_id ? limpiadora_id : null}::uuid,
        ${tipo_servicio || 'rotacion'},
        ${notas || null},
        'manual'
      )
      RETURNING *
    `)

    return NextResponse.json({ ok: true, sesion: result[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
