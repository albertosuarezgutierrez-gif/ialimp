import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { aiComplete } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── Helpers ───────────────────────────────────────────────────────────────

async function enviarPush(
  empresa_id: string,
  limpiadora_id: string,
  titulo: string,
  cuerpo: string
) {
  try {
    const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''
    if (!VAPID_PRIVATE) return

    const subs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT endpoint, p256dh, auth_key
      FROM push_subscriptions
      WHERE empresa_id = ${empresa_id}::uuid
        AND limpiadora_id = ${limpiadora_id}::uuid
    `)
    if (!subs.length) return

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails('mailto:hola@ialimp.com', VAPID_PUBLIC, VAPID_PRIVATE)

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: titulo, body: cuerpo, icon: '/icon-192.png', badge: '/icon-192.png' })
        )
      } catch (e: any) {
        if (e.statusCode === 410) {
          await prisma.$executeRaw(Prisma.sql`
            DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}
          `)
        }
      }
    }
  } catch (_) { /* push no crítico */ }
}

async function generarJustificacion(
  limpiadora: string,
  propiedad: string,
  hora: string | null,
  conocePropiedad: boolean,
  cargaMin: number
): Promise<string> {
  try {
    const motivo = conocePropiedad
      ? 'conoce la propiedad'
      : cargaMin === 0
        ? 'sin carga asignada hoy'
        : 'menor carga del equipo'

    const prompt = `Eres el coordinador de una empresa de limpieza profesional.
Explica en UNA frase (máximo 60 caracteres, sin puntos finales) por qué se asignó esta limpiadora a esta sesión.
Sé muy conciso y directo.
Ejemplos válidos: "Conoce el piso y tiene hueco libre", "Sin carga asignada hoy", "Menor carga del equipo esta semana"
Datos: limpiadora="${limpiadora}", propiedad="${propiedad}", hora="${hora || 'sin hora'}", motivo_principal="${motivo}"
Responde SOLO la frase, sin comillas.`

    const respuesta = await aiComplete(prompt)
    return respuesta.trim().slice(0, 80)
  } catch (_) {
    return conocePropiedad ? 'Conoce la propiedad' : 'Menor carga del equipo'
  }
}

// ─── Cron principal ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const hoy = new Date().toISOString().split('T')[0]
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Sesiones de hoy y mañana sin limpiadora asignada
    const sinAsignar = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id, cs.empresa_id, cs.propiedad_id, cs.property_name,
        cs.session_date, cs.hora_inicio, cs.tipo_servicio,
        cs.tiempo_estimado
      FROM cleaning_sessions cs
      WHERE cs.session_date IN (${hoy}::date, ${manana}::date)
        AND cs.limpiadora_id IS NULL
      ORDER BY cs.session_date ASC, cs.hora_inicio ASC NULLS LAST
    `)

    if (!sinAsignar.length) {
      return NextResponse.json({ ok: true, asignadas: 0, msg: 'Sin sesiones pendientes' })
    }

    const resultados: any[] = []

    for (const sesion of sinAsignar) {
      const fecha = sesion.session_date instanceof Date
        ? sesion.session_date.toISOString().split('T')[0]
        : String(sesion.session_date).split('T')[0]

      const d = new Date(fecha + 'T12:00:00')
      const diaSemana = d.getDay() === 0 ? 7 : d.getDay()
      const propiedadId = sesion.propiedad_id || ''

      // Obtener candidatas con scoring
      const candidatas = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT
          l.id,
          l.nombre,
          l.color,
          l.propiedades,
          l.empresa_id,
          ld.hora_inicio,
          ld.hora_fin,
          COALESCE(carga.total_min, 0)::int AS horas_asignadas_min,
          CASE
            WHEN ${propiedadId} != '' AND ${propiedadId} = ANY(l.propiedades::text[]) THEN true
            ELSE false
          END AS conoce_propiedad
        FROM limpiadoras l
        JOIN limpiadora_disponibilidad ld
          ON ld.limpiadora_id = l.id
          AND ld.dia_semana = ${diaSemana}
          AND ld.activo = true
        LEFT JOIN (
          SELECT limpiadora_id, SUM(COALESCE(tiempo_estimado, 120)) AS total_min
          FROM cleaning_sessions
          WHERE session_date = ${fecha}::date
            AND limpiadora_id IS NOT NULL
          GROUP BY limpiadora_id
        ) carga ON carga.limpiadora_id = l.id
        WHERE l.activa = true
          AND l.empresa_id = ${sesion.empresa_id}::uuid
          AND NOT EXISTS (
            SELECT 1 FROM limpiadora_ausencias a
            WHERE a.limpiadora_id = l.id
              AND ${fecha}::date BETWEEN a.fecha_inicio AND a.fecha_fin
              AND a.aprobada = true
          )
        ORDER BY
          conoce_propiedad DESC,          -- 1. conoce la propiedad
          horas_asignadas_min ASC         -- 2. menor carga
        LIMIT 5
      `)

      if (!candidatas.length) {
        resultados.push({
          sesion_id: sesion.id,
          propiedad: sesion.property_name,
          fecha,
          asignada: false,
          motivo: 'Sin limpiadoras disponibles'
        })
        continue
      }

      // Scoring final con pesos
      const mejorCandidataScore = candidatas.map(c => {
        const scoreConoce    = c.conoce_propiedad ? 3 : 0
        const scoreCarga     = Math.max(0, 2 - Math.floor(c.horas_asignadas_min / 120)) // -1 por cada 2h de carga
        return { ...c, score: scoreConoce + scoreCarga }
      }).sort((a, b) => b.score - a.score)[0]

      // Generar justificación IA
      const justificacion = await generarJustificacion(
        mejorCandidataScore.nombre,
        sesion.property_name,
        sesion.hora_inicio,
        mejorCandidataScore.conoce_propiedad,
        mejorCandidataScore.horas_asignadas_min
      )

      // Asignar en BD
      await prisma.$executeRaw(Prisma.sql`
        UPDATE cleaning_sessions
        SET
          limpiadora_id   = ${mejorCandidataScore.id}::uuid,
          notas_internas  = ${`[Auto-asignado] ${justificacion}`}
        WHERE id = ${sesion.id}::uuid
      `)

      // Crear alerta de asignación
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO alertas (empresa_id, tipo, mensaje, referencia_id, leida)
        VALUES (
          ${sesion.empresa_id}::uuid,
          'asignacion_auto',
          ${`Auto-asignación: ${mejorCandidataScore.nombre} → ${sesion.property_name} (${fecha})`},
          ${sesion.id}::uuid,
          false
        )
      `)

      // Push notification a la limpiadora asignada
      const horaTexto = sesion.hora_inicio
        ? String(sesion.hora_inicio).slice(0, 5)
        : 'sin hora'

      await enviarPush(
        mejorCandidataScore.empresa_id,
        mejorCandidataScore.id,
        '🧹 Nueva sesión asignada',
        `${sesion.property_name} · ${fecha === hoy ? 'Hoy' : 'Mañana'} ${horaTexto} · ${justificacion}`
      )

      resultados.push({
        sesion_id: sesion.id,
        propiedad: sesion.property_name,
        fecha,
        asignada: true,
        limpiadora: mejorCandidataScore.nombre,
        score: mejorCandidataScore.score,
        justificacion
      })
    }

    const asignadas = resultados.filter(r => r.asignada).length
    const fallidas  = resultados.filter(r => !r.asignada).length

    return NextResponse.json({
      ok: true,
      fecha_ejecucion: new Date().toISOString(),
      sesiones_procesadas: sinAsignar.length,
      asignadas,
      fallidas,
      detalle: resultados
    })

  } catch (e: any) {
    console.error('[auto-assign] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
