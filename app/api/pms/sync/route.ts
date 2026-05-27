import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function parseIcal(text: string) {
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
    if (dtstart && dtend) events.push({ uid, summary, dtstart, dtend })
  }
  return events
}

function parseIcalDate(s: string): string {
  return s.replace(/T.*/, '').replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3')
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const connection_id = searchParams.get('connection_id')

    const where = connection_id
      ? Prisma.sql`WHERE id = ${connection_id}::uuid AND ical_url IS NOT NULL AND activa = true`
      : Prisma.sql`WHERE ical_url IS NOT NULL AND activa = true`

    const connections = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, empresa_id, cliente_id, cliente_nombre, pms_tipo, ical_url
      FROM pms_connections ${where}
    `)

    let synced = 0, errors = 0

    for (const conn of connections) {
      try {
        const res = await fetch(conn.ical_url, {
          headers: { 'User-Agent': 'ialimp-sync/1.0' },
          signal: AbortSignal.timeout(10000)
        })
        if (!res.ok) throw new Error('HTTP ' + res.status)
        const text = await res.text()
        const events = parseIcal(text)

        for (const ev of events) {
          const checkout_date = parseIcalDate(ev.dtend)
          const external_id   = conn.id + '_' + ev.uid

          await prisma.$executeRaw(Prisma.sql`
            INSERT INTO cleaning_sessions (
              empresa_id, cliente_id, pms_connection_id,
              property_id, property_name, session_date,
              external_reservation_id, guest_name, tipo_servicio
            ) VALUES (
              ${conn.empresa_id}::uuid,
              ${conn.cliente_id ? conn.cliente_id + '::uuid' : null},
              ${conn.id}::uuid,
              ${conn.id},
              ${conn.cliente_nombre + (ev.summary ? ' — ' + ev.summary : '')},
              ${checkout_date}::date,
              ${external_id},
              ${ev.summary || null},
              'rotacion'
            )
            ON CONFLICT (external_reservation_id)
            DO UPDATE SET
              session_date  = EXCLUDED.session_date,
              property_name = EXCLUDED.property_name,
              cliente_id    = EXCLUDED.cliente_id,
              updated_at    = now()
          `)
        }

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

    return NextResponse.json({ ok: true, synced, errors, total: connections.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
