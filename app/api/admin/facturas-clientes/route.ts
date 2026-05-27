import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// GET — listar facturas con filtros
export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const cliente_id = searchParams.get('cliente_id')
    const estado     = searchParams.get('estado')
    const año        = searchParams.get('año')

    const facturas = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT
        f.*,
        c.nombre AS cliente_nombre,
        c.tipo   AS cliente_tipo,
        COUNT(fl.id) AS num_lineas
      FROM facturas_clientes f
      JOIN clientes c ON c.id = f.cliente_id
      LEFT JOIN factura_clientes_lineas fl ON fl.factura_id = f.id
      WHERE f.empresa_id = ${empresa_id}::uuid
        ${cliente_id ? Prisma.sql`AND f.cliente_id = ${cliente_id}::uuid` : Prisma.sql``}
        ${estado     ? Prisma.sql`AND f.estado = ${estado}`               : Prisma.sql``}
        ${año        ? Prisma.sql`AND EXTRACT(YEAR FROM f.periodo_desde) = ${parseInt(año)}::int` : Prisma.sql``}
      GROUP BY f.id, c.nombre, c.tipo
      ORDER BY f.created_at DESC
    `)

    // Totales por estado
    const resumen = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT estado, COUNT(*) as count, SUM(total) as importe
      FROM facturas_clientes
      WHERE empresa_id = ${empresa_id}::uuid
        ${año ? Prisma.sql`AND EXTRACT(YEAR FROM periodo_desde) = ${parseInt(año)}::int` : Prisma.sql``}
      GROUP BY estado
    `)

    return NextResponse.json({ facturas, resumen })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST — crear factura (manual o auto-generada desde sesiones)
export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const {
      cliente_id, periodo_desde, periodo_hasta,
      concepto, iva_porcentaje = 21,
      lineas = [], // [{ descripcion, cantidad, precio_unitario }]
      auto_generar = false // si true, genera lineas desde sesiones completadas
    } = await req.json()

    if (!cliente_id || !periodo_desde || !periodo_hasta) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 })
    }

    // Verificar cliente
    const check = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre FROM clientes
      WHERE id = ${cliente_id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!check.length) return NextResponse.json({ error: 'Cliente no válido' }, { status: 403 })

    // Generar número de factura único: F-YYYY-NNNN
    const año = new Date(periodo_desde).getFullYear()
    const ultimo = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT numero_factura FROM facturas_clientes
      WHERE empresa_id = ${empresa_id}::uuid
        AND numero_factura LIKE ${'F-' + año + '-%'}
      ORDER BY numero_factura DESC LIMIT 1
    `)
    let siguiente = 1
    if (ultimo.length) {
      const parts = ultimo[0].numero_factura.split('-')
      siguiente = parseInt(parts[parts.length - 1]) + 1
    }
    const numero_factura = 'F-' + año + '-' + String(siguiente).padStart(4, '0')

    // Auto-generar líneas desde sesiones si se solicita
    let lineasFinales = [...lineas]
    if (auto_generar) {
      const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT tipo_servicio, COUNT(*) as cantidad, property_name
        FROM cleaning_sessions
        WHERE cliente_id = ${cliente_id}::uuid
          AND empresa_id = ${empresa_id}::uuid
          AND completed_at IS NOT NULL
          AND session_date BETWEEN ${periodo_desde}::date AND ${periodo_hasta}::date
        GROUP BY tipo_servicio, property_name
        ORDER BY tipo_servicio, property_name
      `)

      // Buscar tarifas del cliente o precio por defecto
      const tarifas = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT tipo_servicio, precio FROM tarifas_limpiadoras
        WHERE empresa_id = ${empresa_id}::uuid
        LIMIT 10
      `)
      const tarifaMap: Record<string, number> = {}
      tarifas.forEach((t: any) => { tarifaMap[t.tipo_servicio] = Number(t.precio) })

      lineasFinales = sesiones.map((s: any) => ({
        descripcion:    'Limpieza ' + (s.tipo_servicio || 'rotacion') + ' — ' + s.property_name,
        cantidad:       Number(s.cantidad),
        precio_unitario: tarifaMap[s.tipo_servicio] || 0
      }))
    }

    // Calcular base imponible
    const base = lineasFinales.reduce((acc: number, l: any) =>
      acc + (Number(l.cantidad) * Number(l.precio_unitario)), 0
    )

    // Crear factura
    const factura = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO facturas_clientes (
        empresa_id, cliente_id, numero_factura,
        periodo_desde, periodo_hasta, concepto,
        base_imponible, iva_porcentaje, estado,
        fecha_emision
      ) VALUES (
        ${empresa_id}::uuid, ${cliente_id}::uuid, ${numero_factura},
        ${periodo_desde}::date, ${periodo_hasta}::date,
        ${concepto || 'Servicios de limpieza'},
        ${base}, ${iva_porcentaje}, 'borrador',
        CURRENT_DATE
      )
      RETURNING *
    `)

    const factura_id = factura[0].id

    // Insertar líneas
    for (const linea of lineasFinales) {
      if (!linea.descripcion) continue
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO factura_clientes_lineas (factura_id, descripcion, cantidad, precio_unitario, orden)
        VALUES (${factura_id}::uuid, ${linea.descripcion}, ${Number(linea.cantidad)}, ${Number(linea.precio_unitario)}, ${lineasFinales.indexOf(linea)})
      `)
    }

    return NextResponse.json({ ok: true, factura: factura[0], numero_factura }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
