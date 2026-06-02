-- =====================================================================
-- Migración: tokens de recuperación de contraseña.
-- Cubre las 3 entidades con email+contraseña: empresas, usuarios_empresa,
-- superadmins. El token se envía en claro por email pero en BD se guarda
-- SOLO su hash SHA-256 (una fuga de BD no permite resetear). Un solo uso,
-- caduca en 1 hora. Aditiva e idempotente (IF NOT EXISTS).
-- =====================================================================

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_hash  TEXT NOT NULL UNIQUE,          -- SHA-256 del token (el claro va solo en el email)
  entity_type TEXT NOT NULL,                 -- 'empresa' | 'usuario' | 'superadmin'
  entity_id   UUID NOT NULL,
  email       TEXT NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prt_token  ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_prt_entity ON password_reset_tokens(entity_type, entity_id);

COMMENT ON TABLE password_reset_tokens IS
  'Tokens de recuperación de contraseña (hash SHA-256, un solo uso, caduca en 1h). entity_type: empresa|usuario|superadmin.';
