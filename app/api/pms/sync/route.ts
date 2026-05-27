import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic    = 'force-dynamic'
export const maxDuration = 60

function parseIcal(text: string) {
  const events: any[] = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const b = blocks[i]
    const get = (k: string) => { const m = b.match(new RegExp(k + '[^:]*:([^\r\n]+)')); return m ? m[1].trim() : '' }
    const ds = get('DTSTART'), de = get('DTEND'), uid = get('UID'), summary = get('SUMMARY')
    if (ds && de) events.push({ uid, summary, dtstart: ds, dtend: de })
  }
  return events
}
function icalDateToISO(s: string) { return s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') }

const SMOOBU_MAP: Record<number, { uuid: string; name: string; sivra_id: string }> = {
  352007: { uuid: '7b3bafb8-564a-467d-bbd5-7fcf375ccb14', name: 'Casa Socorro',   sivra_id: 'prop_house_sevillana' },
  352928: { uuid: 'e688f325-d8a6-4ae1-8a47-e94c74596ce7', name: 'Duplex Center',  sivra_id: 'prop_duplex_center'  },
  352943: { uuid: '04401cff-f7fd-42db-8efd-69ac36ebbd21', name: 'Luxury Busto',   sivra_id: 'prop_luxury_busto'   },
  352418: { uuid: '9025302d-9475-4d89-9975-63570128b98d', name: 'Bustos Reforma', sivra_id: 'prop_busto_reform'   },
}
const VANESSA_ID = '04caa4dc-a34f-4cd5-af08-d73f5e732711'

async function syncSmoobuApi(conn: any): Promise<{ synced: number; errors: string[] }> {
  if (!conn.smoobu_api_key) return { synced: 0, errors: ['No smoobu_api_key'] }
  const from = new Date().toISOString().split('T')[0]
  const to   = new Date(Date.now() + 120 * 86400000).toISOString().split('T')[0]
  const res  = await fetch(
    `https://login.smoobu.com/api/reservations?arrival_from=${from}&arrival_to=${to}&pageSize=100`,
    { headers: { 'Api-Key': conn.smoobu_api_key }, signal: AbortSignal.timeout(15000) }
  )
  if (!res.ok) return { synced: 0, errors: ['Smoobu API ' + res.status] }
  const { bookings = [] } = await res.json()
  let synced = 0; const errors: string[] = []

  for (const b of bookings) {
    if (b.type === 'BlockedPeriod' || !b.departure) continue
    try {
      const prop = SMOOBU_MAP[b.apartment?.id]
      if (!prop) continue
      const num_huespedes = (b.adults || 0) + (b.children || 0)
      const clienteId     = conn.cliente_id as string | null

      // Usar SQL raw directo para evitar problemas de cast en Prisma
      await prisma.$executeRawUnsafe(`
        INSERT INTO cleaning_sessions (
          empresa_id, cliente_id, pms_connection_id,
          property_id, propiedad_id, property_name,
          session_date, external_reservation_id,
          guest_name, num_huespedes,
          tipo_servicio, origen, hora_checkout, limpiadora_id
        ) VALUES (
          '${conn.empresa_id}'::uuid,
          ${clienteId ? `'${clienteId}'::uuid` : 'NULL'},
          '${conn.id}'::uuid,
          '${prop.sivra_id}',
          '${prop.uuid}'::uuid,
          '${prop.name.replace(/'/g, "''")}',
          '${b.departure}'::date,
          'smoobu_${b.id}',
          ${b['guest-name'] ? `'${String(b['guest-name']).replace(/'/g, "''")}'` : 'NULL'},
          ${num_huespedes},
          'rotacion', 'smoobu_api', '11:00',
          '${VANESSA_ID}'::uuid
        )
        ON CONFLICT (external_reservation_id)
        DO UPDATE SET
          session_date  = EXCLUDED.session_date,
          property_name = EXCLUDED.property_name,
          guest_name    = EXCLUDED.guest_name,
          num_huespedes = EXCLUDED.num_huespedes,
          updated_at    = now()
        WHERE cleaning_sessions.completed_at IS NULL
      `)
      synced++
    } catch (e: any) { errors.push('Booking ' + b.id + ': ' + (e.message || '').slice(0, 80)) }
  }
  return { synced, errors }
}

async function syncIcal(conn: any): Promise<{ synced: number; errors: string[] }> {
  const res = await fetch(conn.ical_url, { signal: AbortSignal.timeout(10000) })
  if (!res.ok) return { synced: 0, errors: ['HTTP ' + res.status] }
  const events = parseIcal(await res.text())
  let synced = 0; const errors: string[] = []
  for (const ev of events) {
    try {
      const checkout = icalDateToISO(ev.dtend)
      const clienteId = conn.cliente_id as string | null
      await prisma.$executeRawUnsafe(`
        INSERT INTO cleaning_sessions (empresa_id, cliente_id, pms_connection_id, property_id, property_name, session_date, external_reservation_id, guest_name, tipo_servicio)
        VALUES ('${conn.empresa_id}'::uuid, ${clienteId ? `'${clienteId}'::uuid` : 'NULL'}, '${conn.id}'::uuid, '${conn.id}', '${conn.cliente_nombre.replace(/'/g,"''")}', '${checkout}'::date, '${conn.id}_${ev.uid}', ${ev.summary ? `'${String(ev.summary).replace(/'/g,"''")}'` : 'NULL'}, 'rotacion')
        ON CONFLICT (external_reservation_id) DO UPDATE SET session_date = EXCLUDED.session_date, updated_at = now()
        WHERE cleaning_sessions.completed_at IS NULL
      `)
      synced++
    } catch (e: any) { errors.push((e.message || '').slice(0, 60)) }
  }
  return { synced, errors }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const cid = searchParams.get('connection_id')
    const connections = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, empresa_id, cliente_id, cliente_nombre,
             pms_tipo, ical_url, smoobu_api_key, smoobu_apt_ids
      FROM pms_connections WHERE activa = true
      ${cid ? Prisma.sql`AND id = ${cid}::uuid` : Prisma.sql``}
    `)
    const results: any[] = []
    for (const conn of connections) {
      const result = conn.pms_tipo === 'smoobu_api' && conn.smoobu_api_key
        ? await syncSmoobuApi(conn)
        : conn.ical_url ? await syncIcal(conn)
        : { synced: 0, errors: ['Sin configuración'] }

      await prisma.$executeRaw(Prisma.sql`
        UPDATE pms_connections SET
          last_sync_at   = NOW(),
          total_sessions = COALESCE(total_sessions, 0) + ${result.synced},
          sync_error     = ${result.errors.length > 0 ? result.errors.join('; ').slice(0, 300) : null}
        WHERE id = ${conn.id}::uuid
      `)
      results.push({ connection: conn.cliente_nombre, ...result })
    }
    return NextResponse.json({
      ok: true,
      connections: results.length,
      total_synced: results.reduce((a, r) => a + r.synced, 0),
      results
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
