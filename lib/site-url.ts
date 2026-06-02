// URL base pública de la app. Producción = dominio propio ialimp.es.
// Fuente única para construir enlaces absolutos (emails, redirects de Stripe,
// llamadas servidor→servidor en background). Antes el literal
// 'https://ialimp.vercel.app' estaba repetido en ~10 rutas.
// Override por entorno en Vercel: NEXTAUTH_URL (preferido) o NEXT_PUBLIC_APP_URL.
export const BASE_URL =
  process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://ialimp.es'
