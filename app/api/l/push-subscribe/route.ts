import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getLimpiadoraFromRequest } from '@/lib/auth-l'

export async function POST(req: Request) {
  try {
    const limpiadora = await getLimpiadoraFromRequest(req)
    if (!limpiadora) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const { endpoint, p256dh, auth } = await req.json()

    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO push_subscriptions (empresa_id, limpiadora_id, endpoint, p256dh, auth_key)
      VALUES (${limpiadora.empresa_id}::uuid, ${limpiadora.id}::uuid, ${endpoint}, ${p256dh}, ${auth})
      ON CONFLICT (endpoint) DO UPDATE SET
        p256dh       = EXCLUDED.p256dh,
        auth_key     = EXCLUDED.auth_key,
        limpiadora_id = EXCLUDED.limpiadora_id
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
