import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

// PATCH — editar sesión: asignar / reasignar / DESASIGNAR limpiadora y otros campos.
// Scope obligatorio por empresa_id. No deja tocar una sesión ya completada.
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params
    const body = await req.json()
    const { property_name, session_date, hora_inicio, tipo_servicio, notas } = body

    // Sesión actual (y comprobación de pertenencia a la empresa)
    const actual = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, completed_at, origen FROM cleaning_sessions
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!actual.length) return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 })

    const cambiaLimpiadora = Object.prototype.hasOwnProperty.call(body, 'limpiadora_id')

    // No se reasigna una limpieza ya completada
    if (cambiaLimpiadora && actual[0].completed_at) {
      return NextResponse.json(
        { error: 'No se puede reasignar: la limpieza ya está completada' },
        { status: 409 }
      )
    }

    // Resto de campos (solo los enviados; casts en el SQL, nunca en el parámetro)
    await prisma.$executeRaw(Prisma.sql`
      UPDATE cleaning_sessions SET
        property_name = COALESCE(${property_name ?? null}, property_name),
        session_date  = COALESCE(${session_date ?? null}::date, session_date),
        hora_inicio   = COALESCE(${hora_inicio ?? null}::time, hora_inicio),
        tipo_servicio = COALESCE(${tipo_servicio ?? null}, tipo_servicio),
        notas         = COALESCE(${notas ?? null}, notas)
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)

    // Limpiadora: asignar (uuid), o DESASIGNAR si llega null / '' / vacío
    if (cambiaLimpiadora) {
      const lid = body.limpiadora_id
      if (lid) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE cleaning_sessions SET limpiadora_id = ${lid}::uuid
          WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
        `)
      } else {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE cleaning_sessions SET limpiadora_id = NULL
          WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
        `)
      }
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT cs.*, cs.session_date::text AS session_date,
             l.nombre AS limpiadora_nombre, l.color AS limpiadora_color
      FROM cleaning_sessions cs
      LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
      WHERE cs.id = ${id}::uuid AND cs.empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true, sesion: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// DELETE — cancelar sesión. SOLO origen='manual' (las sincronizadas con Smoobu
// las recrearía pms/sync) y solo si no ha empezado ni está completada.
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const empresa_id = await requireEmpresaId()
    const { id } = await params

    const check = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, started_at, completed_at, origen FROM cleaning_sessions
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    if (!check.length) return NextResponse.json({ error: 'No encontrada' }, { status: 404 })

    if (check[0].origen !== 'manual') {
      return NextResponse.json(
        { error: 'Solo se pueden eliminar limpiezas manuales (las de Smoobu se recrearían al sincronizar)' },
        { status: 409 }
      )
    }
    if (check[0].started_at || check[0].completed_at) {
      return NextResponse.json({ error: 'No se puede eliminar: la limpieza ya empezó o está completada' }, { status: 409 })
    }

    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM cleaning_sessions WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid AND origen = 'manual'
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
