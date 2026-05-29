import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import PropietarioClient from './PropietarioClient'
import { serialize } from '@/lib/serialize'

export default async function PropietarioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.*, e.nombre AS empresa_nombre, e.email AS empresa_email
    FROM clientes c JOIN empresas e ON e.id = c.empresa_id
    WHERE c.access_token = ${token} AND c.notif_activa = true
  `)
  if (!clientes.length) redirect('/')
  const cliente = clientes[0]

  const propiedades = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      p.id, p.nombre, p.direccion, p.tipo,
      p.hora_checkout_habitual::text AS hora_checkout,
      p.hora_checkin_habitual::text  AS hora_checkin_siguiente,
      p.instrucciones_acceso,
      p.archivos_acceso,
      p.tipo_acceso,
      p.codigo_acceso,
      cs_hoy.sesion_id,
      cs_hoy.estado_hoy,
      cs_hoy.hora_completada,
      cs_hoy.limpiadora_nombre,
      cs_hoy.foto_url,
      cs_hoy.firma_at,
      cs_hoy.firma_nombre
    FROM propiedades p
    LEFT JOIN LATERAL (
      SELECT
        cs.id AS sesion_id,
        CASE WHEN cs.completed_at IS NOT NULL THEN 'completada'
             WHEN cs.started_at   IS NOT NULL THEN 'en_curso'
             ELSE 'pendiente' END AS estado_hoy,
        TO_CHAR(cs.completed_at AT TIME ZONE 'Europe/Madrid', 'HH24:MI') AS hora_completada,
        l.nombre AS limpiadora_nombre,
        cs.foto_despues_url AS foto_url,
        cs.firma_at,
        cs.firma_cliente_nombre AS firma_nombre
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      WHERE cs.propiedad_id = p.id AND cs.session_date = CURRENT_DATE
      LIMIT 1
    ) cs_hoy ON true
    WHERE p.cliente_id = ${cliente.id}::uuid AND p.activa = true
    ORDER BY p.nombre ASC
  `)

  const historial = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT
      cs.id, cs.session_date, cs.property_name,
      TO_CHAR(cs.completed_at AT TIME ZONE 'Europe/Madrid', 'HH24:MI') AS hora_fin,
      cs.foto_despues_url, l.nombre AS limpiadora
    FROM cleaning_sessions cs
    LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
    WHERE cs.cliente_id = ${cliente.id}::uuid AND cs.completed_at IS NOT NULL
    ORDER BY cs.session_date DESC, cs.completed_at DESC
    LIMIT 20
  `)

  const safeCliente   = serialize(cliente)
  const safeProps     = serialize(propiedades)
  const safeHistorial = serialize(historial)

  return (
    <PropietarioClient
      cliente={safeCliente}
      propiedades={safeProps}
      historial={safeHistorial}
      token={token}
    />
  )
}
