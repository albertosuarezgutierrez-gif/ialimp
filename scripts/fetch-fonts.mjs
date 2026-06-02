// Descarga la tipografía Nunito (woff2) a /public/fonts en el build, para
// servirla AUTO-ALOJADA y no cargar Google Fonts (no se transfiere la IP del
// visitante a terceros). Se ejecuta antes de `next build` (ver package.json).
//
// Es DELIBERADAMENTE no crítico: si la descarga falla (red, proveedor caído…),
// avisa y termina con éxito → el build no se rompe y la app degrada a la fuente
// del sistema (el font-family lleva fallback). Nunca deja la app peor que antes.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public', 'fonts')
const WEIGHTS = ['300', '400', '500', '600', '700', '800', '900']
const API = 'https://gwfh.mranftl.com/api/fonts/nunito?subsets=latin'
const timeout = (ms) => AbortSignal.timeout(ms)

async function main() {
  await mkdir(OUT, { recursive: true })

  let data
  try {
    const res = await fetch(API, { signal: timeout(15000) })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    data = await res.json()
  } catch (e) {
    console.warn('[fetch-fonts] No se pudo obtener el índice de fuentes:', e.message,
      '— se omite (la app usará la fuente del sistema).')
    return
  }

  const variants = (data.variants || []).filter((v) => v.fontStyle === 'normal')
  let ok = 0
  for (const w of WEIGHTS) {
    const url = variants.find((v) => String(v.fontWeight) === w)?.woff2
    if (!url) { console.warn('[fetch-fonts] sin variante para el peso', w); continue }
    try {
      const r = await fetch(url, { signal: timeout(15000) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      await writeFile(join(OUT, `nunito-${w}.woff2`), Buffer.from(await r.arrayBuffer()))
      ok++
    } catch (e) {
      console.warn('[fetch-fonts] fallo al descargar el peso', w + ':', e.message)
    }
  }
  console.log(`[fetch-fonts] Nunito auto-alojada: ${ok}/${WEIGHTS.length} pesos en public/fonts`)
}

// Nunca propaga error (no rompe el build).
main().catch((e) => console.warn('[fetch-fonts] error no crítico:', e?.message))
