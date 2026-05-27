import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Cron 9:30 UTC (11:30 CEST) — alertar si limpiadora no ha fichado entrada
export async function GET() {
  try {
    const hoy = new Date().toISOString().split('T')[0]

    const pendientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id::text,
        cs.property_name,
        cs.session_date::text,
        l.nombre AS limpiadora,
        l.telefono,
        e.nombre AS empresa,
        e.email  AS empresa_email,
        cs.empresa_id::text
      FROM cleaning_sessions cs
      JOIN limpiadoras l ON l.id = cs.limpiadora_id
      JOIN empresas    e ON e.id = cs.empresa_id
      WHERE cs.session_date = ${hoy}::date
        AND cs.started_at  IS NULL
        AND cs.completed_at IS NULL
        AND cs.empresa_id  IS NOT NULL
      ORDER BY cs.empresa_id, l.nombre
    `)

    if (pendientes.length === 0) {
      return NextResponse.json({ ok: true, alertas: 0 })
    }

    // Guardar alertas en BD
    for (const p of pendientes) {
      const titulo = '⚠️ ' + p.limpiadora + ' no ha fichado entrada'
      const desc   = p.property_name + ' — ' + hoy
      const datos  = JSON.stringify({ sesion_id: p.id, propiedad: p.property_name })

      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO alertas (empresa_id, tipo, titulo, descripcion, datos)
        VALUES (${p.empresa_id}::uuid, 'ausencia', ${titulo}, ${desc}, ${datos}::jsonb)
      `)
    }

    return NextResponse.json({ ok: true, alertas: pendientes.length, pendientes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
