import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

// Cron diario — detectar gastos próximos a vencer y crear alertas
export async function GET() {
  try {
    // Gastos que vencen dentro de alerta_dias y cuya alerta no se ha enviado aún
    const proximos = await prisma.$queryRaw<any[]>(Prisma.sql\`
      SELECT
        g.id::text, g.tipo, g.nombre, g.importe::float,
        g.fecha_vencimiento::text, g.alerta_dias,
        g.proveedor, g.numero_poliza,
        c.nombre AS cliente_nombre, c.contacto_email, c.contacto_tel,
        c.id::text AS cliente_id,
        e.id::text AS empresa_id, e.nombre AS empresa_nombre,
        p.nombre AS propiedad_nombre, p.direccion,
        (g.fecha_vencimiento - CURRENT_DATE)::int AS dias_restantes
      FROM propietario_gastos g
      JOIN clientes c ON c.id = g.cliente_id
      LEFT JOIN propiedades p ON p.id = g.propiedad_id
      JOIN empresas e ON e.id = g.empresa_id
      WHERE g.activo = true
        AND g.fecha_vencimiento IS NOT NULL
        AND g.alerta_enviada = false
        AND (g.fecha_vencimiento - CURRENT_DATE)::int <= g.alerta_dias
        AND g.fecha_vencimiento >= CURRENT_DATE
    \`)

    let alertas_creadas = 0
    for (const g of proximos) {
      // Crear alerta en el panel admin
      const titulo = g.dias_restantes <= 7
        ? \`🔴 URGENTE: \${g.nombre} vence en \${g.dias_restantes} días\`
        : \`⚠️ \${g.nombre} vence en \${g.dias_restantes} días\`

      const desc = \`Cliente: \${g.cliente_nombre} | \`
        + (g.propiedad_nombre ? \`Propiedad: \${g.propiedad_nombre} | \` : '')
        + \`Proveedor: \${g.proveedor || '—'} | Importe: \${g.importe ? g.importe + '€' : '—'}\`
        + \`\nVence: \${g.fecha_vencimiento} | Tel: \${g.contacto_tel || '—'}\`

      await prisma.$executeRaw(Prisma.sql\`
        INSERT INTO alertas (empresa_id, tipo, titulo, descripcion, datos)
        VALUES (
          \${g.empresa_id}::uuid,
          'gasto_vencimiento',
          \${titulo},
          \${desc},
          \${JSON.stringify({
            gasto_id: g.id, cliente_id: g.cliente_id,
            tipo_gasto: g.tipo, dias_restantes: g.dias_restantes,
            cliente_nombre: g.cliente_nombre, contacto_email: g.contacto_email,
            contacto_tel: g.contacto_tel, propiedad: g.propiedad_nombre
          })}::jsonb
        )
      \`)

      // Marcar como enviada
      await prisma.$executeRaw(Prisma.sql\`
        UPDATE propietario_gastos SET alerta_enviada = true, alerta_at = NOW()
        WHERE id = \${g.id}::uuid
      \`)
      alertas_creadas++
    }

    return NextResponse.json({ ok: true, candidatos: proximos.length, alertas_creadas })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
