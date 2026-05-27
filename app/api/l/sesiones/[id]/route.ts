import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// PATCH — actualizar checklist, incidencias, fichar entrada/salida, completar
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const jar = await cookies()
    const limpiadora_id = jar.get('limpiadora_id')?.value
    if (!limpiadora_id) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

    const { id } = await params
    const body = await req.json()
    const { accion, checklist_data, incidencias } = body

    if (accion === 'fichar_entrada') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE cleaning_sessions SET started_at = NOW()
        WHERE id = ${id}::uuid AND limpiadora_id = ${limpiadora_id}::uuid AND started_at IS NULL
      `)
    } else if (accion === 'completar') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE cleaning_sessions SET
          completed_at  = NOW(),
          checklist_data = COALESCE(${checklist_data ? JSON.stringify(checklist_data) : null}::jsonb, checklist_data)
        WHERE id = ${id}::uuid AND limpiadora_id = ${limpiadora_id}::uuid
      `)
      // Disparar notificación al propietario (fire and forget)
      fetch(new URL('/api/admin/sesiones/' + id + '/completar',
        process.env.NEXTAUTH_URL || 'https://ialimp.vercel.app').toString(),
        { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}) }
      ).catch(() => {})
    } else if (accion === 'checklist') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE cleaning_sessions SET checklist_data = ${JSON.stringify(checklist_data)}::jsonb
        WHERE id = ${id}::uuid AND limpiadora_id = ${limpiadora_id}::uuid
      `)
    } else if (accion === 'incidencia') {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE cleaning_sessions SET incidencias = ${JSON.stringify(incidencias)}::jsonb
        WHERE id = ${id}::uuid AND limpiadora_id = ${limpiadora_id}::uuid
      `)
    }

    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM sesiones_limpiadora WHERE id = ${id}::uuid
    `)
    return NextResponse.json({ ok: true, sesion: result[0] })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
