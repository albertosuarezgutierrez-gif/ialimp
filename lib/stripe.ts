// Cliente Stripe centralizado (igual patrón que lib/mailer.ts).
// Si no hay STRIPE_SECRET_KEY → devuelve null y la ruta degrada con 503 (no rompe).
// Cuenta de plataforma = IALIMP. Cada empresa cliente es una cuenta CONECTADA
// (Connect Express) que recibe el dinero de las facturas de sus propietarios;
// IALIMP cobra una comisión (application_fee) por pago.
import type Stripe from 'stripe'

let _stripe: Stripe | null = null

export async function getStripe(): Promise<Stripe | null> {
  if (!process.env.STRIPE_SECRET_KEY) return null
  if (_stripe) return _stripe
  const StripeMod = (await import('stripe')).default
  _stripe = new StripeMod(process.env.STRIPE_SECRET_KEY)
  return _stripe
}

// URL base de la app según host (white-label friendly). En servidor no hay
// window; usamos la env de despliegue con fallback a producción.
export function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '') ||
    'https://ialimp.vercel.app'
  )
}

// Comisión de plataforma por defecto (1%). Se puede sobreescribir por empresa
// con la columna empresas.stripe_comision_pct.
export const DEFAULT_COMISION_PCT = 1.0
