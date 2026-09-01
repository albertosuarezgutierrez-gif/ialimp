# Stripe — activar el cobro a clientes (suscripciones Pro / Agency)

> Estado: **NO activo todavía**. Mientras `STRIPE_SECRET_KEY` no esté en las env de
> Vercel, `/api/stripe/checkout` devuelve 503 y el webhook no hace nada. El código ya
> apunta al dominio `app.ialimp.es`. Esto es la guía para activarlo cuando toque.

## ⚠️ Cuenta correcta
El conector de Stripe del entorno de Claude está enlazado a la cuenta **`ia.rest`**
(`acct_…`, OTRO negocio). **NO** se debe usar para IALIMP. Hay que operar con la cuenta
**Stripe propia de IALIMP** (su dashboard / sus claves `sk_live_…`).

## Pasos para activarlo

### 1. Crear productos y precios en el Stripe de IALIMP
Crear **2 productos** con **2 precios** cada uno (mensual + anual), modo *recurring*:
- **Pro**: precio mensual + precio anual.
- **Agency**: precio mensual + precio anual.

> El webhook (`app/api/stripe/webhook/route.ts`) decide el plan mirando si el
> **nickname** del precio contiene `"agency"` → plan `agency`; si no, `pro`.
> **Pon el nickname de los dos precios de Agency con la palabra `agency`** (p. ej.
> "Agency mensual", "Agency anual"). Los de Pro, cualquier nombre sin "agency".

### 2. Poner las claves y price IDs en Vercel (proyecto `ialimp`, env Production)
```
STRIPE_SECRET_KEY          = sk_live_...
STRIPE_WEBHOOK_SECRET      = whsec_...   (del paso 3)
STRIPE_PRICE_PRO_MONTHLY   = price_...
STRIPE_PRICE_PRO_ANNUAL    = price_...
STRIPE_PRICE_AGENCY_MONTHLY= price_...
STRIPE_PRICE_AGENCY_ANNUAL = price_...
```
> `app/api/stripe/checkout/route.ts` ya lee esos `STRIPE_PRICE_*` por env; no hay que
> tocar código. Si no se ponen, usa placeholders inválidos (Stripe daría error → por eso
> hay que rellenarlos).

### 3. Crear el webhook en Stripe (Developers → Webhooks → Add endpoint)
- **Endpoint URL:** `https://app.ialimp.es/api/stripe/webhook`
- **Eventos a escuchar** (los únicos que maneja el código):
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- Copiar el **Signing secret** (`whsec_…`) → ponerlo en `STRIPE_WEBHOOK_SECRET` (paso 2).

### 4. Redeploy y probar
- Redeploy del proyecto `ialimp` (para tomar las env).
- Probar un alta desde `/admin/planes` → checkout → completar pago de prueba → comprobar
  que la empresa pasa a `plan = pro|agency` (el webhook actualiza `empresas.plan` y
  `empresas.stripe_subscription_id` usando `subscription.metadata.empresa_id`, que el
  checkout ya rellena).

## Cómo funciona (referencia)
- **Checkout:** `POST /api/stripe/checkout` `{plan: 'pro'|'agency', annual?: bool}` → crea
  una `checkout.session` (mode subscription) con `metadata.empresa_id` y devuelve la `url`.
  `success_url`/`cancel_url` salen de `NEXTAUTH_URL` (= `https://app.ialimp.es`).
- **Webhook:** `POST /api/stripe/webhook` verifica la firma con `STRIPE_WEBHOOK_SECRET` y,
  según el evento de suscripción, escribe `empresas.plan` (`pro`/`agency`/`starter`).
