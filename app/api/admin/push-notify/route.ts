import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(req: Request) {
  try {
    const { limpiadora_id, titulo, cuerpo, empresa_id } = await req.json()
    if (!empresa_id) return NextResponse.json({ error: 'empresa_id requerido' }, { status: 400 })

    const VAPID_PUBLIC  = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY  || ''
    const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || ''

    if (!VAPID_PRIVATE) {
      return NextResponse.json({ ok: true, sent: 0, msg: 'VAPID no configurado — añade NEXT_PUBLIC_VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY en Vercel' })
    }

    const subs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT endpoint, p256dh, auth_key
      FROM push_subscriptions
      WHERE empresa_id = ${empresa_id}::uuid
        AND limpiadora_id = ${limpiadora_id}::uuid
    `)

    if (subs.length === 0) return NextResponse.json({ ok: true, sent: 0, msg: 'Sin suscripciones registradas' })

    const webpush = (await import('web-push')).default
    webpush.setVapidDetails('mailto:hola@ialimp.com', VAPID_PUBLIC, VAPID_PRIVATE)

    let sent = 0
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth_key } },
          JSON.stringify({ title: titulo, body: cuerpo, icon: '/icon-192.png', badge: '/icon-192.png' })
        )
        sent++
      } catch (e: any) {
        // Suscripción expirada o inválida — limpiar
        if (e.statusCode === 410) {
          await prisma.$executeRaw(Prisma.sql`DELETE FROM push_subscriptions WHERE endpoint = ${sub.endpoint}`)
        }
      }
    }

    return NextResponse.json({ ok: true, sent })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
