
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import PropietarioClient from './PropietarioClient'
import PropietarioConsentGate from '@/components/PropietarioConsentGate'
import { serialize } from '@/lib/serialize'

export default async function PropietarioPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.*, e.nombre AS empresa_nombre, e.email AS empresa_email,
           COALESCE(c.chat_config, '{"ver_checklist":false,"ver_fotos":false}'::jsonb) AS chat_config
    FROM clientes c JOIN empresas e ON e.id = c.empresa_id
    WHERE c.access_token = ${token} AND c.notif_activa = true
  `)
  if (!clientes.length) redirect('/')
  const cliente = clientes[0]

  // ── Puerta de consentimiento (RGPD/LSSI) ──────────────────────────
  // Solo se muestra cuando la columna existe y vale false (estricto):
  // si la migración aún no se ha ejecutado, acepto_terminos será undefined
  // y el portal funciona como antes (no bloquea a nadie).
  if (cliente.acepto_terminos === false) {
    let empresaRazon: string = cliente.empresa_nombre
    let empresaNif = ''
    try {
      const f = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT razon_social, nif FROM empresas WHERE id = ${cliente.empresa_id}::uuid LIMIT 1
      `)
      if (f.length) {
        empresaRazon = f[0].razon_social || empresaRazon
        empresaNif = f[0].nif || ''
      }
    } catch { /* columnas fiscales no disponibles: usamos el nombre */ }

    return (
      <PropietarioConsentGate
        token={token}
        empresaNombre={empresaRazon}
        empresaNif={empresaNif || '—'}
        empresaEmail={cliente.empresa_email}
      />
    )
  }

  // Extraer permisos del chat_config
  const cfg      = (cliente.chat_config as any) || {}
  const permisos = {
    ver_checklist: cfg.ver_checklist === true,
    ver_fotos:     cfg.ver_fotos     === true,
  }

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

  return (
    <PropietarioClient
      cliente={serialize(cliente)}
      propiedades={serialize(propiedades)}
      historial={serialize(historial)}
      token={token}
      permisos={permisos}
    />
  )
}
