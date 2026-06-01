import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { aiComplete } from '@/lib/ai-client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// ─── Pesos del scoring v2/v3 (en "horas equivalentes", legibles) ─────────────
const CONOCE_BONUS    = 1.5   // conoce el piso vale ~1,5 h de carga → bonus, no absoluto
const OVERCAP_CASTIGO = 100   // pasarse de horas_max domina sobre todo lo demás

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

// dia_semana ISO: 1=lunes … 7=domingo
function diaSemanaISO(fecha: string): number {
  const d = new Date(fecha + 'T12:00:00')
  return d.getDay() === 0 ? 7 : d.getDay()
}

// Candidatas disponibles ese día (turno marcado, no ausentes) con su carga REAL
// del día (minutos = tiempo_estimado de la sesión, o duración de la ficha del
// piso, o 120 por defecto) y si conocen la propiedad. propiedadId='' → nadie la
// "conoce" (se reparte solo por carga; útil para el hotel).
async function getCandidatas(
  empresaId: string,
  fecha: string,
  diaSemana: number,
  propiedadId: string
): Promise<any[]> {
  return prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      l.id, l.nombre, l.color, l.propiedades, l.empresa_id,
      ld.hora_inicio, ld.hora_fin, ld.horas_max,
      COALESCE(carga.total_min, 0)::int AS horas_asignadas_min,
      CASE
        WHEN ${propiedadId} != '' AND ${propiedadId} = ANY(l.propiedades::text[]) THEN true
        ELSE false
      END AS conoce_propiedad
    FROM limpiadoras l
    JOIN (
      SELECT limpiadora_id,
             MIN(hora_inicio) AS hora_inicio,
             MAX(hora_fin)    AS hora_fin,
             MAX(horas_max)   AS horas_max
      FROM limpiadora_disponibilidad
      WHERE dia_semana = ${diaSemana} AND activo = true
      GROUP BY limpiadora_id
    ) ld ON ld.limpiadora_id = l.id
    LEFT JOIN (
      SELECT cs.limpiadora_id,
             SUM(COALESCE(cs.tiempo_estimado, p.duracion_estimada_min, 120)) AS total_min
      FROM cleaning_sessions cs
      LEFT JOIN propiedades p ON p.id = cs.propiedad_id
      WHERE cs.session_date = ${fecha}::date
        AND cs.limpiadora_id IS NOT NULL
      GROUP BY cs.limpiadora_id
    ) carga ON carga.limpiadora_id = l.id
    WHERE l.activa = true
      AND l.empresa_id = ${empresaId}::uuid
      AND NOT EXISTS (
        SELECT 1 FROM limpiadora_ausencias a
        WHERE a.limpiadora_id = l.id
          AND ${fecha}::date BETWEEN a.fecha_inicio AND a.fecha_fin
          AND a.aprobada = true
      )
    ORDER BY horas_asignadas_min ASC, conoce_propiedad DESC, l.nombre ASC
    LIMIT 25
  `)
}

// Scoring v2: carga continua + tope por horas_max. Devuelve las candidatas con
// su `score` y `superaTope`, de mayor a menor score.
function puntuar(candidatas: any[], estMin: number) {
  return candidatas.map(c => {
    const cargaMin      = Number(c.horas_asignadas_min) || 0
    const proyectadoMin = cargaMin + estMin
    const topeMin       = c.horas_max ? Number(c.horas_max) * 60 : null  // null/0 = sin tope
    const superaTope    = topeMin != null && proyectadoMin > topeMin
    const score =
      (c.conoce_propiedad ? CONOCE_BONUS : 0)
      - proyectadoMin / 60
      - (superaTope ? OVERCAP_CASTIGO : 0)
    return { ...c, score, superaTope }
  }).sort((a, b) => b.score - a.score)
}

// Escribe la asignación: cleaning_sessions + alerta + push. No lanza si algo
// secundario (alerta/push) falla.
async function asignarSesion(
  sesion: any,
  limpiadora: any,
  justificacion: string,
  fecha: string,
  hoy: string
) {
  await prisma.$executeRaw(Prisma.sql`
    UPDATE cleaning_sessions
    SET limpiadora_id  = ${limpiadora.id}::uuid,
        notas_internas = ${`[Auto-asignado] ${justificacion}`}
    WHERE id = ${sesion.id}::uuid
  `)
  try {
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO alertas (empresa_id, tipo, titulo, descripcion, leida)
      VALUES (
        ${sesion.empresa_id}::uuid,
        'asignacion_auto',
        ${`Auto-asign: ${limpiadora.nombre} → ${sesion.property_name}`},
        ${`${fecha} · ${justificacion}`},
        false
      )
    `)
  } catch (_) { /* alerta no crítica */ }

  const horaTexto = sesion.hora_inicio
    ? String(sesion.hora_inicio).slice(0, 5)
    : (sesion.hora_checkout ? String(sesion.hora_checkout).slice(0, 5) : 'sin hora')
  await enviarPush(
    limpiadora.empresa_id,
    limpiadora.id,
    '🧹 Nueva sesión asignada',
    `${sesion.property_name} · ${fecha === hoy ? 'Hoy' : 'Mañana'} ${horaTexto} · ${justificacion}`
  )
}

// ─── Cron principal ────────────────────────────────────────────────────────

export async function GET() {
  try {
    const hoy    = new Date().toISOString().split('T')[0]
    const manana = new Date(Date.now() + 86400000).toISOString().split('T')[0]

    // Sesiones de hoy y mañana sin limpiadora. Traemos el tipo de propiedad
    // (para separar el hotel), los minutos reales y si hay entrada el mismo día.
    const sinAsignar = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        cs.id, cs.empresa_id,
        -- property_id convive en 2 formatos (slug/UUID); ambos a text para
        -- evitar el choque de tipos en COALESCE (text vs uuid)
        COALESCE(NULLIF(cs.propiedad_id::text, ''), cs.property_id::text) AS propiedad_id,
        cs.property_name, cs.session_date, cs.hora_inicio, cs.hora_checkout,
        cs.tipo_servicio,
        COALESCE(cs.tiempo_estimado, p.duracion_estimada_min, 120)::int AS est_min,
        (p.tipo = 'habitacion_hotel') AS es_hotel,
        (cs.hora_checkin_siguiente IS NOT NULL) AS tiene_entrada
      FROM cleaning_sessions cs
      LEFT JOIN propiedades p ON p.id = cs.propiedad_id
      WHERE cs.session_date IN (${hoy}::date, ${manana}::date)
        AND cs.limpiadora_id IS NULL
        AND cs.completed_at IS NULL
      ORDER BY cs.session_date ASC, cs.hora_checkout ASC NULLS LAST, cs.hora_inicio ASC NULLS LAST
    `)

    if (!sinAsignar.length) {
      return NextResponse.json({ ok: true, asignadas: 0, msg: 'Sin sesiones pendientes' })
    }

    const fechaDe = (s: any) =>
      s.session_date instanceof Date
        ? s.session_date.toISOString().split('T')[0]
        : String(s.session_date).split('T')[0]

    const resultados: any[] = []
    const hotelSesiones = sinAsignar.filter(s => s.es_hotel)
    const restoSesiones = sinAsignar.filter(s => !s.es_hotel)

    // ── PASE 1: HOTEL (lógica de Vanessa) ──────────────────────────────────
    // ≤4 limpiezas → 1 persona; >4 → 2 personas. Se reparten los minutos lo más
    // equilibrado posible. "Cuenta y sigue": las elegidas quedan con esa carga y
    // siguen siendo candidatas para apartamentos en el pase 2 (su carga ya sube,
    // así que el scoring las deprioriza de forma natural pero no las excluye).
    // Agrupar por empresa_id|fecha (el cron procesa TODAS las empresas; no
    // mezclar hoteles de empresas distintas en el mismo día).
    const hotelPorGrupo = new Map<string, any[]>()
    for (const s of hotelSesiones) {
      const k = `${s.empresa_id}|${fechaDe(s)}`
      if (!hotelPorGrupo.has(k)) hotelPorGrupo.set(k, [])
      hotelPorGrupo.get(k)!.push(s)
    }

    for (const [clave, grupo] of hotelPorGrupo) {
      const fecha = clave.split('|')[1]
      const empresaId = grupo[0].empresa_id
      const candidatas = await getCandidatas(empresaId, fecha, diaSemanaISO(fecha), '')
      if (!candidatas.length) {
        for (const s of grupo) {
          resultados.push({ sesion_id: s.id, propiedad: s.property_name, fecha, asignada: false, motivo: 'Sin limpiadoras disponibles' })
        }
        continue
      }

      const nPersonas = grupo.length <= 4 ? 1 : 2
      const minutosTotales = grupo.reduce((acc, s) => acc + (Number(s.est_min) || 120), 0)
      const elegidas = puntuar(candidatas, minutosTotales / nPersonas)
        .slice(0, Math.min(nPersonas, candidatas.length))
        .map(c => ({ ...c, cargaAcum: Number(c.horas_asignadas_min) || 0 }))

      // Reparto greedy: la habitación con más minutos a la elegida menos cargada
      const ordenadas = [...grupo].sort((a, b) => (Number(b.est_min) || 0) - (Number(a.est_min) || 0))
      const nombres = elegidas.map(e => e.nombre).join(' + ')
      for (const s of ordenadas) {
        const elegida = elegidas.sort((a, b) => a.cargaAcum - b.cargaAcum)[0]
        const just = nPersonas > 1
          ? `Hotel VAC (${grupo.length} hab, ${nombres})`
          : `Hotel VAC (${grupo.length} hab)`
        await asignarSesion(s, elegida, just, fecha, hoy)
        elegida.cargaAcum += Number(s.est_min) || 120
        resultados.push({ sesion_id: s.id, propiedad: s.property_name, fecha, asignada: true, limpiadora: elegida.nombre, hotel: true })
      }
    }

    // ── PASE 2: APARTAMENTOS ───────────────────────────────────────────────
    // Ya vienen ordenados por salida más temprana; reordenamos para procesar
    // primero las que tienen entrada el mismo día (más críticas). Como cada
    // asignación sube la carga de la elegida, las entradas se reparten solas
    // entre limpiadoras distintas.
    restoSesiones.sort((a, b) => (b.tiene_entrada ? 1 : 0) - (a.tiene_entrada ? 1 : 0))

    for (const sesion of restoSesiones) {
      const fecha = fechaDe(sesion)
      const propiedadId = sesion.propiedad_id || ''
      const candidatas = await getCandidatas(sesion.empresa_id, fecha, diaSemanaISO(fecha), propiedadId)

      if (!candidatas.length) {
        resultados.push({ sesion_id: sesion.id, propiedad: sesion.property_name, fecha, asignada: false, motivo: 'Sin limpiadoras disponibles' })
        continue
      }

      const estMin = Number(sesion.est_min) || 120
      const mejor = puntuar(candidatas, estMin)[0]

      const justificacion = await generarJustificacion(
        mejor.nombre, sesion.property_name, sesion.hora_inicio,
        mejor.conoce_propiedad, mejor.horas_asignadas_min
      )
      await asignarSesion(sesion, mejor, justificacion, fecha, hoy)

      resultados.push({
        sesion_id: sesion.id, propiedad: sesion.property_name, fecha,
        asignada: true, limpiadora: mejor.nombre, score: Number(mejor.score.toFixed(2)), justificacion
      })
    }

    const asignadas = resultados.filter(r => r.asignada).length
    const fallidas  = resultados.filter(r => !r.asignada).length

    return NextResponse.json({
      ok: true,
      fecha_ejecucion: new Date().toISOString(),
      sesiones_procesadas: sinAsignar.length,
      hotel: hotelSesiones.length,
      asignadas,
      fallidas,
      detalle: resultados
    })

  } catch (e: any) {
    console.error('[auto-assign] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
