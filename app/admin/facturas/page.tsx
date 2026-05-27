import { redirect } from 'next/navigation'
import { getEmpresaId } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import FacturasClient from './FacturasClient'

export default async function FacturasPage() {
  const empresa_id = await getEmpresaId()
  if (!empresa_id) redirect('/login')

  const año = new Date().getFullYear()

  const [facturas, clientes, resumen] = await Promise.all([
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT f.*, c.nombre AS cliente_nombre, c.tipo AS cliente_tipo
      FROM facturas_clientes f
      JOIN clientes c ON c.id = f.cliente_id
      WHERE f.empresa_id = ${empresa_id}::uuid
      ORDER BY f.created_at DESC
      LIMIT 50
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre FROM clientes
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true
      ORDER BY nombre
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT estado, COUNT(*) as count, COALESCE(SUM(total),0) as importe
      FROM facturas_clientes
      WHERE empresa_id = ${empresa_id}::uuid
        AND EXTRACT(YEAR FROM periodo_desde) = ${año}::int
      GROUP BY estado
    `)
  ])

  return <FacturasClient facturas={facturas} clientes={clientes} resumen={resumen} />
}
