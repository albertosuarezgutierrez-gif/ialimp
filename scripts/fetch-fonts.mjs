// Descarga las tipografías (woff2) a /public/fonts en el build, para servirlas
// AUTO-ALOJADAS y no cargar Google Fonts (no se transfiere la IP del visitante
// a terceros). Se ejecuta antes de `next build` (ver package.json).
//
//   - Nunito  → app (globals.css)
//   - DM Sans + Syne → manual público (public/manual.html)
//
// Es DELIBERADAMENTE no crítico: si la descarga falla (red, proveedor caído…),
// avisa y termina con éxito → el build no se rompe y se degrada a la fuente del
// sistema (los font-family llevan fallback). Nunca deja la web peor que antes.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const OUT = join(process.cwd(), 'public', 'fonts')
const timeout = (ms) => AbortSignal.timeout(ms)

// slug de google-webfonts-helper → pesos (normal) que queremos
const FONTS = [
  { slug: 'nunito',  weights: ['300', '400', '500', '600', '700', '800', '900'] },
  { slug: 'dm-sans', weights: ['400', '500', '600', '700', '800'] },
  { slug: 'syne',    weights: ['400', '700', '800'] },
]

async function fetchFamily({ slug, weights }) {
  let data
  try {
    const res = await fetch(`https://gwfh.mranftl.com/api/fonts/${slug}?subsets=latin`, { signal: timeout(15000) })
    if (!res.ok) throw new Error('HTTP ' + res.status)
    data = await res.json()
  } catch (e) {
    console.warn(`[fetch-fonts] ${slug}: no se pudo obtener el índice (${e.message}) — se omite.`)
    return 0
  }
  const variants = (data.variants || []).filter((v) => v.fontStyle === 'normal')
  let ok = 0
  for (const w of weights) {
    const url = variants.find((v) => String(v.fontWeight) === w)?.woff2
    if (!url) { console.warn(`[fetch-fonts] ${slug}: sin variante para el peso ${w}`); continue }
    try {
      const r = await fetch(url, { signal: timeout(15000) })
      if (!r.ok) throw new Error('HTTP ' + r.status)
      await writeFile(join(OUT, `${slug}-${w}.woff2`), Buffer.from(await r.arrayBuffer()))
      ok++
    } catch (e) {
      console.warn(`[fetch-fonts] ${slug}: fallo al descargar el peso ${w}: ${e.message}`)
    }
  }
  console.log(`[fetch-fonts] ${slug}: ${ok}/${weights.length} pesos en public/fonts`)
  return ok
}

async function main() {
  await mkdir(OUT, { recursive: true })
  for (const f of FONTS) await fetchFamily(f)
}

// Nunca propaga error (no rompe el build).
main().catch((e) => console.warn('[fetch-fonts] error no crítico:', e?.message))
