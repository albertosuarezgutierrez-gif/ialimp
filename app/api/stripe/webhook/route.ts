import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
      return NextResponse.json({ error: 'Stripe no configurado' }, { status: 503 })
    }

    const Stripe = (await import('stripe')).default
    const stripe  = new Stripe(process.env.STRIPE_SECRET_KEY!)
    const body    = await req.text()
    const sig     = req.headers.get('stripe-signature') || ''

    let event: any
    try {
      event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
    } catch {
      return NextResponse.json({ error: 'Webhook inválido' }, { status: 400 })
    }

    if (event.type === 'customer.subscription.created' || event.type === 'customer.subscription.updated') {
      const sub        = event.data.object
      const empresa_id = sub.metadata?.empresa_id
      const activo     = sub.status === 'active' || sub.status === 'trialing'

      if (empresa_id && sub.metadata?.tipo === 'saas_asientos') {
        // Suscripción del programa (base + por limpiadora activa): guardamos
        // customer + los IDs de los items para poder ajustar la cantidad de asientos.
        const er = await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT COALESCE(saas_precio_base,80)::float AS base,
                 COALESCE(saas_precio_limpiadora,20)::float AS seat
          FROM empresas WHERE id = ${empresa_id}::uuid
        `)
        const baseCent = Math.round(Number(er[0]?.base ?? 80) * 100)
        const seatCent = Math.round(Number(er[0]?.seat ?? 20) * 100)
        let baseItem: string | null = null, asientoItem: string | null = null
        for (const it of (sub.items?.data || [])) {
          const ua = it.price?.unit_amount
          if (ua === seatCent && !asientoItem) asientoItem = it.id
          else if (ua === baseCent && !baseItem) baseItem = it.id
        }
        await prisma.$executeRaw(Prisma.sql`
          UPDATE empresas SET
            plan = ${activo ? 'pro' : 'starter'},
            stripe_subscription_id = ${sub.id},
            stripe_customer_id = COALESCE(${sub.customer ?? null}, stripe_customer_id),
            saas_subscription_item_base    = COALESCE(${baseItem},    saas_subscription_item_base),
            saas_subscription_item_asiento = COALESCE(${asientoItem}, saas_subscription_item_asiento)
          WHERE id = ${empresa_id}::uuid
        `)
      } else if (empresa_id) {
        const isAgency = sub.items?.data?.[0]?.price?.nickname?.toLowerCase().includes('agency')
        const plan     = isAgency ? 'agency' : 'pro'
        await prisma.$executeRaw(Prisma.sql`
          UPDATE empresas SET plan = ${sub.status === 'active' ? plan : 'starter'},
            stripe_subscription_id = ${sub.id}
          WHERE id = ${empresa_id}::uuid
        `)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const sub        = event.data.object
      const empresa_id = sub.metadata?.empresa_id
      if (empresa_id) {
        await prisma.$executeRaw(Prisma.sql`UPDATE empresas SET plan = 'starter' WHERE id = ${empresa_id}::uuid`)
      }
    }

    // ── Pago online de una factura del propietario (Connect destination charge) ──
    if (event.type === 'checkout.session.completed') {
      const cs        = event.data.object
      const factura_id = cs.metadata?.factura_id
      const empresa_id = cs.metadata?.empresa_id
      // Solo pagos de factura (los de suscripción son mode 'subscription' y no traen factura_id)
      if (factura_id && empresa_id && cs.payment_status === 'paid') {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE facturas_clientes SET
            estado                   = 'pagada',
            fecha_cobro              = COALESCE(fecha_cobro, CURRENT_DATE),
            pagada_online_at         = COALESCE(pagada_online_at, now()),
            stripe_payment_intent_id = ${cs.payment_intent ?? null}
          WHERE id = ${factura_id}::uuid AND empresa_id = ${empresa_id}::uuid
        `)
      }
    }

    // ── La empresa completó (o cambió) su alta en Connect → refrescar flag ──
    if (event.type === 'account.updated') {
      const acct = event.data.object
      await prisma.$executeRaw(Prisma.sql`
        UPDATE empresas SET stripe_charges_enabled = ${!!acct.charges_enabled}
        WHERE stripe_account_id = ${acct.id}
      `)
    }

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
