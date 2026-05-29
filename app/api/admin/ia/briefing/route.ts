import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { aiComplete } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const hoy     = new Date().toISOString().split('T')[0]
    const manana  = new Date(Date.now() + 86400000).toISOString().split('T')[0]
    const diaNombre = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

    // Recoger todos los datos en paralelo
    const [sesionesHoy, sesionesManana, alertas, quejas, stock, empresa] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT cs.property_name, cs.hora_inicio, cs.tipo_servicio,
               cs.completed_at IS NOT NULL AS completada,
               cs.limpiadora_id IS NULL    AS sin_asignar,
               l.nombre AS limpiadora_nombre
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.empresa_id = ${empresa_id}::uuid
          AND cs.session_date = ${hoy}::date
        ORDER BY cs.hora_inicio ASC NULLS LAST
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT cs.property_name, cs.hora_inicio,
               cs.limpiadora_id IS NULL AS sin_asignar,
               l.nombre AS limpiadora_nombre
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.empresa_id = ${empresa_id}::uuid
          AND cs.session_date = ${manana}::date
        ORDER BY cs.hora_inicio ASC NULLS LAST
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT tipo, COALESCE(titulo, descripcion, tipo) AS mensaje FROM alertas
        WHERE empresa_id = ${empresa_id}::uuid AND leida = false
        ORDER BY creada_at DESC LIMIT 5
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT descripcion, severidad FROM quejas
        WHERE empresa_id = ${empresa_id}::uuid AND estado = 'pendiente'
        ORDER BY creada_at DESC LIMIT 3
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT nombre, stock_actual, stock_minimo FROM productos_stock
        WHERE empresa_id = ${empresa_id}::uuid
          AND stock_actual <= stock_minimo AND activo = true
        LIMIT 5
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT nombre FROM empresas WHERE id = ${empresa_id}::uuid
      `)
    ])

    // KPIs para el briefing
    const kpis = {
      sesiones_hoy_total:    sesionesHoy.length,
      sesiones_hoy_ok:       sesionesHoy.filter((s: any) => !s.sin_asignar).length,
      sesiones_hoy_sin:      sesionesHoy.filter((s: any) => s.sin_asignar).length,
      sesiones_hoy_hechas:   sesionesHoy.filter((s: any) => s.completada).length,
      sesiones_manana_total: sesionesManana.length,
      sesiones_manana_sin:   sesionesManana.filter((s: any) => s.sin_asignar).length,
      alertas_pendientes:    alertas.length,
      quejas_pendientes:     quejas.length,
      productos_bajo_stock:  stock.length,
    }

    // Construir contexto para la IA
    const sesionesTexto = sesionesHoy.length
      ? sesionesHoy.map((s: any) =>
          `• ${s.property_name} (${s.tipo_servicio || 'limpieza'})` +
          (s.hora_inicio ? ` a las ${String(s.hora_inicio).slice(0, 5)}` : ' sin hora') +
          (s.sin_asignar ? ' ⚠️ SIN ASIGNAR' : ` → ${s.limpiadora_nombre}`) +
          (s.completada ? ' ✅' : '')
        ).join('\n')
      : 'Sin sesiones programadas hoy'

    const mananaTexto = sesionesManana.length
      ? sesionesManana.map((s: any) =>
          `• ${s.property_name}` +
          (s.sin_asignar ? ' ⚠️ sin asignar' : ` → ${s.limpiadora_nombre}`)
        ).join('\n')
      : 'Sin sesiones mañana'

    const alertasTexto = alertas.length
      ? alertas.map((a: any) => `• ${a.mensaje}`).join('\n')
      : 'Sin alertas pendientes'

    const quejasTexto = quejas.length
      ? quejas.map((q: any) => `• [${q.severidad || 'media'}] ${q.descripcion}`).join('\n')
      : 'Sin quejas pendientes'

    const stockTexto = stock.length
      ? stock.map((p: any) => `• ${p.nombre}: ${p.stock_actual} uds (mín ${p.stock_minimo})`).join('\n')
      : 'Stock OK'

    const prompt = `Eres el asistente de coordinación de "${empresa[0]?.nombre || 'la empresa'}".
Genera un briefing diario conciso para la coordinadora. Hoy es ${diaNombre}.
Tono: directo, profesional, útil. Máximo 120 palabras. Sin títulos ni bullets — solo prosa natural en 2-3 frases por bloque.

Datos de hoy:
SESIONES HOY (${kpis.sesiones_hoy_total} total, ${kpis.sesiones_hoy_sin} sin asignar):
${sesionesTexto}

MAÑANA (${kpis.sesiones_manana_total} sesiones, ${kpis.sesiones_manana_sin} sin asignar):
${mananaTexto}

ALERTAS ACTIVAS (${kpis.alertas_pendientes}):
${alertasTexto}

QUEJAS PENDIENTES (${kpis.quejas_pendientes}):
${quejasTexto}

STOCK BAJO (${kpis.productos_bajo_stock} productos):
${stockTexto}

Empieza directamente con el resumen. Si todo va bien, dilo con confianza. Si hay problemas urgentes, destácalos primero.`

    let resumen = ''
    try {
      resumen = (await aiComplete(prompt)).trim()
    } catch (_) {
      // Fallback sin IA
      const partes = []
      if (kpis.sesiones_hoy_total === 0) {
        partes.push('Sin sesiones programadas para hoy.')
      } else {
        partes.push(`Hoy hay ${kpis.sesiones_hoy_total} sesión${kpis.sesiones_hoy_total > 1 ? 'es' : ''}.` +
          (kpis.sesiones_hoy_sin > 0 ? ` ⚠️ ${kpis.sesiones_hoy_sin} sin asignar.` : ' Todas asignadas ✅'))
      }
      if (kpis.quejas_pendientes > 0) partes.push(`${kpis.quejas_pendientes} queja${kpis.quejas_pendientes > 1 ? 's' : ''} pendiente${kpis.quejas_pendientes > 1 ? 's' : ''}.`)
      if (kpis.productos_bajo_stock > 0) partes.push(`${kpis.productos_bajo_stock} producto${kpis.productos_bajo_stock > 1 ? 's' : ''} bajo mínimo de stock.`)
      resumen = partes.join(' ')
    }

    return NextResponse.json({
      ok: true,
      fecha: hoy,
      dia: diaNombre,
      resumen,
      kpis,
      detalle: {
        sesiones_hoy:   sesionesHoy,
        sesiones_manana: sesionesManana,
        alertas,
        quejas,
        stock
      }
    })

  } catch (e: any) {
    console.error('[briefing] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
