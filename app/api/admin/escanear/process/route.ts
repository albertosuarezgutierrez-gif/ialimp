import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!

const PGC_MAP: Record<string, { cuenta: string; nombre: string }> = {
  limpieza:      { cuenta: '623000', nombre: 'Material de limpieza' },
  lenceria:      { cuenta: '621000', nombre: 'Lencería y textiles' },
  consumible:    { cuenta: '623000', nombre: 'Material fungible' },
  amenities:     { cuenta: '623000', nombre: 'Artículos de acogida' },
  herramienta:   { cuenta: '622000', nombre: 'Reparaciones y conservación' },
  mantenimiento: { cuenta: '622000', nombre: 'Reparaciones y conservación' },
  otros:         { cuenta: '629000', nombre: 'Otros servicios' },
}

async function analizarDocumento(base64: string, mediaType: string, productosStock: any[]) {
  const catalogoStr = productosStock.length
    ? productosStock.map(p => `- id:"${p.id}" nombre:"${p.nombre}" cat:"${p.categoria}" unidad:"${p.unidad}"`).join('\n')
    : '(sin productos en catálogo)'

  const prompt = `You are a Spanish accounting assistant. Analyze this invoice/receipt/delivery note image.
Return ONLY a valid JSON object, no markdown, no explanations:
{
  "tipo_doc": "factura|albaran|ticket|otro",
  "proveedor": "supplier name or null",
  "fecha": "YYYY-MM-DD or null",
  "numero_doc": "document number or null",
  "lineas": [{"descripcion":"item","cantidad":1,"unidad":"unidad","precio_unitario":0.0,"total_linea":0.0,"producto_id":null,"categoria":"limpieza|consumible|lenceria|amenities|herramienta|mantenimiento|otros"}],
  "base_imponible": 0.0,
  "porcentaje_iva": 21,
  "cuota_iva": 0.0,
  "total": 0.0,
  "descripcion_corta": "summary max 60 chars",
  "notas": null,
  "nivel_certeza": "alto|medio|bajo"
}

Stock catalog:
${catalogoStr}

Map producto_id if item name matches catalog. Use 21% VAT if not specified.`

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + NVIDIA_API_KEY },
    body: JSON.stringify({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: 'text', text: prompt },
      ]}],
      temperature: 0.05,
      max_tokens: 800,
    }),
  })

  if (!res.ok) throw new Error('NVIDIA error: ' + res.status)
  const data = await res.json()
  const content = (data.choices?.[0]?.message?.content || '{}').replace(/```json|```/g, '').trim()
  try {
    const parsed = JSON.parse(content) as any
    if (parsed.nivel_certeza && !parsed.confianza) {
      parsed.confianza = parsed.nivel_certeza === 'alto' ? 'alta' : parsed.nivel_certeza === 'medio' ? 'media' : 'baja'
    }
    parsed.confianza = parsed.confianza || 'media'
    return parsed
  } catch {
    return { tipo_doc:'otro', proveedor:null, fecha:null, numero_doc:null, lineas:[],
      base_imponible:null, porcentaje_iva:null, cuota_iva:null, total:null,
      descripcion_corta:'Error al procesar', notas:null, confianza:'baja' }
  }
}

function generarApunte(ext: any) {
  if (!ext.total) return []
  const cats = (ext.lineas || []).map((l: any) => l.categoria)
  const catDom = cats.length
    ? cats.sort((a: string, b: string) => cats.filter((c: string) => c===b).length - cats.filter((c: string) => c===a).length)[0]
    : 'otros'
  const pgc = PGC_MAP[catDom] || PGC_MAP['otros']
  const base = ext.base_imponible ?? ext.total
  const iva  = ext.cuota_iva ?? 0
  return [
    { cuenta: pgc.cuenta, nombre: pgc.nombre, debe: base.toFixed(2), haber: '' },
    ...(iva > 0 ? [{ cuenta: '472000', nombre: 'H.P. IVA soportado', debe: iva.toFixed(2), haber: '' }] : []),
    { cuenta: '410000', nombre: 'Acreedores por prestación servicios', debe: '', haber: ext.total.toFixed(2) },
  ]
}

// POST /api/admin/escanear/process
// Called internally (fire-and-forget) — processes the image and updates the doc
export async function POST(req: NextRequest) {
  try {
    const { doc_id, empresa_id, imagen_base64, media_type } = await req.json()
    if (!doc_id || !empresa_id || !imagen_base64) return NextResponse.json({ error: 'params missing' }, { status: 400 })

    const productosStock = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre, categoria, unidad FROM productos_stock
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true ORDER BY categoria, nombre
    `)

    const ext = await analizarDocumento(imagen_base64, media_type, productosStock)
    const apunte = generarApunte(ext)

    // Update the pending doc with results
    await prisma.$executeRaw(Prisma.sql`
      UPDATE documentos_contables SET
        tipo_doc        = ${ext.tipo_doc},
        proveedor       = ${ext.proveedor || null},
        fecha_doc       = ${ext.fecha || null}::date,
        numero_doc      = ${ext.numero_doc || null},
        base_imponible  = ${ext.base_imponible || null},
        porcentaje_iva  = ${ext.porcentaje_iva || null},
        cuota_iva       = ${ext.cuota_iva || null},
        total           = ${ext.total || null},
        cuenta_gasto    = ${apunte[0]?.cuenta || '629000'},
        categoria       = ${ext.lineas?.[0]?.categoria || 'otros'},
        descripcion     = ${ext.descripcion_corta},
        notas           = ${ext.notas || null},
        apunte_json     = ${JSON.stringify(apunte)}::jsonb,
        lineas_json     = ${JSON.stringify(ext.lineas || [])}::jsonb
      WHERE id = ${doc_id}::uuid
    `)

    // Update stock for matched products
    let stock_actualizado = 0
    for (const linea of (ext.lineas || [])) {
      if (!linea.producto_id || !linea.cantidad || linea.cantidad <= 0) continue
      const check = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id FROM productos_stock
        WHERE id = ${linea.producto_id}::uuid AND empresa_id = ${empresa_id}::uuid AND activo = true LIMIT 1
      `)
      if (!check.length) continue
      await prisma.$executeRaw(Prisma.sql`
        UPDATE productos_stock SET stock_actual = stock_actual + ${linea.cantidad}
        WHERE id = ${linea.producto_id}::uuid AND empresa_id = ${empresa_id}::uuid
      `)
      stock_actualizado++
    }

    if (stock_actualizado > 0) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE documentos_contables SET procesado_stock = true WHERE id = ${doc_id}::uuid
      `)
    }

    return NextResponse.json({ ok: true, stock_actualizado })
  } catch (e: any) {
    console.error('[escanear/process]', e)
    // Mark doc as failed
    try {
      const { doc_id } = await req.json().catch(() => ({})) as any
      if (doc_id) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE documentos_contables SET tipo_doc='error', descripcion='Error al procesar con IA'
          WHERE id = ${doc_id}::uuid
        `)
      }
    } catch {}
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
