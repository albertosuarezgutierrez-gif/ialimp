import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic   = 'force-dynamic'
export const maxDuration = 60

// ── iCal parser (para conexiones genéricas) ───────────────────────────────────
function parseIcal(text: string) {
  const events: any[] = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]
    const get = (k: string) => { const m = b.match(new RegExp(k + '[^:]*:([^\r\n]+)')); return m ? m[1].trim() : '' }
    const dtstart = get('DTSTART'); const dtend = get('DTEND')
    const uid = get('UID'); const summary = get('SUMMARY')
    if (dtstart && dtend) events.push({ uid, summary, dtstart, dtend })
  }
  return events
}
function icalDateToISO(s: string) { return s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') }

// ── Mapeo Smoobu apartment ID → propiedad UUID + nombre ──────────────────────
const SMOOBU_MAP: Record<number, { id: string; name: string; sivra_id: string }> = {
  352007: { id: '7b3bafb8-564a-467d-bbd5-7fcf375ccb14', name: 'Casa Socorro',    sivra_id: 'prop_house_sevillana' },
  352928: { id: 'e688f325-d8a6-4ae1-8a47-e94c74596ce7', name: 'Duplex Center',   sivra_id: 'prop_duplex_center'  },
  352943: { id: '04401cff-f7fd-42db-8efd-69ac36ebbd21', name: 'Luxury Busto',    sivra_id: 'prop_luxury_busto'   },
  352418: { id: '9025302d-9475-4d89-9975-63570128b98d', name: 'Bustos Reforma',  sivra_id: 'prop_busto_reform'   },
}

const LIMPIADORA_ID = '04caa4dc-a34f-4cd5-af08-d73f5e732711' // Vanessa

// ── Sync Smoobu REST API ──────────────────────────────────────────────────────
async function syncSmoobuApi(conn: any): Promise<{ synced: number; errors: string[] }> {
  const apiKey = conn.smoobu_api_key
  if (!apiKey) return { synced: 0, errors: ['No smoobu_api_key'] }

  const from = new Date().toISOString().split('T')[0]
  const to   = new Date(Date.now() + 120 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const res = await fetch(
    'https://login.smoobu.com/api/reservations?arrival_from=' + from + '&arrival_to=' + to + '&pageSize=100',
    { headers: { 'Api-Key': apiKey }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) return { synced: 0, errors: ['Smoobu API ' + res.status] }

  const data = await res.json()
  const bookings = (data.bookings || []).filter((b: any) =>
    b.type !== 'BlockedPeriod' && b.departure
  )

  let synced = 0
  const errors: string[] = []

  for (const booking of bookings) {
    try {
      const aptId  = booking.apartment?.id
      const prop   = SMOOBU_MAP[aptId]
      if (!prop) continue

      const checkout_date    = booking.departure
      const external_res_id  = 'smoobu_' + booking.id

      // Ventana de checkin siguiente (si existe reserva el mismo día que sale)
      const hora_checkout  = booking.departure === booking.arrival ? null : '11:00'
      const num_huespedes  = (booking.adults || 0) + (booking.children || 0)

      await prisma.$executeRaw(Prisma.sql\`
        INSERT INTO cleaning_sessions (
          empresa_id, cliente_id, pms_connection_id,
          property_id, propiedad_id, property_name,
          session_date, external_reservation_id,
          guest_name, num_huespedes,
          tipo_servicio, origen, hora_checkout,
          limpiadora_id
        ) VALUES (
          \${conn.empresa_id}::uuid,
          \${conn.cliente_id ? conn.cliente_id : null},
          \${conn.id}::uuid,
          \${prop.sivra_id},
          \${prop.id}::uuid,
          \${prop.name},
          \${checkout_date}::date,
          \${external_res_id},
          \${booking['guest-name'] || null},
          \${num_huespedes},
          'rotacion',
          'smoobu_api',
          \${hora_checkout},
          \${LIMPIADORA_ID}::uuid
        )
        ON CONFLICT (external_reservation_id)
        DO UPDATE SET
          session_date   = EXCLUDED.session_date,
          property_name  = EXCLUDED.property_name,
          guest_name     = EXCLUDED.guest_name,
          num_huespedes  = EXCLUDED.num_huespedes,
          hora_checkout  = EXCLUDED.hora_checkout,
          updated_at     = now()
        WHERE cleaning_sessions.completed_at IS NULL
      \`)
      synced++
    } catch (e: any) {
      errors.push('Booking ' + booking.id + ': ' + e.message?.slice(0, 60))
    }
  }

  return { synced, errors }
}

// ── Sync iCal genérico ────────────────────────────────────────────────────────
async function syncIcal(conn: any): Promise<{ synced: number; errors: string[] }> {
  const res = await fetch(conn.ical_url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return { synced: 0, errors: ['HTTP ' + res.status] }

  const events = parseIcal(await res.text())
  let synced = 0
  const errors: string[] = []

  for (const ev of events) {
    try {
      const checkout_date = icalDateToISO(ev.dtend)
      const external_id   = conn.id + '_' + ev.uid
      await prisma.$executeRaw(Prisma.sql\`
        INSERT INTO cleaning_sessions (
          empresa_id, cliente_id, pms_connection_id,
          property_id, property_name, session_date,
          external_reservation_id, guest_name, tipo_servicio
        ) VALUES (
          \${conn.empresa_id}::uuid,
          \${conn.cliente_id || null},
          \${conn.id}::uuid,
          \${conn.id}, \${conn.cliente_nombre},
          \${checkout_date}::date,
          \${external_id}, \${ev.summary || null}, 'rotacion'
        )
        ON CONFLICT (external_reservation_id)
        DO UPDATE SET session_date = EXCLUDED.session_date, updated_at = now()
        WHERE cleaning_sessions.completed_at IS NULL
      \`)
      synced++
    } catch (e: any) { errors.push(e.message?.slice(0, 60)) }
  }
  return { synced, errors }
}

// ── Endpoint principal ────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const connection_id = searchParams.get('connection_id')

    const connections = await prisma.$queryRaw<any[]>(Prisma.sql\`
      SELECT id, empresa_id, cliente_id, cliente_nombre,
             pms_tipo, ical_url, smoobu_api_key, smoobu_apt_ids
      FROM pms_connections
      WHERE activa = true
        \${connection_id ? Prisma.sql\`AND id = \${connection_id}::uuid\` : Prisma.sql\`\`}
    \`)

    const results: any[] = []
    for (const conn of connections) {
      let result: { synced: number; errors: string[] }

      if (conn.pms_tipo === 'smoobu_api' && conn.smoobu_api_key) {
        result = await syncSmoobuApi(conn)
      } else if (conn.ical_url) {
        result = await syncIcal(conn)
      } else {
        result = { synced: 0, errors: ['Sin ical_url ni smoobu_api_key'] }
      }

      await prisma.$executeRaw(Prisma.sql\`
        UPDATE pms_connections SET
          last_sync_at   = NOW(),
          total_sessions = total_sessions + \${result.synced},
          sync_error     = \${result.errors.length > 0 ? result.errors.join('; ') : null}
        WHERE id = \${conn.id}::uuid
      \`)

      results.push({ connection: conn.cliente_nombre, ...result })
    }

    const total_synced = results.reduce((a, r) => a + r.synced, 0)
    return NextResponse.json({ ok: true, connections: results.length, total_synced, results })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
