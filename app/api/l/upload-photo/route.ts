import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET        = 'cleaning-photos'
const APP_URL       = process.env.NEXTAUTH_URL || 'https://ialimp.vercel.app'

// Items que NO se analizan (fotos de referencia, no de estado real)
const EXCLUIR_ANALISIS = ['referencia', 'ref', 'ejemplo', 'muestra']

export async function POST(req: NextRequest) {
  try {
    const form       = await req.formData()
    const file       = form.get('file') as File | null
    const session_id = form.get('session_id') as string
    const item_id    = (form.get('item_id') as string) || (form.get('tipo') as string) || 'foto'
    const slot       = (form.get('slot') as string) || '1'

    if (!file)       return NextResponse.json({ error: 'No file' },       { status: 400 })
    if (!session_id) return NextResponse.json({ error: 'No session_id' }, { status: 400 })

    const bytes  = await file.arrayBuffer()
    const sizeMB = bytes.byteLength / (1024 * 1024)
    if (sizeMB > 10) return NextResponse.json({ error: 'Foto demasiado grande (máx 10MB)' }, { status: 400 })

    const path      = 'sessions/' + session_id + '/' + item_id + '_' + slot + '.jpg'
    const uploadUrl = SUPABASE_URL + '/storage/v1/object/' + BUCKET + '/' + path

    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': 'Bearer ' + SUPABASE_ANON,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=432000',
      },
      body: bytes,
    })

    if (!resp.ok) {
      const err = await resp.text()
      return NextResponse.json({ error: 'Storage error ' + resp.status + ': ' + err }, { status: 500 })
    }

    const publicUrl = SUPABASE_URL + '/storage/v1/object/public/' + BUCKET + '/' + path

    // Disparar agente calidad-fotos en background para TODAS las fotos
    // excepto las marcadas explícitamente como referencia
    const esReferencia = EXCLUIR_ANALISIS.some(ex => item_id.toLowerCase().includes(ex))

    if (!esReferencia && process.env.NVIDIA_API_KEY) {
      // Obtener empresa_id y propiedad de la sesión
      const sesionData = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT empresa_id, propiedad_id, property_name
        FROM cleaning_sessions
        WHERE id = ${session_id}::uuid
        LIMIT 1
      `)

      if (sesionData.length > 0) {
        const { empresa_id, propiedad_id, property_name } = sesionData[0]
        // Fire-and-forget — no bloquea respuesta a la limpiadora
        fetch(APP_URL + '/api/admin/ia/analizar-foto', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ foto_url: publicUrl, session_id, empresa_id, propiedad_id, property_name })
        }).catch(() => {})
      }
    }

    return NextResponse.json({ url: publicUrl, size_kb: Math.round(bytes.byteLength / 1024) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
