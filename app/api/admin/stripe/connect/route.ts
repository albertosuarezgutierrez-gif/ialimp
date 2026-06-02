import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { getStripe, appBaseUrl } from '@/lib/stripe'

export const dynamic = 'force-dynamic'

// GET — estado de la conexión Connect de la empresa (refresca desde Stripe).
export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, nombre, email, stripe_account_id, stripe_charges_enabled
      FROM empresas WHERE id = ${empresa_id}::uuid
    `)
    const empresa = rows[0]
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    if (!empresa.stripe_account_id) {
      return NextResponse.json({ conectada: false, charges_enabled: false })
    }

    const stripe = await getStripe()
    if (!stripe) {
      // Sin claves: devolvemos lo que tengamos en BD sin romper.
      return NextResponse.json({
        conectada: true,
        charges_enabled: !!empresa.stripe_charges_enabled,
        stripe_no_configurado: true,
      })
    }

    const acct = await stripe.accounts.retrieve(empresa.stripe_account_id)
    const charges = !!acct.charges_enabled
    // Persistimos el flag para que el resto de la app no dependa de llamar a Stripe.
    if (charges !== empresa.stripe_charges_enabled) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE empresas SET stripe_charges_enabled = ${charges} WHERE id = ${empresa_id}::uuid
      `)
    }
    return NextResponse.json({
      conectada: true,
      charges_enabled: charges,
      details_submitted: !!acct.details_submitted,
      payouts_enabled: !!acct.payouts_enabled,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — crea (o reusa) la cuenta Express de la empresa y devuelve el enlace de
// onboarding de Stripe para que la empresa conecte su cuenta bancaria.
export async function POST() {
  try {
    const empresa_id = await requireEmpresaId()
    const stripe = await getStripe()
    if (!stripe) {
      return NextResponse.json({ error: 'Stripe no configurado', demo: true }, { status: 503 })
    }

    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text, nombre, email, stripe_account_id
      FROM empresas WHERE id = ${empresa_id}::uuid
    `)
    const empresa = rows[0]
    if (!empresa) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

    let accountId: string = empresa.stripe_account_id

    if (!accountId) {
      const acct = await stripe.accounts.create({
        type: 'express',
        country: 'ES',
        email: empresa.email || undefined,
        business_type: 'company',
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { empresa_id },
      })
      accountId = acct.id
      await prisma.$executeRaw(Prisma.sql`
        UPDATE empresas SET stripe_account_id = ${accountId} WHERE id = ${empresa_id}::uuid
      `)
    }

    const base = appBaseUrl()
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/admin/planes?connect=refresh`,
      return_url:  `${base}/admin/planes?connect=ok`,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: link.url, account_id: accountId })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
