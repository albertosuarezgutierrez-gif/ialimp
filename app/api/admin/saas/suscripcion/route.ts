import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { getStripe, appBaseUrl } from '@/lib/stripe'
import { getEmpresaBilling, countLimpiadorasActivas, calcCuota } from '@/lib/saas-billing'

export const dynamic = 'force-dynamic'

// GET — estado de la suscripción + cuota teórica de este mes.
export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const empresa = await getEmpresaBilling(empresa_id)
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const activas = await countLimpiadorasActivas(empresa_id)
    const cuota = calcCuota(empresa.precio_base, empresa.precio_limpiadora, activas)

    let estado: 'sin_suscripcion' | 'activa' | 'desconocido' = empresa.stripe_subscription_id ? 'activa' : 'sin_suscripcion'
    let proximo_cobro: string | null = null
    const stripe = await getStripe()
    if (stripe && empresa.stripe_subscription_id) {
      try {
        const sub: any = await stripe.subscriptions.retrieve(empresa.stripe_subscription_id)
        estado = sub.status === 'trialing' || sub.status === 'active' ? 'activa' : 'desconocido'
        const ts = sub.trial_end || sub.current_period_end
        if (ts) proximo_cobro = new Date(ts * 1000).toISOString().slice(0, 10)
      } catch { estado = 'desconocido' }
    }

    return NextResponse.json({
      ...cuota,
      precio_base: empresa.precio_base,
      precio_limpiadora: empresa.precio_limpiadora,
      inicio: empresa.inicio,
      estado, proximo_cobro,
      stripe_no_configurado: !stripe,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — crea el Checkout de suscripción. Body opcional { fecha_inicio: 'YYYY-MM-DD' }
// = fecha del PRIMER cobro (hasta entonces, periodo de prueba sin cargo).
export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const stripe = await getStripe()
    if (!stripe) return NextResponse.json({ error: 'Stripe no configurado', demo: true }, { status: 503 })

    const empresa = await getEmpresaBilling(empresa_id)
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    const body = await req.json().catch(() => ({}))
    const fechaInicio: string | null = body?.fecha_inicio || null

    const activas = await countLimpiadorasActivas(empresa_id)
    const baseCent = Math.round(Number(empresa.precio_base) * 100)
    const seatCent = Math.round(Number(empresa.precio_limpiadora) * 100)

    // trial_end = fecha de inicio (primer cobro ese día). Debe ser futura.
    let trialEnd: number | undefined
    if (fechaInicio) {
      const t = Math.floor(new Date(`${fechaInicio}T03:00:00Z`).getTime() / 1000)
      if (t > Math.floor(Date.now() / 1000) + 3600) trialEnd = t
    }

    const base = appBaseUrl()
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: empresa.stripe_customer_id || undefined,
      customer_email: empresa.stripe_customer_id ? undefined : (empresa.email || undefined),
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur', unit_amount: baseCent, recurring: { interval: 'month' },
            product_data: { name: 'IALIMP · Licencia base' },
          },
        },
        {
          quantity: Math.max(activas, 1),
          price_data: {
            currency: 'eur', unit_amount: seatCent, recurring: { interval: 'month' },
            product_data: { name: 'IALIMP · Por limpiadora activa' },
          },
        },
      ],
      subscription_data: {
        ...(trialEnd ? { trial_end: trialEnd } : {}),
        metadata: { empresa_id, tipo: 'saas_asientos' },
      },
      metadata: { empresa_id, tipo: 'saas_asientos' },
      success_url: `${base}/admin/planes?suscripcion=ok`,
      cancel_url:  `${base}/admin/planes?suscripcion=cancel`,
    })

    if (fechaInicio) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE empresas SET saas_suscripcion_inicio = ${fechaInicio}::date WHERE id = ${empresa_id}::uuid
      `)
    }

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
