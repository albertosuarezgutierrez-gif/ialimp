import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { serialize } from '@/lib/serialize'

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const body = await req.json()
    const sets: string[] = []
    const fields = [
      'nombre','tipo','direccion','codigo_postal','modelo_precio',
      'precio_limpieza','duracion_estimada_min','hora_checkout_habitual',
      'hora_checkin_habitual','num_camas_dobles','num_camas_individuales',
      'num_banos','num_huespedes_max','tiene_piscina','tiene_terraza',
      'notas_material','limpiadora_principal_id','limpiadora_suplente_id',
      'activa','asignacion_fija'
    ]

    // Build update dynamically
    const updates = fields.filter(f => f in body).map(f => `${f} = $\{body[f] === null ? 'NULL' : JSON.stringify(body[f])\}`)
    if (!updates.length) return NextResponse.json({ ok: true })

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      UPDATE propiedades SET
        nombre       = COALESCE(${body.nombre       ?? null}, nombre),
        precio_limpieza = COALESCE(${body.precio_limpieza ?? null}, precio_limpieza),
        duracion_estimada_min = COALESCE(${body.duracion_estimada_min ?? null}, duracion_estimada_min),
        notas_material = COALESCE(${body.notas_material ?? null}, notas_material),
        activa       = COALESCE(${body.activa        ?? null}, activa)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      RETURNING *
    `)
    return NextResponse.json(serialize({ ok: true, propiedad: result[0] }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    await prisma.$executeRaw(Prisma.sql`
      UPDATE propiedades SET activa = false
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
