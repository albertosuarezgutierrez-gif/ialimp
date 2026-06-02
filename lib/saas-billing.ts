// Suscripción del PROGRAMA: IALIMP cobra a la empresa una cuota mensual =
//   base (saas_precio_base, def. 80€) + saas_precio_limpiadora (def. 20€) × limpiadoras ACTIVAS.
// La parte por limpiadora es un "asiento" cuya CANTIDAD se re-sincroniza cada mes
// con el nº de limpiadoras activas (cron sync-asientos) → en temporada baja paga menos.
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function getEmpresaBilling(empresa_id: string) {
  const r = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id::text, nombre, email,
           stripe_customer_id, stripe_subscription_id,
           saas_subscription_item_base, saas_subscription_item_asiento,
           COALESCE(saas_precio_base, 80)::float       AS precio_base,
           COALESCE(saas_precio_limpiadora, 20)::float AS precio_limpiadora,
           saas_suscripcion_inicio::text               AS inicio
    FROM empresas WHERE id = ${empresa_id}::uuid
  `)
  return r[0] || null
}

// Limpiadoras ACTIVAS de la empresa (base de los asientos cobrables).
export async function countLimpiadorasActivas(empresa_id: string): Promise<number> {
  const r = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT count(*)::int AS n FROM limpiadoras
    WHERE empresa_id = ${empresa_id}::uuid AND COALESCE(activa, true) = true
  `)
  return Number(r[0]?.n || 0)
}

// Cuota teórica del mes según activas actuales.
export function calcCuota(precioBase: number, precioLimpiadora: number, activas: number) {
  const base = Number(precioBase) || 0
  const porAsiento = (Number(precioLimpiadora) || 0) * activas
  return { base, porAsiento, total: base + porAsiento, activas }
}
