import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { aiComplete } from '@/lib/ai-client'

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { limpiadora_id } = await req.json()

    // Recoger datos de la limpiadora
    const [rendimiento, quejas, sesiones, expedientes] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT * FROM rendimiento_limpiadoras
        WHERE limpiadora_id = ${limpiadora_id}::uuid AND empresa_id = ${empresa_id}::uuid
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT q.descripcion, q.categoria, q.estado, q.creada_at, p.nombre AS propiedad
        FROM quejas q LEFT JOIN propiedades p ON p.id = q.propiedad_id
        WHERE q.limpiadora_id = ${limpiadora_id}::uuid
          AND q.empresa_id = ${empresa_id}::uuid
        ORDER BY q.creada_at DESC LIMIT 20
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT session_date, property_name, tipo_servicio,
          CASE WHEN completed_at IS NOT NULL THEN 'completada' ELSE 'pendiente' END AS estado
        FROM cleaning_sessions
        WHERE limpiadora_id = ${limpiadora_id}::uuid
          AND session_date >= CURRENT_DATE - 60
        ORDER BY session_date DESC LIMIT 30
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT tipo, titulo, descripcion, creada_at FROM expedientes_rrhh
        WHERE limpiadora_id = ${limpiadora_id}::uuid
          AND empresa_id = ${empresa_id}::uuid
        ORDER BY creada_at DESC LIMIT 10
      `)
    ])

    if (!rendimiento.length) {
      return NextResponse.json({ error: 'Limpiadora no encontrada' }, { status: 404 })
    }

    const r = rendimiento[0]
    const prompt = `Eres el sistema de RRHH de una empresa de limpieza profesional española llamada Sique Brilla.
Analiza el rendimiento de esta limpiadora y proporciona un informe profesional en español.

DATOS DE LA LIMPIADORA:
- Nombre: ${r.limpiadora_nombre}
- Total sesiones: ${r.total_sesiones} (${r.sesiones_mes} último mes)
- Sesiones completadas: ${r.sesiones_completadas}
- Rating medio: ${r.rating_medio || 'Sin rating'} ⭐ (${r.rating_mes || 'Sin datos'} este mes)
- Quejas totales: ${r.total_quejas} (${r.quejas_mes} este mes, ${r.quejas_pendientes} pendientes)
- Última limpieza: ${r.ultima_limpieza || 'Sin datos'}

QUEJAS RECIENTES (últimas 20):
${quejas.map((q: any) => `- [${q.categoria}] ${q.descripcion} → ${q.estado} (${q.propiedad || 'prop. desconocida'})`).join('
') || 'Sin quejas'}

ÚLTIMAS SESIONES (60 días):
${sesiones.map((s: any) => `- ${s.session_date}: ${s.property_name} [${s.tipo_servicio}] → ${s.estado}`).join('
') || 'Sin sesiones'}

EXPEDIENTE PREVIO:
${expedientes.map((e: any) => `- [${e.tipo}] ${e.titulo}`).join('
') || 'Sin expediente previo'}

Responde SOLO con un objeto JSON con esta estructura exacta (sin markdown, sin explicaciones):
{
  "resumen": "2-3 frases de evaluación general",
  "puntos_fuertes": ["punto1", "punto2"],
  "areas_mejora": ["area1", "area2"],
  "alertas": ["alerta urgente si existe", ...],
  "recomendacion": "accion_recomendada",
  "recomendacion_tipo": "positiva|neutral|atencion|urgente",
  "sugerencia_accion": "texto de acción concreta a tomar",
  "documento_sugerido": "aviso|amonestacion|felicitacion|formacion|ninguno"
}`

    const respuesta = await aiComplete(prompt)
    let analisis: any = {}
    try {
      const clean = respuesta.replace(/```json|```/g, '').trim()
      analisis = JSON.parse(clean)
    } catch {
      analisis = { resumen: respuesta, puntos_fuertes: [], areas_mejora: [], alertas: [], recomendacion_tipo: 'neutral' }
    }

    // Guardar análisis como expediente
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO expedientes_rrhh (empresa_id, limpiadora_id, tipo, titulo, descripcion, generado_por_ia, periodo)
      VALUES (
        ${empresa_id}::uuid,
        ${limpiadora_id}::uuid,
        'nota',
        ${'Análisis IA — ' + new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })},
        ${analisis.resumen || ''},
        true,
        ${new Date().toISOString().slice(0, 7)}
      )
    `)

    return NextResponse.json({ ok: true, analisis, rendimiento: r })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
