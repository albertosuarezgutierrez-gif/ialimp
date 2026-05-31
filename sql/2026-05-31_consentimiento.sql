-- ============================================================
-- IALIMP · Campos de consentimiento en la tabla `clientes`
-- Ejecutar en Supabase (SQL Editor). La tabla `clientes` no está en
-- el schema de Prisma; se accede por SQL crudo, así que no hace falta
-- prisma generate: basta con crear estas columnas.
-- ============================================================

ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS acepto_terminos        boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acepto_terminos_fecha  timestamptz,
  ADD COLUMN IF NOT EXISTS acepto_comercial       boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS acepto_comercial_fecha timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip             text,
  ADD COLUMN IF NOT EXISTS consent_version        text,
  ADD COLUMN IF NOT EXISTS consent_canal          text;

-- (Opcional) localizar rápido a quién se puede enviar comerciales:
CREATE INDEX IF NOT EXISTS idx_clientes_acepto_comercial
  ON clientes (acepto_comercial) WHERE acepto_comercial = true;
