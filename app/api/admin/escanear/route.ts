import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaId, requireSession } from '@/lib/tenant'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!

// Mapa PGC simplificado para categorías de gasto habituales en limpieza
const PGC_MAP: Record<string, { cuenta: string; nombre: string }> = {
  limpieza:      { cuenta: '623000', nombre: 'Material de limpieza' },
  lenceria:      { cuenta: '621000', nombre: 'Lencería y textiles' },
  consumible:    { cuenta: '623000', nombre: 'Material fungible' },
  amenities:     { cuenta: '623000', nombre: 'Artículos de acogida' },
  herramienta:   { cuenta: '622000', nombre: 'Reparaciones y conservación' },
  mantenimiento: { cuenta: '622000', nombre: 'Reparaciones y conservación' },
  otros:         { cuenta: '629000', nombre: 'Otros servicios' },
}

interface LineaDoc {
  descripcion: string
  cantidad: number
  unidad: string
  precio_unitario: number | null
  total_linea: number | null
  producto_id: string | null   // mapeado por IA contra catálogo
  categoria: string
}

interface ExtraIda {
  tipo_doc: 'factura' | 'albaran' | 'ticket' | 'otro'
  proveedor: string | null
  fecha: string | null
  numero_doc: string | null
  lineas: LineaDoc[]
  base_imponible: number | null
  porcentaje_iva: number | null
  cuota_iva: number | null
  total: number | null
  descripcion_corta: string
  notas: string | null
  confianza: 'alta' | 'media' | 'baja'
}

async function analizarDocumento(
  base64: string,
  mediaType: string,
  productosStock: any[]
): Promise<ExtraIda> {
  const catalogoStr = productosStock.length
    ? productosStock.map(p =>
        `- id:"${p.id}" nombre:"${p.nombre}" cat:"${p.categoria}" unidad:"${p.unidad}"`
      ).join('\n')
    : '(sin productos en catálogo aún)'

  const prompt = `Eres un contable especializado en empresas de limpieza profesional en España.
Analiza este documento (factura, albarán, ticket de compra o similar).

CATÁLOGO DE PRODUCTOS EN STOCK DE LA EMPRESA:
${catalogoStr}

Extrae TODOS los datos y devuelve ÚNICAMENTE un JSON válido, sin markdown, sin texto extra:
{
  "tipo_doc": "factura|albaran|ticket|otro",
  "proveedor": "nombre del proveedor o null",
  "fecha": "YYYY-MM-DD o null",
  "numero_doc": "número o null",
  "lineas": [
    {
      "descripcion": "descripción del artículo",
      "cantidad": número,
      "unidad": "unidad|kg|litro|rollo|pack|caja",
      "precio_unitario": número o null,
      "total_linea": número o null,
      "producto_id": "UUID del producto del catálogo si coincide, o null",
      "categoria": "limpieza|lenceria|consumible|amenities|herramienta|mantenimiento|otros"
    }
  ],
  "base_imponible": número o null,
  "porcentaje_iva": número o null,
  "cuota_iva": número o null,
  "total": número o null,
  "descripcion_corta": "resumen en máx 60 chars",
  "notas": "observaciones importantes o null",
  "confianza": "alta|media|baja"
}

Reglas:
- Para producto_id: busca coincidencia por nombre/descripción en el catálogo. Si hay duda razonable, mapea. Si no hay catálogo o no coincide, pon null.
- Si el documento es un ticket sin líneas claras, crea una sola línea con el total.
- Usa IVA 21% si no se especifica y el total parece incluirlo.
- base_imponible + cuota_iva = total (verifica).`

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + NVIDIA_API_KEY,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
          { type: 'text', text: prompt },
        ],
      }],
      temperature: 0.1,
      max_tokens: 1200,
    }),
  })

  if (!res.ok) throw new Error('Error NVIDIA NIM visión: ' + res.status)
  const data = await res.json()
  const content = (data.choices?.[0]?.message?.content || '{}')
    .replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(content) as ExtraIda
  } catch {
    return {
      tipo_doc: 'otro', proveedor: null, fecha: null, numero_doc: null,
      lineas: [], base_imponible: null, porcentaje_iva: null, cuota_iva: null,
      total: null, descripcion_corta: 'Documento no procesado', notas: 'Error al parsear IA',
      confianza: 'baja',
    }
  }
}

function generarApuntePGC(ext: ExtraIda): any[] {
  if (!ext.total) return []

  // Categoría dominante de las líneas
  const cats = ext.lineas.map(l => l.categoria)
  const catDom = cats.length
    ? cats.sort((a, b) => cats.filter(c => c === b).length - cats.filter(c => c === a).length)[0]
    : 'otros'
  const pgc = PGC_MAP[catDom] || PGC_MAP['otros']

  const base = ext.base_imponible ?? ext.total
  const iva  = ext.cuota_iva ?? 0
  const total = ext.total

  const apunte = [
    { cuenta: pgc.cuenta,  nombre: pgc.nombre,                         debe: base.toFixed(2),  haber: '' },
    ...(iva > 0 ? [{ cuenta: '472000', nombre: 'H.P. IVA soportado', debe: iva.toFixed(2),  haber: '' }] : []),
    { cuenta: '410000',    nombre: 'Acreedores por prestación servicios', debe: '', haber: total.toFixed(2) },
  ]
  return apunte
}

// POST /api/admin/escanear
// Body: { imagen_base64, media_type, cliente_id?, propiedad_id?, actualizar_stock? }
export async function POST(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    const session    = await requireSession()
    const body       = await req.json()
    const { imagen_base64, media_type, cliente_id, propiedad_id, actualizar_stock = true } = body

    if (!imagen_base64) return NextResponse.json({ error: 'imagen_base64 requerida' }, { status: 400 })
    if (!NVIDIA_API_KEY) return NextResponse.json({ error: 'NVIDIA_API_KEY no configurada' }, { status: 500 })

    // Cargar catálogo de productos de la empresa para el prompt
    const productosStock = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre, categoria, unidad, stock_actual
      FROM productos_stock
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true
      ORDER BY categoria, nombre
    `)

    // Análisis IA
    const ext = await analizarDocumento(imagen_base64, media_type || 'image/jpeg', productosStock)
    const apunte = generarApuntePGC(ext)

    // Guardar en documentos_contables
    const docRows = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO documentos_contables (
        empresa_id, cliente_id, propiedad_id,
        tipo_doc, proveedor, fecha_doc, numero_doc,
        base_imponible, porcentaje_iva, cuota_iva, total,
        cuenta_gasto, categoria, descripcion, notas,
        apunte_json, lineas_json, procesado_stock
      ) VALUES (
        ${empresa_id}::uuid,
        ${cliente_id || empresa_id}::uuid,
        ${propiedad_id || null}::uuid,
        ${ext.tipo_doc},
        ${ext.proveedor || null},
        ${ext.fecha || null}::date,
        ${ext.numero_doc || null},
        ${ext.base_imponible || null},
        ${ext.porcentaje_iva || null},
        ${ext.cuota_iva || null},
        ${ext.total || null},
        ${apunte[0]?.cuenta || '629000'},
        ${ext.lineas[0]?.categoria || 'otros'},
        ${ext.descripcion_corta},
        ${ext.notas || null},
        ${JSON.stringify(apunte)}::jsonb,
        ${JSON.stringify(ext.lineas)}::jsonb,
        false
      )
      RETURNING id
    `)
    const doc_id = docRows[0]?.id

    // Actualizar stock si hay líneas mapeadas y actualizar_stock=true
    let stock_actualizado = 0
    if (actualizar_stock && ext.lineas.length > 0) {
      for (const linea of ext.lineas) {
        if (!linea.producto_id || !linea.cantidad || linea.cantidad <= 0) continue
        // Verificar que el producto pertenece a esta empresa
        const check = await prisma.$queryRaw<any[]>(Prisma.sql`
          SELECT id FROM productos_stock
          WHERE id = ${linea.producto_id}::uuid
            AND empresa_id = ${empresa_id}::uuid
            AND activo = true
          LIMIT 1
        `)
        if (!check.length) continue

        await prisma.$executeRaw(Prisma.sql`
          UPDATE productos_stock
          SET stock_actual = stock_actual + ${linea.cantidad}
          WHERE id = ${linea.producto_id}::uuid
            AND empresa_id = ${empresa_id}::uuid
        `)
        stock_actualizado++
      }

      if (stock_actualizado > 0 && doc_id) {
        await prisma.$executeRaw(Prisma.sql`
          UPDATE documentos_contables
          SET procesado_stock = true
          WHERE id = ${doc_id}::uuid
        `)
      }
    }

    return NextResponse.json({
      ok: true,
      doc_id,
      tipo_doc:   ext.tipo_doc,
      proveedor:  ext.proveedor,
      total:      ext.total,
      datos_ia:   ext,
      apunte,
      stock_actualizado,
      confianza:  ext.confianza,
    })

  } catch (e: any) {
    console.error('[escanear] Error:', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

// GET /api/admin/escanear?limit=20&offset=0
// Lista documentos escaneados de la empresa
export async function GET(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    const { searchParams } = new URL(req.url)
    const limit  = Math.min(parseInt(searchParams.get('limit')  || '20'), 50)
    const offset = parseInt(searchParams.get('offset') || '0')

    const docs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, tipo_doc, proveedor, fecha_doc, numero_doc,
             base_imponible, porcentaje_iva, cuota_iva, total,
             cuenta_gasto, categoria, descripcion, notas,
             procesado_stock, lineas_json, apunte_json, created_at
      FROM documentos_contables
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)

    const total_count = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT COUNT(*)::int as n FROM documentos_contables
      WHERE empresa_id = ${empresa_id}::uuid AND activo = true
    `)

    return NextResponse.json({ docs, total: total_count[0]?.n || 0 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
