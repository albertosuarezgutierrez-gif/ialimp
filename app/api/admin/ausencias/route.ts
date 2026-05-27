import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Cron 11:30 — alertar si limpiadora no ha fichado entrada
export async function GET() {
  try {
    const hoy = new Date().toISOString().split('T')[0]

    // Sesiones de hoy sin started_at (no han fichado entrada a las 11:30)
    const pendientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id, cs.property_name, cs.session_date::text,
        l.nombre AS limpiadora, l.telefono,
        e.nombre AS empresa, e.email AS empresa_email
      FROM cleaning_sessions cs
      JOIN limpiadoras l ON l.id = cs.limpiadora_id
      JOIN empresas e ON e.id = cs.empresa_id
      WHERE cs.session_date = ${hoy}::date
        AND cs.started_at IS NULL
        AND cs.completed_at IS NULL
      ORDER BY cs.empresa_id, l.nombre
    `)

    if (pendientes.length === 0) {
      return NextResponse.json({ ok: true, alertas: 0 })
    }

    // Agrupar por empresa para enviar un email por empresa
    const porEmpresa: Record<string, any[]> = {}
    for (const p of pendientes) {
      if (!porEmpresa[p.empresa_email]) porEmpresa[p.empresa_email] = []
      porEmpresa[p.empresa_email].push(p)
    }

    // Guardar alertas en BD
    for (const p of pendientes) {
      await prisma.$executeRaw(Prisma.sql\`
        INSERT INTO alertas (empresa_id, tipo, titulo, descripcion, datos)
        SELECT cs.empresa_id, 'ausencia',
          \${'⚠️ ' + p.limpiadora + ' no ha fichado entrada'},
          \${p.property_name + ' — ' + hoy},
          \${JSON.stringify({ limpiadora_id: p.id, propiedad: p.property_name })}::jsonb
        FROM cleaning_sessions cs WHERE cs.id = \${p.id}::uuid
        ON CONFLICT DO NOTHING
      \`)
    }

    return NextResponse.json({ ok: true, alertas: pendientes.length, pendientes })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
