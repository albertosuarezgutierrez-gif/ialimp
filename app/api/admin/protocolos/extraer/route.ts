import { NextRequest, NextResponse } from 'next/server'
import { requireEmpresaId } from '@/lib/tenant'
import { aiComplete } from '@/lib/ai-client'

// POST /api/admin/protocolos/extraer  — aiExtractProtocol()
// Ingiere una FICHA de limpieza (foto/escaneo de la ficha, o su texto pegado) y
// devuelve un BORRADOR estructurado de protocolo para revisar antes de guardar
// (no escribe en BD). Guardar = POST /api/admin/protocolos con el borrador.
// body: { imagen_base64?, media_type?, texto? }
export const maxDuration = 60

const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY!
const VISION_MODEL   = 'meta/llama-3.2-90b-vision-instruct'   // NIM: 1 imagen por llamada

const REGLAS = `Eres un asistente que convierte una FICHA DE LIMPIEZA de un piso turístico en un protocolo digital estructurado.
- Agrupa las tareas por ESTANCIA (Cocina, Baño, Dormitorio, Salón, Terraza, Entrada, Lavadero, General...).
- Cada tarea = un item con "descripcion" breve en imperativo ("Limpiar...", "Reponer...", "Revisar...").
- "requiere_foto": true SOLO si la ficha pide explícitamente foto/prueba de esa tarea, o es un punto crítico de control (estado final de una estancia, caja fuerte, inventario, electrodomésticos). Si no, false.
- En "notas" mete lo que NO es una tarea por estancia: acceso/llaves, wifi, suministros, normas de la casa, horarios, contactos.
- NO inventes tareas que no aparezcan en la ficha. Si la ficha es ilegible o ambigua, baja "nivel_certeza".`

const SCHEMA_HINT = `Devuelve SOLO un JSON válido, sin markdown ni explicaciones:
{
  "nombre": "Protocolo de <piso/estancia>",
  "estancias": [
    { "estancia": "Cocina", "items": [ { "descripcion": "Tarea concreta", "requiere_foto": false } ] }
  ],
  "notas": "instrucciones generales (texto) o null",
  "nivel_certeza": "alto|medio|bajo"
}`

async function extraerDeImagen(base64: string, mediaType: string): Promise<string> {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + NVIDIA_API_KEY },
    body: JSON.stringify({
      model: VISION_MODEL,
      messages: [{ role: 'user', content: [
        { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64}` } },
        { type: 'text', text: `${REGLAS}\n\n${SCHEMA_HINT}` },
      ]}],
      temperature: 0.1,
      max_tokens: 1500,
    }),
  })
  if (!res.ok) throw new Error('NVIDIA vision error: ' + res.status)
  const data = await res.json()
  return data.choices?.[0]?.message?.content || '{}'
}

async function extraerDeTexto(texto: string): Promise<string> {
  return aiComplete(`${REGLAS}\n\nFICHA (texto):\n"""\n${texto.slice(0, 6000)}\n"""\n\n${SCHEMA_HINT}`)
}

function parseJson(raw: string): any {
  const clean = (raw || '{}').replace(/```json|```/g, '').trim()
  const m = clean.match(/\{[\s\S]*\}/)   // primer bloque {...}
  try { return JSON.parse(m ? m[0] : clean) } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    await requireEmpresaId()  // guardia de empresa (la IA no toca datos, solo lee la ficha subida)
    const { imagen_base64, media_type, texto } = await req.json()
    if (!imagen_base64 && !texto) {
      return NextResponse.json({ error: 'Sube una foto de la ficha o pega su texto' }, { status: 400 })
    }

    const raw = imagen_base64
      ? await extraerDeImagen(imagen_base64, media_type || 'image/jpeg')
      : await extraerDeTexto(String(texto))

    const parsed = parseJson(raw)
    if (!parsed || !Array.isArray(parsed.estancias)) {
      return NextResponse.json({ borrador: null, error: 'No se pudo interpretar la ficha; revísala o pega el texto' })
    }

    // Normalizar / sanear (descartamos estancias sin items)
    const estancias = (parsed.estancias || []).map((e: any) => ({
      estancia: String(e?.estancia || 'General').slice(0, 60),
      items: (e?.items || [])
        .filter((i: any) => i && i.descripcion)
        .map((i: any) => ({
          descripcion: String(i.descripcion).slice(0, 300),
          requiere_foto: !!i.requiere_foto,
        })),
    })).filter((e: any) => e.items.length)

    const total_items = estancias.reduce((a: number, e: any) => a + e.items.length, 0)

    return NextResponse.json({
      borrador: {
        nombre: String(parsed.nombre || 'Protocolo').slice(0, 120),
        estancias,
        notas: parsed.notas ? String(parsed.notas).slice(0, 2000) : null,
      },
      total_items,
      nivel_certeza: parsed.nivel_certeza || 'medio',
    })
  } catch (e: any) {
    console.error('[protocolos/extraer]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
