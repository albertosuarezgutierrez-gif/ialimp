import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
    const limp = searchParams.get('limpiadora_id')
    const cp   = searchParams.get('codigo_postal')

    const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id, cs.session_date, cs.property_name, cs.tipo_servicio, cs.origen,
        cs.hora_inicio, cs.hora_checkout, cs.hora_checkin_siguiente,
        cs.ventana_minutos, cs.alerta_ventana,
        cs.started_at, cs.completed_at, cs.notas,
        cs.limpiadora_id, cs.propiedad_id, cs.cliente_id,
        p.codigo_postal, p.duracion_estimada_min, p.flexibilidad_horaria,
        p.hora_pactada,
        l.nombre AS limpiadora_nombre,
        c.nombre AS cliente_nombre,
        c.tipo   AS cliente_tipo
      FROM cleaning_sessions cs
      LEFT JOIN propiedades p ON p.id = cs.propiedad_id
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      LEFT JOIN clientes    c ON c.id = cs.cliente_id
      WHERE cs.empresa_id = ${empresa_id}::uuid
        AND cs.session_date = ${date}::date
        ${limp ? Prisma.sql`AND cs.limpiadora_id = ${limp}::uuid` : Prisma.sql``}
        ${cp   ? Prisma.sql`AND p.codigo_postal = ${cp}`          : Prisma.sql``}
      ORDER BY
        cs.limpiadora_id NULLS LAST,
        p.codigo_postal NULLS LAST,
        COALESCE(cs.hora_checkout, cs.hora_inicio, p.hora_pactada) NULLS LAST
    `)

    // Agrupar por limpiadora
    const grupos: Record<string, any> = {}
    for (const s of sesiones) {
      const key = s.limpiadora_id || '__sin_asignar__'
      if (!grupos[key]) {
        grupos[key] = {
          limpiadora_id:     s.limpiadora_id,
          limpiadora_nombre: s.limpiadora_nombre || 'Sin asignar',
          sesiones:          [],
          alertas:           0,
          minutos_total:     0,
          cps:               new Set<string>()
        }
      }
      grupos[key].sesiones.push(s)
      if (s.alerta_ventana)   grupos[key].alertas++
      grupos[key].minutos_total += Number(s.duracion_estimada_min || 120)
      if (s.codigo_postal)    grupos[key].cps.add(s.codigo_postal)
    }

    const agenda = Object.values(grupos).map((g: any) => ({
      ...g,
      cps: Array.from(g.cps),
      horas_total: (g.minutos_total / 60).toFixed(1)
    }))

    return NextResponse.json({
      agenda,
      stats: {
        total:           sesiones.length,
        sin_asignar:     sesiones.filter(s => !s.limpiadora_id).length,
        alertas_ventana: sesiones.filter((s: any) => s.alerta_ventana).length,
        completadas:     sesiones.filter((s: any) => s.completed_at).length,
      },
      date
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
