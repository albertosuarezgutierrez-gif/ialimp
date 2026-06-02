import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { getStripe, appBaseUrl, DEFAULT_COMISION_PCT } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// Pago online de una factura por el propietario (acceso por token).
// Destination charge de Stripe Connect: el dinero va a la cuenta conectada de la
// empresa y IALIMP retiene una comisión (application_fee).
export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string; id: string }> }
) {
  try {
    const { token, id } = await params

    // Cliente por token (mismo patrón que el resto del portal por token)
    const cli = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, empresa_id::text, nombre FROM clientes
      WHERE access_token = ${token} AND notif_activa = true LIMIT 1
    `)
    const cliente = cli[0]
    if (!cliente) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const stripe = await getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Pagos no disponibles ahora mismo' }, { status: 503 })
    }

    // Factura — debe ser de este cliente y esta empresa, emitida/vencida y no pagada
    const fr = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, numero_factura, total::float, estado,
             stripe_checkout_session_id
      FROM facturas_clientes
      WHERE id = ${id}::uuid
        AND cliente_id = ${cliente.id}::uuid
        AND empresa_id = ${cliente.empresa_id}::uuid
      LIMIT 1
    `)
    const factura = fr[0]
    if (!factura) return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 })
    if (factura.estado === 'pagada') {
      return NextResponse.json({ error: 'Esta factura ya está pagada' }, { status: 409 })
    }
    if (factura.estado === 'borrador') {
      return NextResponse.json({ error: 'Factura aún no emitida' }, { status: 409 })
    }
    const totalCent = Math.round(Number(factura.total) * 100)
    if (!totalCent || totalCent < 50) {
      return NextResponse.json({ error: 'Importe no válido para pago online' }, { status: 400 })
    }

    // Empresa — cuenta conectada lista para cobrar
    const er = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT nombre, stripe_account_id, stripe_charges_enabled,
             COALESCE(stripe_comision_pct, ${DEFAULT_COMISION_PCT})::float AS comision_pct
      FROM empresas WHERE id = ${cliente.empresa_id}::uuid
    `)
    const empresa = er[0]
    if (!empresa?.stripe_account_id || !empresa.stripe_charges_enabled) {
      return NextResponse.json(
        { error: 'La empresa todavía no tiene activados los pagos online' },
        { status: 409 }
      )
    }

    const feeCent = Math.round(totalCent * (Number(empresa.comision_pct) / 100))
    const base = appBaseUrl()

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: totalCent,
          product_data: { name: `Factura ${factura.numero_factura || ''}`.trim() },
        },
      }],
      payment_intent_data: {
        // Comisión ÚNICA para la empresa (~2,5%): IALIMP es el comerciante, cobra
        // el application_fee y paga por dentro la tarifa de Stripe (~1,5%), de modo
        // que le queda ~1% limpio y la empresa ve un solo descuento. (Por eso NO se
        // usa on_behalf_of: así la tarifa de Stripe la asume la plataforma.)
        application_fee_amount: feeCent,
        transfer_data: { destination: empresa.stripe_account_id },
        metadata: { factura_id: factura.id, empresa_id: cliente.empresa_id, cliente_id: cliente.id },
      },
      metadata: { factura_id: factura.id, empresa_id: cliente.empresa_id, cliente_id: cliente.id },
      success_url: `${base}/propietario/${token}?pago=ok`,
      cancel_url:  `${base}/propietario/${token}?pago=cancel`,
    })

    await prisma.$executeRaw(Prisma.sql`
      UPDATE facturas_clientes SET stripe_checkout_session_id = ${session.id}
      WHERE id = ${factura.id}::uuid
    `)

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
