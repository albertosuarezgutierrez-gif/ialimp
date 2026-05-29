
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const cliente = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, nombre FROM clientes WHERE access_token = ${token} LIMIT 1
    `)
    if (!cliente.length) return NextResponse.json({ error: 'Token inválido' }, { status: 404 })

    const { searchParams } = new URL(req.url)
    // Por defecto: 60 días atrás + todo el futuro
    const desde = searchParams.get('desde') || (() => {
      const d = new Date(); d.setDate(d.getDate() - 60); return d.toISOString().split('T')[0]
    })()
    const hasta = searchParams.get('hasta') || '2099-12-31'

    const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id::text,
        cs.session_date::text,
        cs.property_name,
        p.nombre            AS propiedad_nombre,
        p.direccion         AS direccion,
        cs.started_at,
        cs.completed_at,
        cs.hora_checkout::text    AS hora_checkout,
        cs.hora_checkin::text     AS hora_checkin,
        l.nombre            AS limpiadora_nombre,
        cs.num_huespedes,
        cs.incidencias,
        cs.propiedad_id::text,
        CASE
          WHEN cs.completed_at IS NOT NULL THEN 'completada'
          WHEN cs.started_at   IS NOT NULL THEN 'en_curso'
          ELSE 'pendiente'
        END AS estado
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id  = cs.limpiadora_id
      LEFT JOIN propiedades p ON p.id  = cs.propiedad_id
      WHERE cs.cliente_id = ${cliente[0].id}::uuid
        AND cs.session_date BETWEEN ${desde}::date AND ${hasta}::date
      ORDER BY cs.session_date ASC, cs.hora_checkout NULLS LAST
    `)

    return NextResponse.json({ sesiones, cliente: cliente[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
