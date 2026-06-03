// Rellena emails que faltan: rastrea la web de los prospectos que tienen web pero
// no email y completa el campo (panel superadmin). Gratis, best-effort.
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { isSuperadmin } from '@/lib/tenant'
import { extraerEmailDeWeb } from '@/lib/google-leads'

export async function POST() {
  try {
    if (!await isSuperadmin()) return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })

    // Lote pequeño para no exceder el timeout serverless (cada web ~5s, en paralelo).
    const pendientes = await prisma.$queryRaw<{ id: string; web: string }[]>(Prisma.sql`
      SELECT id, web FROM mailing_prospectos
      WHERE baja = false AND email IS NULL AND web IS NOT NULL AND web <> ''
      ORDER BY created_at DESC LIMIT 15
    `)

    let encontrados = 0
    await Promise.allSettled(pendientes.map(async p => {
      const email = await extraerEmailDeWeb(p.web)
      if (!email) return
      try {
        const r = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
          UPDATE mailing_prospectos SET email = ${email}
          WHERE id = ${p.id}::uuid
            AND NOT EXISTS (SELECT 1 FROM mailing_prospectos WHERE lower(email) = ${email})
          RETURNING id
        `)
        if (r.length) encontrados++
      } catch { /* email ya existe en otro prospecto: ignorar */ }
    }))

    return NextResponse.json({ ok: true, revisados: pendientes.length, encontrados })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
