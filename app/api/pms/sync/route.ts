import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

// ── iCal parser ───────────────────────────────────────────────────────────────
function parseIcal(text: string): any[] {
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

function icalToDate(s: string): string {
  // Soporta: 20260601 / 20260601T120000Z / 20260601T120000
  return s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
}

// ── Extraer nombre huésped del SUMMARY/DESCRIPTION de Booking/Airbnb ─────────
function extractGuest(summary: string, desc: string): string | null {
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

// ── Mapeo smoobu_id → propiedad ialimp (para Alberto) ────────────────────────
const SMOOBU_MAP: Record<number, { uuid: string; name: string }> = {
  352007: { uuid: '7b3bafb8-564a-467d-bbd5-7fcf375ccb14', name: 'Casa Socorro'   },
  352928: { uuid: 'e688f325-d8a6-4ae1-8a47-e94c74596ce7', name: 'Duplex Center'  },
  352943: { uuid: '04401cff-f7fd-42db-8efd-69ac36ebbd21', name: 'Luxury Busto'   },
  352418: { uuid: '9025302d-9475-4d89-9975-63570128b98d', name: 'Bustos Reforma' },
}
const VANESSA_ID = '04caa4dc-a34f-4cd5-af08-d73f5e732711'

// ── Sync iCal de una propiedad ────────────────────────────────────────────────
async function syncPropertyIcal(prop: any): Promise<{ synced: number; errors: string[] }> {
  const urls: string[] = prop.ical_urls || []
  if (!urls.length) return { synced: 0, errors: [] }

  let synced = 0
  const errors: string[] = []
  const seen = new Set<string>()

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
        const checkin_date  = icalToDate(ev.dtstart)

        // Ignorar pasados (más de 7 días)
        const limite = new Date(); limite.setDate(limite.getDate() - 7)
        if (new Date(checkout_date) < limite) continue

        const external_id = prop.id + '_' + ev.uid
        if (seen.has(external_id)) continue
        seen.add(external_id)

        const guest     = extractGuest(ev.summary || '', ev.desc || '')
        const limp_id   = prop.limpiadora_principal_id || null

        await prisma.$executeRawUnsafe(`
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
            '${prop.nombre.replace(/'/g, "''")}',
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
            updated_at    = now()
          WHERE cleaning_sessions.completed_at IS NULL
        `)
        synced++
      }
    } catch (e: any) {
      errors.push(url.slice(0, 40) + ': ' + (e.message || '').slice(0, 50))
    }
  }
  return { synced, errors }
}

// ── Sync Smoobu API (para Alberto — mantener mientras siga usando Smoobu) ─────
async function syncSmoobuApi(conn: any, propMap: Map<string, any>): Promise<{ synced: number; errors: string[] }> {
  if (!conn.smoobu_api_key) return { synced: 0, errors: ['No smoobu_api_key'] }
  const from = new Date().toISOString().split('T')[0]
  const to   = new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0]
  const res  = await fetch(
    'https://login.smoobu.com/api/reservations?arrival_from=' + from + '&arrival_to=' + to + '&pageSize=100',
    { headers: { 'Api-Key': conn.smoobu_api_key }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) return { synced: 0, errors: ['Smoobu API ' + res.status] }
  const { bookings = [] } = await res.json()

  let synced = 0; const errors: string[] = []
  for (const b of bookings) {
    if (b.type === 'BlockedPeriod' || !b.departure) continue
    try {
      const smoobuId = b.apartment?.id
      const propDef  = SMOOBU_MAP[smoobuId]
      if (!propDef) continue
      const prop = propMap.get(propDef.uuid)
      const limp = prop?.limpiadora_principal_id || VANESSA_ID

      const external_id   = 'smoobu_' + b.id
      const num_huespedes = (b.adults || 0) + (b.children || 0)

      await prisma.$executeRawUnsafe(`
        INSERT INTO cleaning_sessions (
          empresa_id, cliente_id, pms_connection_id,
          property_id, propiedad_id, property_name,
          session_date, external_reservation_id,
          guest_name, num_huespedes, tipo_servicio, origen, hora_checkout, limpiadora_id
        ) VALUES (
          '${conn.empresa_id}'::uuid,
          ${conn.cliente_id ? `'${conn.cliente_id}'::uuid` : 'NULL'},
          '${conn.id}'::uuid,
          '${propDef.uuid}',
          '${propDef.uuid}'::uuid,
          '${propDef.name}',
          '${b.departure}'::date,
          '${external_id}',
          ${b['guest-name'] ? `'${String(b['guest-name']).replace(/'/g, "''")}'` : 'NULL'},
          ${num_huespedes}, 'rotacion', 'smoobu_api', '11:00',
          '${limp}'::uuid
        )
        ON CONFLICT (external_reservation_id)
        DO UPDATE SET
          session_date  = EXCLUDED.session_date,
          guest_name    = EXCLUDED.guest_name,
          num_huespedes = EXCLUDED.num_huespedes,
          updated_at    = now()
        WHERE cleaning_sessions.completed_at IS NULL
      `)
      synced++
    } catch (e: any) { errors.push('Booking ' + b.id + ': ' + (e.message || '').slice(0, 60)) }
  }
  return { synced, errors }
}

// ── Endpoint ──────────────────────────────────────────────────────────────────
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const prop_id = searchParams.get('property_id')

    // 1. Sync iCal por propiedad — TODOS los clientes con ical_urls configuradas
    const propiedades = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, empresa_id::text, cliente_id::text, nombre,
             ical_urls, limpiadora_principal_id::text
      FROM propiedades
      WHERE array_length(ical_urls, 1) > 0
        AND activa = true
        ${prop_id ? Prisma.sql`AND id = ${prop_id}::uuid` : Prisma.sql``}
    `)

    const icalResults: any[] = []
    const propMap = new Map(propiedades.map(p => [p.id, p]))

    for (const prop of propiedades) {
      const r = await syncPropertyIcal(prop)
      icalResults.push({ type: 'ical', property: prop.nombre, ...r })
    }

    // 2. Sync Smoobu API — solo conexiones con API key (Alberto)
    const conexiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, empresa_id::text, cliente_id::text, smoobu_api_key
      FROM pms_connections
      WHERE activa = true AND smoobu_api_key IS NOT NULL
        ${prop_id ? Prisma.sql`` : Prisma.sql``}
    `)

    const smoobuResults: any[] = []
    for (const conn of conexiones) {
      const r = await syncSmoobuApi(conn, propMap)
      smoobuResults.push({ type: 'smoobu_api', connection: conn.id.slice(0,8), ...r })
    }

    const all     = [...icalResults, ...smoobuResults]
    const total   = all.reduce((a, r) => a + r.synced, 0)
    const errores = all.flatMap(r => r.errors || [])

    return NextResponse.json({
      ok: true,
      total_synced:  total,
      ical_props:    icalResults.length,
      smoobu_conns:  smoobuResults.length,
      results:       all,
      errors:        errores.slice(0, 10)
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
