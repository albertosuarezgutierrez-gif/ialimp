import { NextResponse } from 'next/server'
import { serialize } from '@/lib/serialize'
import { cookies } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET(req: Request) {
  try {
    const jar = await cookies()
    const limpiadora_id = jar.get('limpiadora_id')?.value
    const empresa_id    = jar.get('empresa_id')?.value
    if (!limpiadora_id || !empresa_id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const date = searchParams.get('date') || new Date().toISOString().split('T')[0]

    const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT * FROM sesiones_limpiadora
      WHERE limpiadora_id = ${limpiadora_id}::uuid
        AND empresa_id    = ${empresa_id}::uuid
        AND session_date  = ${date}::date
      ORDER BY
        COALESCE(hora_checkout, hora_inicio, hora_pactada) NULLS LAST
    `)

    return NextResponse.json(serialize({ sesiones, date }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
