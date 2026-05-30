import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export async function GET(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const productos = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT *, (stock_actual <= stock_minimo) AS alerta_stock
      FROM productos_stock
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true
      ORDER BY categoria, nombre
    `)
    return NextResponse.json(serialize({ productos }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { nombre, categoria, unidad, stock_actual, stock_minimo, precio_unitario } = await req.json()
    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO productos_stock (empresa_id, nombre, categoria, unidad, stock_actual, stock_minimo, precio_unitario)
      VALUES (${empresa_id}::uuid, ${nombre}, ${categoria||'limpieza'}, ${unidad||'unidad'}, ${Number(stock_actual||0)}, ${Number(stock_minimo||0)}, ${precio_unitario ? Number(precio_unitario) : null})
      RETURNING *
    `)
    return NextResponse.json({ ok: true, producto: result[0] }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const b = await req.json()
    if (!b.id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await prisma.$executeRaw(Prisma.sql`
      UPDATE productos_stock SET
        nombre          = ${b.nombre},
        categoria       = ${b.categoria || 'limpieza'},
        unidad          = ${b.unidad || 'unidad'},
        stock_actual    = ${Number(b.stock_actual ?? 0)},
        stock_minimo    = ${Number(b.stock_minimo ?? 0)},
        precio_unitario = ${b.precio_unitario ? Number(b.precio_unitario) : null}
      WHERE id = ${b.id}::uuid
        AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })
    await prisma.$executeRaw(Prisma.sql`
      UPDATE productos_stock SET activo = false
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
