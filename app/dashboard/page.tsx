import { redirect } from 'next/navigation'
import { getEmpresaId } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const empresa_id = await getEmpresaId()
  if (!empresa_id) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const [empresa, sesiones, conexiones] = await Promise.all([
    prisma.$queryRaw<any[]>(Prisma.sql`SELECT nombre, email, plan FROM empresas WHERE id = ${empresa_id}::uuid`),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT cs.id, cs.session_date, cs.property_name, cs.property_id,
             cs.started_at, cs.completed_at, cs.hora_llegada, cs.hora_salida,
             l.nombre as limpiadora_nombre, l.id as limpiadora_id
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      WHERE cs.empresa_id = ${empresa_id}::uuid AND cs.session_date = ${today}::date
      ORDER BY l.nombre
    `),
    prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, cliente_nombre, pms_tipo, activa, ultimo_sync, sync_error
      FROM pms_connections WHERE empresa_id = ${empresa_id}::uuid
      ORDER BY cliente_nombre
    `)
  ])

  return (
    <DashboardClient
      empresa={empresa[0] || {}}
      sesiones={sesiones}
      conexiones={conexiones}
      today={today}
    />
  )
}
