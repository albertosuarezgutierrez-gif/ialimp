-- Stripe Connect + pago de facturas online (con comisión de plataforma para IALIMP)
-- Cada EMPRESA (Sique Brilla, etc.) es una cuenta CONECTADA de Stripe: recibe el
-- dinero de las facturas de sus propietarios. IALIMP (plataforma) cobra una
-- comisión (application_fee) por cada pago. Modo TEST primero.

-- Limpieza de columnas Stripe HUÉRFANAS de un intento previo (estaban vacías y
-- sin uso en ningún código/rama; se sustituyen por la convención de abajo).
ALTER TABLE empresas          DROP COLUMN IF EXISTS stripe_onboarding_completo;
ALTER TABLE facturas_clientes DROP COLUMN IF EXISTS stripe_payment_status;
ALTER TABLE facturas_clientes DROP COLUMN IF EXISTS stripe_payment_url;

-- ── empresas: cuenta conectada + estado de onboarding + comisión ──
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_account_id      text;        -- acct_... de la cuenta conectada (Express)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_charges_enabled boolean NOT NULL DEFAULT false; -- onboarding completado (puede cobrar)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_comision_pct    numeric NOT NULL DEFAULT 1.0;    -- % que se queda IALIMP por pago (1 = 1%)
-- Columna ya USADA por app/api/stripe/webhook (suscripciones de plan) pero que
-- faltaba en la tabla — se formaliza aquí.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- ── facturas_clientes: rastro del pago online ──
ALTER TABLE facturas_clientes ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   text;
ALTER TABLE facturas_clientes ADD COLUMN IF NOT EXISTS stripe_checkout_session_id text;
ALTER TABLE facturas_clientes ADD COLUMN IF NOT EXISTS pagada_online_at           timestamptz;

CREATE INDEX IF NOT EXISTS ix_empresas_stripe_account
  ON empresas (stripe_account_id) WHERE stripe_account_id IS NOT NULL;
