import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getStripe } from '@/lib/stripe'
import { countLimpiadorasActivas } from '@/lib/saas-billing'

export const dynamic = 'force-dynamic'

// Cron (mensual): re-sincroniza la CANTIDAD del asiento "por limpiadora" de cada
// suscripción con el nº de limpiadoras ACTIVAS de la empresa. proration_behavior
// 'none' → el nuevo nº se aplica limpio al próximo periodo (paga por las activas
// de ese mes; en temporada baja, menos). Auth: Bearer CRON_SECRET (middleware).
export async function GET() {
  try {
    const stripe = await getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })

    const empresas = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, nombre, saas_subscription_item_asiento AS item
      FROM empresas
      WHERE stripe_subscription_id IS NOT NULL
        AND saas_subscription_item_asiento IS NOT NULL
    `)

    const out: any[] = []
    for (const e of empresas) {
      try {
        const activas = await countLimpiadorasActivas(e.id)
        await stripe.subscriptionItems.update(e.item, {
          quantity: Math.max(activas, 1),
          proration_behavior: 'none',
        })
        out.push({ empresa: e.nombre, activas, ok: true })
      } catch (err: any) {
        out.push({ empresa: e.nombre, ok: false, error: err.message })
      }
    }

    return NextResponse.json({ ok: true, sincronizadas: out.length, detalle: out })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
