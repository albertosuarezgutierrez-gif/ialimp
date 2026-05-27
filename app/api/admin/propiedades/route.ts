import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const tipo       = searchParams.get('tipo')

    const propiedades = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        p.*,
        c.nombre AS cliente_nombre,
        c.tipo   AS cliente_tipo,
        COUNT(DISTINCT cs.id)::int FILTER (
          WHERE cs.session_date = CURRENT_DATE
        ) AS sesiones_hoy,
        COUNT(DISTINCT cs.id)::int FILTER (
          WHERE cs.completed_at IS NOT NULL
        ) AS total_completadas,
        MAX(cs.session_date) FILTER (
          WHERE cs.completed_at IS NOT NULL
        ) AS ultima_limpieza
      FROM propiedades p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN cleaning_sessions cs ON cs.propiedad_id = p.id
      WHERE p.empresa_id = ${empresa_id}::uuid
        ${cliente_id ? Prisma.sql`AND p.cliente_id = ${cliente_id}::uuid` : Prisma.sql``}
        ${tipo       ? Prisma.sql`AND p.tipo = ${tipo}`                   : Prisma.sql``}
      GROUP BY p.id, c.nombre, c.tipo
      ORDER BY c.nombre ASC, p.nombre ASC
    `)

    return NextResponse.json({ propiedades })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const {
      cliente_id, nombre, tipo = 'piso_turistico',
      direccion, m2, habitaciones,
      pms_connection_id, pms_propiedad_id, zonas,
      // Precio
      modelo_precio = 'precio_fijo',
      precio_limpieza, precio_hora, horas_estimadas,
      precio_m2, precio_mensual, limpiezas_mes,
      materiales_incluidos = true, precio_materiales,
      recargo_festivo = 0, recargo_urgencia = 0, recargo_nocturno = 0,
      notas
    } = await req.json()

    if (!cliente_id || !nombre?.trim()) {
      return NextResponse.json({ error: 'Cliente y nombre son obligatorios' }, { status: 400 })
    }

    const check = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id FROM clientes
      WHERE id = ${cliente_id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!check.length) return NextResponse.json({ error: 'Cliente no válido' }, { status: 403 })

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO propiedades (
        empresa_id, cliente_id, nombre, tipo,
        direccion, m2, habitaciones,
        pms_propiedad_id, zonas,
        modelo_precio,
        precio_limpieza, precio_hora, horas_estimadas,
        precio_m2, precio_mensual, limpiezas_mes,
        materiales_incluidos, precio_materiales,
        recargo_festivo, recargo_urgencia, recargo_nocturno,
        notas
      ) VALUES (
        ${empresa_id}::uuid, ${cliente_id}::uuid, ${nombre.trim()}, ${tipo},
        ${direccion        || null},
        ${m2               ? Number(m2)            : null},
        ${habitaciones     ? Number(habitaciones)   : null},
        ${pms_propiedad_id || null},
        ${zonas?.length    ? zonas                 : null},
        ${modelo_precio},
        ${precio_limpieza  ? Number(precio_limpieza)  : null},
        ${precio_hora      ? Number(precio_hora)      : null},
        ${horas_estimadas  ? Number(horas_estimadas)  : null},
        ${precio_m2        ? Number(precio_m2)        : null},
        ${precio_mensual   ? Number(precio_mensual)   : null},
        ${limpiezas_mes    ? Number(limpiezas_mes)    : null},
        ${Boolean(materiales_incluidos)},
        ${precio_materiales ? Number(precio_materiales) : null},
        ${Number(recargo_festivo)},
        ${Number(recargo_urgencia)},
        ${Number(recargo_nocturno)},
        ${notas || null}
      )
      RETURNING *
    `)

    return NextResponse.json({ ok: true, propiedad: result[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
