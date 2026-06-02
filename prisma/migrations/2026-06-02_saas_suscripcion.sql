-- Suscripción del PROGRAMA (IALIMP cobra a la empresa): base + 20€ por limpiadora ACTIVA.
-- La cantidad de "asientos" se re-sincroniza cada mes con las limpiadoras activas
-- (cron /api/admin/saas/sync-asientos) → en temporada baja la empresa paga menos.
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS stripe_customer_id       text;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS saas_precio_base         numeric NOT NULL DEFAULT 80;   -- €/mes fijos (cuenta dueña)
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS saas_precio_limpiadora   numeric NOT NULL DEFAULT 20;   -- €/mes por limpiadora activa
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS saas_suscripcion_inicio  date;                          -- fecha del primer cobro
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS saas_subscription_item_base    text;                    -- id item base en Stripe
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS saas_subscription_item_asiento text;                    -- id item por-limpiadora (ajuste de cantidad)
