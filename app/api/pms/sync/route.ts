import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Parsear iCal manualmente (compatible con edge/serverless)
function parseIcal(text: string): Array<{ uid: string; summary: string; dtstart: string; dtend: string }> {
  const events: any[] = []
  const blocks = text.split('BEGIN:VEVENT')
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i]
    const get = (key: string) => {
      const m = block.match(new RegExp(key + '[^:]*:([^\r\n]+)'))
      return m ? m[1].trim() : ''
    }
    const dtstart = get('DTSTART')
    const dtend   = get('DTEND')
    const uid     = get('UID')
    const summary = get('SUMMARY')
    if (dtstart && dtend) {
      events.push({ uid, summary, dtstart, dtend })
    }
  }
  return events
}

function parseIcalDate(s: string): string {
  // Formato: 20260527 o 20260527T120000Z
  const d = s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
  return d
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const connection_id = searchParams.get('connection_id')

    // Obtener conexiones activas con iCal
    const where = connection_id
      ? Prisma.sql`WHERE id = ${connection_id}::uuid AND ical_url IS NOT NULL AND activa = true`
      : Prisma.sql`WHERE ical_url IS NOT NULL AND activa = true`

    const connections = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, empresa_id, cliente_nombre, pms_tipo, ical_url
      FROM pms_connections ${where}
    `)

    let synced = 0, errors = 0

    for (const conn of connections) {
      try {
        // Fetch iCal
        const res = await fetch(conn.ical_url, {
          headers: { 'User-Agent': 'ialimp-sync/1.0' },
          signal: AbortSignal.timeout(10000)
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const text = await res.text()
        const events = parseIcal(text)

        // Procesar cada evento = una reserva = una sesión de limpieza
        for (const ev of events) {
          const checkout_date = parseIcalDate(ev.dtend)
          const checkin_date  = parseIcalDate(ev.dtstart)
          const external_id   = `${conn.id}_${ev.uid}`

          // Upsert session de limpieza en fecha de checkout
          await prisma.$executeRaw(Prisma.sql`
            INSERT INTO cleaning_sessions (
              empresa_id, property_id, property_name, session_date,
              external_reservation_id, pms_connection_id, guest_name
            ) VALUES (
              ${conn.empresa_id}::uuid,
              ${conn.id}::text,
              ${conn.cliente_nombre + ' — ' + (ev.summary || 'Reserva')},
              ${checkout_date}::date,
              ${external_id},
              ${conn.id}::uuid,
              ${ev.summary || null}
            )
            ON CONFLICT (external_reservation_id)
            DO UPDATE SET
              session_date = EXCLUDED.session_date,
              property_name = EXCLUDED.property_name,
              updated_at = now()
          `)
        }

        // Actualizar ultimo_sync
        await prisma.$executeRaw(Prisma.sql`
          UPDATE pms_connections
          SET ultimo_sync = now(), sync_error = null
          WHERE id = ${conn.id}::uuid
        `)
        synced++
      } catch (e: any) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE pms_connections SET sync_error = ${e.message}
          WHERE id = ${conn.id}::uuid
        `)
        errors++
      }
    }

    return NextResponse.json({ ok: true, synced, errors, connections: connections.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
