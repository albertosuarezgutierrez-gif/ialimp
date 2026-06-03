// Recolector de leads desde Google Places API (New).
// Busca empresas por texto+zona y devuelve nombre, teléfono, web y dirección.
// Places NO da email → si la empresa tiene web, intentamos extraerlo (best-effort).
// Requiere GOOGLE_PLACES_API_KEY (clave de Google Cloud con facturación + "Places API (New)").

export interface LeadGoogle {
  place_id: string
  nombre: string
  telefono: string | null
  web: string | null
  direccion: string | null
  email: string | null
}

const PLACES_URL = 'https://places.googleapis.com/v1/places:searchText'

// Búsqueda de texto en Places (New). Devuelve hasta `max` resultados (paginando).
export async function buscarEmpresasGoogle(opts: {
  query: string
  max?: number
}): Promise<{ leads: LeadGoogle[]; error?: string }> {
  const key = process.env.GOOGLE_PLACES_API_KEY
  if (!key) return { leads: [], error: 'Falta GOOGLE_PLACES_API_KEY' }
  const max = Math.min(Math.max(opts.max || 20, 1), 60)

  const leads: LeadGoogle[] = []
  let pageToken: string | undefined
  try {
    while (leads.length < max) {
      const body: any = { textQuery: opts.query, languageCode: 'es', regionCode: 'ES' }
      if (pageToken) body.pageToken = pageToken
      const res = await fetch(PLACES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': key,
          // Campos que pedimos (el FieldMask es obligatorio en Places New).
          'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,nextPageToken',
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        return { leads, error: `Places API ${res.status}: ${txt.slice(0, 200)}` }
      }
      const data = await res.json()
      for (const p of (data.places || [])) {
        leads.push({
          place_id: p.id,
          nombre: p.displayName?.text || p.displayName || 'Empresa',
          telefono: p.nationalPhoneNumber || p.internationalPhoneNumber || null,
          web: p.websiteUri || null,
          direccion: p.formattedAddress || null,
          email: null,
        })
        if (leads.length >= max) break
      }
      pageToken = data.nextPageToken
      if (!pageToken) break
      // Places exige una pequeña espera antes de usar el nextPageToken.
      await new Promise(r => setTimeout(r, 1500))
    }
    return { leads }
  } catch (e: any) {
    return { leads, error: String(e?.message || e).slice(0, 200) }
  }
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const EMAIL_BASURA = /\.(png|jpg|jpeg|gif|webp|svg)$/i

// Intenta extraer un email de contacto de la web (home + /contacto). Best-effort.
export async function extraerEmailDeWeb(web: string): Promise<string | null> {
  const candidatas: string[] = []
  try {
    const u = new URL(web)
    candidatas.push(u.origin, u.origin + '/contacto', u.origin + '/contact', u.origin + '/contacto/')
  } catch {
    return null
  }
  for (const url of candidatas.slice(0, 3)) {
    try {
      const ctrl = new AbortController()
      const t = setTimeout(() => ctrl.abort(), 5000)
      const res = await fetch(url, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; IALIMP-bot/1.0)' } })
      clearTimeout(t)
      if (!res.ok) continue
      const html = (await res.text()).slice(0, 500_000)
      const found = (html.match(EMAIL_RE) || [])
        .map(e => e.toLowerCase())
        .filter(e => !EMAIL_BASURA.test(e) && !e.includes('@sentry') && !e.includes('example.'))
      if (found.length) {
        // Preferir un email del mismo dominio que la web.
        const dom = new URL(web).hostname.replace(/^www\./, '')
        return found.find(e => e.endsWith('@' + dom) || e.endsWith('.' + dom)) || found[0]
      }
    } catch { /* siguiente candidata */ }
  }
  return null
}
