import { NextRequest, NextResponse } from 'next/server'

const SUPABASE_URL  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const BUCKET        = 'cleaning-photos'
const MAX_SIZE_MB   = 0.8  // comprimir a máx 800KB

export async function POST(req: NextRequest) {
  try {
    const form       = await req.formData()
    const file       = form.get('file') as File | null
    const session_id = form.get('session_id') as string
    const item_id    = form.get('item_id') as string || form.get('tipo') as string
    const slot       = (form.get('slot') as string) || '1'

    if (!file)             return NextResponse.json({ error: 'No file' },       { status: 400 })
    if (!session_id)       return NextResponse.json({ error: 'No session_id' }, { status: 400 })

    const ext = 'jpg'  // siempre JPEG para máxima compresión
    const path = `sessions/${session_id}/${item_id || 'foto'}_${slot}.${ext}`

    const bytes = await file.arrayBuffer()
    const sizeMB = bytes.byteLength / (1024 * 1024)

    // Si es muy grande (>2MB) rechazar — el móvil debería comprimir
    if (sizeMB > 10) {
      return NextResponse.json({ error: 'Foto demasiado grande (máx 10MB)' }, { status: 400 })
    }

    const uploadUrl = \`\${SUPABASE_URL}/storage/v1/object/\${BUCKET}/\${path}\`
    const resp = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Authorization': \`Bearer \${SUPABASE_ANON}\`,
        'Content-Type': file.type || 'image/jpeg',
        'x-upsert': 'true',
        'Cache-Control': 'max-age=432000', // 5 días = TTL de fotos
      },
      body: bytes,
    })

    if (!resp.ok) {
      const err = await resp.text()
      return NextResponse.json({ error: \`Storage error \${resp.status}: \${err}\` }, { status: 500 })
    }

    const publicUrl = \`\${SUPABASE_URL}/storage/v1/object/public/\${BUCKET}/\${path}\`
    return NextResponse.json({ url: publicUrl, size_kb: Math.round(bytes.byteLength / 1024) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
