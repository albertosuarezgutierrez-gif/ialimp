import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// slug estable para item_key dentro del protocolo (estancia + orden)
function slug(s: string): string {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'item'
}

// GET /api/admin/protocolos?propiedad_id=...  (o ?session_id=...)
// Devuelve el protocolo activo del piso con sus items y fotos.
export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams
    let propiedad_id = sp.get('propiedad_id')
    const session_id = sp.get('session_id')
    if (!propiedad_id && session_id) {
      const s = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT propiedad_id::text AS propiedad_id FROM cleaning_sessions WHERE id = ${session_id}::uuid LIMIT 1`)
      propiedad_id = s[0]?.propiedad_id || null
    }
    if (!propiedad_id) return NextResponse.json({ error: 'propiedad_id o session_id requerido' }, { status: 400 })

    const prot = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id::text AS id, nombre, datos FROM protocolos WHERE propiedad_id = ${propiedad_id}::uuid AND activo LIMIT 1`)
    if (!prot.length) return NextResponse.json({ protocolo: null })

    const pid = prot[0].id
    const items = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT estancia, item_key, descripcion, requiere_foto, orden FROM protocolo_items WHERE protocolo_id = ${pid}::uuid ORDER BY orden`)
    const fotos = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT item_key, estancia, categoria, url, caption, orden FROM protocolo_fotos WHERE protocolo_id = ${pid}::uuid ORDER BY orden`)

    return NextResponse.json({ protocolo: { ...prot[0], items, fotos } })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// POST /api/admin/protocolos
// Crea (o reemplaza) el protocolo activo de un piso a partir de un borrador
// (p. ej. el que devuelve /protocolos/extraer tras revisarlo).
// body: { propiedad_id, nombre?, datos?, items: [{ estancia, descripcion, requiere_foto }] }
export async function POST(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    const { propiedad_id, nombre, datos, items } = await req.json()
    if (!propiedad_id) return NextResponse.json({ error: 'propiedad_id requerido' }, { status: 400 })
    if (!Array.isArray(items) || !items.length) return NextResponse.json({ error: 'items vacíos' }, { status: 400 })

    // El piso debe ser de esta empresa (frontera multi-tenant)
    const own = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT 1 FROM propiedades WHERE id = ${propiedad_id}::uuid AND empresa_id = ${empresa_id}::uuid LIMIT 1`)
    if (!own.length) return NextResponse.json({ error: 'Propiedad no encontrada' }, { status: 404 })

    // Desactivar el protocolo activo anterior (no se borra: histórico)
    await prisma.$executeRaw(Prisma.sql`
      UPDATE protocolos SET activo = false, updated_at = now()
      WHERE propiedad_id = ${propiedad_id}::uuid AND empresa_id = ${empresa_id}::uuid AND activo`)

    const ins = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO protocolos (empresa_id, propiedad_id, nombre, datos, activo)
      VALUES (${empresa_id}::uuid, ${propiedad_id}::uuid, ${(nombre || 'Protocolo').slice(0, 120)},
              ${JSON.stringify(datos || {})}::jsonb, true)
      RETURNING id::text AS id`)
    const pid = ins[0].id

    let orden = 0
    for (const it of items) {
      if (!it?.descripcion) continue
      orden++
      const estancia = String(it.estancia || 'General').slice(0, 60)
      const key = `${slug(estancia)}_${orden}`
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO protocolo_items (protocolo_id, estancia, item_key, descripcion, requiere_foto, orden)
        VALUES (${pid}::uuid, ${estancia}, ${key}, ${String(it.descripcion).slice(0, 300)},
                ${!!it.requiere_foto}, ${orden})`)
    }

    return NextResponse.json({ ok: true, protocolo_id: pid, items: orden })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
