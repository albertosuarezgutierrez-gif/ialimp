// Sincronización de calendarios iCal (Booking/Airbnb/VRBO/…) → cleaning_sessions.
// Fuente única usada por:
//   - el cron /api/pms/sync (cada 10 min, todas las propiedades con ical_urls)
//   - el portal del propietario /api/propietario/[token]/ical (guardar + probar)
// Mantener aquí TODA la lógica de parseo/upsert para que ambos caminos sean idénticos.
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// ── iCal parser ───────────────────────────────────────────────────────────────
export function parseIcal(text: string): any[] {
  const events: any[] = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const b   = blocks[i]
    const get = (k: string) => {
      const m = b.match(new RegExp(k + '[^:]*:([^\r\n]+)'))
      return m ? m[1].trim() : ''
    }
    const dtstart = get('DTSTART')
    const dtend   = get('DTEND')
    const uid     = get('UID')
    const summary = get('SUMMARY')
    const desc    = get('DESCRIPTION')
    // Saltar bloqueos (Booking los llama "Not available" / "BLOCKED")
    if (!dtstart || !dtend) continue
    if (/not available|blocked|cerrado|closed/i.test(summary)) continue
    events.push({ uid, summary, desc, dtstart, dtend })
  }
  return events
}

export function icalToDate(s: string): string {
  // Soporta: 20260601 / 20260601T120000Z / 20260601T120000
  return s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
}

// ── Extraer nombre huésped del SUMMARY/DESCRIPTION de Booking/Airbnb ─────────
export function extractGuest(summary: string, desc: string): string | null {
  // Booking suele poner "Reserva - Nombre Apellido" o directamente el nombre
  // Airbnb: "Airbnb - CONFIRMADO: Nombre (code)"
  const patterns = [
    /reserva[- ]+(.+)/i,
    /booking[:\s-]+(.+)/i,
    /airbnb[^:]*:\s*(.+?)(?:\s*\(|$)/i,
    /^([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+ [A-ZÁÉÍÓÚÑ])/,  // "Nombre Apellido"
  ]
  const s = (summary + ' ' + desc).trim()
  for (const p of patterns) {
    const m = s.match(p)
    if (m?.[1]?.trim().length > 2) return m[1].trim().slice(0, 60)
  }
  return summary?.slice(0, 60) || null
}

// Fecha de HOY en la zona horaria de España (la salida del huésped es lo que
// define la limpieza; comparamos contra el día local, no UTC).
function todayMadrid(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' })
}

// ── Sync iCal de una propiedad ────────────────────────────────────────────────
// prop debe traer: id, empresa_id, cliente_id, nombre, ical_urls, limpiadora_principal_id
export async function syncPropertyIcal(prop: any): Promise<{ synced: number; urgentes: number; errors: string[] }> {
  const urls: string[] = prop.ical_urls || []
  if (!urls.length) return { synced: 0, urgentes: 0, errors: [] }

  let synced = 0
  let urgentes = 0
  const errors: string[] = []
  const seen = new Set<string>()
  const hoy  = todayMadrid()

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(12000),
        headers: { 'User-Agent': 'ialimp/1.0 calendar-sync' }
      })
      if (!res.ok) { errors.push('HTTP ' + res.status + ' — ' + url.slice(0, 40)); continue }

      const text   = await res.text()
      const events = parseIcal(text)

      for (const ev of events) {
        const checkout_date = icalToDate(ev.dtend)

        // Ignorar pasados (más de 7 días)
        const limite = new Date(); limite.setDate(limite.getDate() - 7)
        if (new Date(checkout_date) < limite) continue

        const external_id = prop.id + '_' + ev.uid
        if (seen.has(external_id)) continue
        seen.add(external_id)

        const guest     = extractGuest(ev.summary || '', ev.desc || '')
        const limp_id   = prop.limpiadora_principal_id || null

        // RETURNING (xmax = 0) = true sólo cuando fue un INSERT real (no un UPDATE):
        // así detectamos reservas NUEVAS sin re-avisar en cada pasada del cron.
        const rows = await prisma.$queryRawUnsafe<any[]>(`
          INSERT INTO cleaning_sessions (
            empresa_id, cliente_id,
            property_id, propiedad_id, property_name,
            session_date, external_reservation_id,
            guest_name, tipo_servicio, origen,
            hora_checkout, limpiadora_id
          ) VALUES (
            '${prop.empresa_id}'::uuid,
            ${prop.cliente_id ? `'${prop.cliente_id}'::uuid` : 'NULL'},
            '${prop.id}',
            '${prop.id}'::uuid,
            '${String(prop.nombre).replace(/'/g, "''")}',
            '${checkout_date}'::date,
            '${external_id.replace(/'/g, "''")}',
            ${guest ? `'${guest.replace(/'/g, "''")}'` : 'NULL'},
            'rotacion', 'ical', '11:00',
            ${limp_id ? `'${limp_id}'::uuid` : 'NULL'}
          )
          ON CONFLICT (external_reservation_id)
          DO UPDATE SET
            session_date  = EXCLUDED.session_date,
            guest_name    = EXCLUDED.guest_name,
            limpiadora_id = COALESCE(cleaning_sessions.limpiadora_id, EXCLUDED.limpiadora_id),
            property_name = COALESCE(NULLIF(cleaning_sessions.property_name, ''), EXCLUDED.property_name),
            propiedad_id  = COALESCE(cleaning_sessions.propiedad_id, EXCLUDED.propiedad_id),
            updated_at    = now()
          WHERE cleaning_sessions.completed_at IS NULL
          RETURNING (xmax = 0) AS inserted
        `)
        synced++

        // Reserva NUEVA con salida HOY = limpieza de última hora → avisar a la empresa.
        const esNueva = rows?.[0]?.inserted === true
        if (esNueva && checkout_date === hoy) {
          try {
            await prisma.$executeRaw(Prisma.sql`
              INSERT INTO alertas (empresa_id, tipo, titulo, descripcion, datos)
              VALUES (
                ${prop.empresa_id}::uuid,
                'reserva_urgente',
                ${'🔴 Limpieza HOY (última hora) — ' + prop.nombre},
                ${'Nueva reserva en el calendario con salida HOY' + (guest ? ' · ' + guest : '') + '. Asigna limpiadora.'},
                ${JSON.stringify({ external_id, propiedad_id: prop.id, session_date: checkout_date, origen: 'ical' })}::jsonb
              )
            `)
            urgentes++
          } catch { /* el aviso no es crítico: no romper el sync */ }
        }
      }
    } catch (e: any) {
      errors.push(url.slice(0, 40) + ': ' + (e.message || '').slice(0, 50))
    }
  }
  return { synced, urgentes, errors }
}
