// app/api/propietario/[token]/escanear/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

const CATS: Record<string, { cuenta: string; iva: number }> = {
  limpieza:      { cuenta: '623000', iva: 21 },
  suministros:   { cuenta: '628000', iva: 21 },
  mantenimiento: { cuenta: '622000', iva: 21 },
  lenceria:      { cuenta: '602000', iva: 10 },
  alimentacion:  { cuenta: '601000', iva: 10 },
  otros:         { cuenta: '629000', iva: 21 },
}

async function getCliente(token: string) {
  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.id::text, c.empresa_id::text, c.nombre
    FROM clientes c
    WHERE c.access_token = ${token} AND c.notif_activa = true
    LIMIT 1
  `)
  return rows[0] || null
}

// Llama a NVIDIA NIM llama-3.2-90b-vision-instruct con imagen base64
async function nimVision(imageBase64: string, mediaType: string, prompt: string): Promise<string> {
  const apiKey = process.env.NVIDIA_API_KEY
  if (!apiKey) throw new Error('NVIDIA_API_KEY no configurada')

  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey,
    },
    body: JSON.stringify({
      model: 'meta/llama-3.2-90b-vision-instruct',
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image_url',
            image_url: { url: `data:${mediaType};base64,${imageBase64}` },
          },
          { type: 'text', text: prompt },
        ],
      }],
      temperature: 0.1,
      max_tokens: 1024,
    }),
  })

  if (!res.ok) throw new Error('Error NIM vision: ' + res.status)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || ''
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const cliente = await getCliente(token)
    if (!cliente) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

    const { imagen_base64, media_type = 'image/jpeg', propiedad_id } = await req.json()
    if (!imagen_base64) return NextResponse.json({ error: 'imagen_base64 requerida' }, { status: 400 })

    // ── 1. NVIDIA NIM Vision ──────────────────────────────────
    const rawText = await nimVision(
      imagen_base64,
      media_type,
      `Eres contable experto español. Lee esta imagen y devuelve SOLO JSON válido sin texto extra ni backticks:
{
  "tipo_doc": "factura|albaran|ticket|otro",
  "proveedor": "nombre",
  "fecha": "YYYY-MM-DD",
  "numero_doc": "número o null",
  "base_imponible": número o null,
  "porcentaje_iva": 4|10|21 o null,
  "cuota_iva": número o null,
  "total": número,
  "categoria": "limpieza|suministros|mantenimiento|lenceria|alimentacion|otros",
  "descripcion_corta": "máx 5 palabras",
  "lineas": [{"descripcion":"","cantidad":1,"unidad":"ud","precio_unitario":0,"subtotal":0,"es_stock":false,"categoria_stock":null}],
  "notas": ""
}
es_stock=true solo para artículos físicos. null si ilegible.`
    )

    let doc: any
    try {
      doc = JSON.parse(rawText.replace(/```json|```/g, '').trim())
    } catch {
      return NextResponse.json({ error: 'NIM no pudo leer el documento' }, { status: 422 })
    }

    // ── 2. Apunte PGC ─────────────────────────────────────────
    const cat   = CATS[doc.categoria] || CATS.otros
    const base  = Number(doc.base_imponible ?? doc.total ?? 0)
    const iva   = Number(doc.cuota_iva ?? 0)
    const total = Number(doc.total ?? base + iva)
    const apunte = [
      { cuenta: cat.cuenta, nombre: `Gasto ${doc.categoria}`,                         debe: base.toFixed(2),  haber: null },
      { cuenta: '472000',   nombre: `IVA soportado ${doc.porcentaje_iva ?? cat.iva}%`, debe: iva.toFixed(2),   haber: null },
      { cuenta: '410000',   nombre: 'Acreedores por servicios',                        debe: null,             haber: total.toFixed(2) },
    ]

    // ── 3. Guardar en documentos_contables ────────────────────
    const inserted = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO documentos_contables (
        empresa_id, cliente_id, propiedad_id,
        tipo_doc, proveedor, fecha_doc, numero_doc,
        base_imponible, porcentaje_iva, cuota_iva, total,
        cuenta_gasto, categoria, descripcion, notas,
        apunte_json, lineas_json, procesado_stock
      ) VALUES (
        ${cliente.empresa_id}::uuid,
        ${cliente.id}::uuid,
        ${propiedad_id || null}::uuid,
        ${doc.tipo_doc || 'otro'},
        ${doc.proveedor || null},
        ${doc.fecha || null}::date,
        ${doc.numero_doc || null},
        ${base || null},
        ${doc.porcentaje_iva || null},
        ${iva || null},
        ${total},
        ${cat.cuenta},
        ${doc.categoria || 'otros'},
        ${doc.descripcion_corta || null},
        ${doc.notas || null},
        ${JSON.stringify(apunte)}::jsonb,
        ${JSON.stringify(doc.lineas || [])}::jsonb,
        false
      )
      RETURNING id::text
    `)
    const doc_id = inserted[0]?.id

    // ── 4. Actualizar stock ───────────────────────────────────
    const lineasStock = (doc.lineas || []).filter((l: any) => l.es_stock && l.descripcion)
    let stockActualizado = 0

    for (const linea of lineasStock) {
      const existing = await prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT id::text, stock_actual
        FROM productos_stock
        WHERE empresa_id = ${cliente.empresa_id}::uuid
          AND LOWER(nombre) ILIKE ${`%${linea.descripcion.toLowerCase().split(' ')[0]}%`}
          AND activo = true
        LIMIT 1
      `)

      if (existing.length > 0) {
        const nuevo = Number(existing[0].stock_actual) + Number(linea.cantidad || 1)
        await prisma.$executeRaw(Prisma.sql`
          UPDATE productos_stock
          SET stock_actual = ${nuevo}, updated_at = now()
          WHERE id = ${existing[0].id}::uuid
        `)
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO stock_consumos (empresa_id, producto_id, cantidad, coste_total, notas)
          VALUES (
            ${cliente.empresa_id}::uuid, ${existing[0].id}::uuid,
            ${Number(linea.cantidad || 1)}, ${Number(linea.subtotal || 0)},
            ${'Entrada doc ' + doc_id}
          )
        `)
      } else {
        await prisma.$executeRaw(Prisma.sql`
          INSERT INTO productos_stock (empresa_id, nombre, categoria, unidad, stock_actual, stock_minimo, precio_unitario)
          VALUES (
            ${cliente.empresa_id}::uuid, ${linea.descripcion},
            ${linea.categoria_stock || 'limpieza'}, ${linea.unidad || 'unidad'},
            ${Number(linea.cantidad || 1)}, 0,
            ${linea.precio_unitario ? Number(linea.precio_unitario) : null}
          )
        `)
      }
      stockActualizado++
    }

    if (stockActualizado > 0) {
      await prisma.$executeRaw(Prisma.sql`
        UPDATE documentos_contables SET procesado_stock = true WHERE id = ${doc_id}::uuid
      `)
    }

    return NextResponse.json({
      ok: true, doc_id,
      tipo_doc: doc.tipo_doc,
      proveedor: doc.proveedor,
      total, cuenta_gasto: cat.cuenta,
      apunte, stock_actualizado: stockActualizado,
      lineas: doc.lineas || [],
      datos_ia: doc,
    })
  } catch (e: any) {
    console.error('[escanear]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
