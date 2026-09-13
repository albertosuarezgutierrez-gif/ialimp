import { createHash, createHmac, randomUUID } from 'node:crypto'

// Firma HMAC-SHA256 de la API de Smoobu (esquema vigente; el legacy header `Api-Key`
// en plano lo está retirando Smoobu — sunset 25/09/2026, y algunas cuentas ya reciben
// 401 con él). Copia deliberada del módulo puro `apps/plataforma/lib/smoobu-firma.ts`
// del monorepo `central` — mismo esquema, mismas credenciales (`pms_connections`
// compartida), para que las dos integraciones dejen de depender de un esquema caduco.
//
// CANONICAL = METHOD \n PATH \n QUERY \n TIMESTAMP \n NONCE \n BODY_HASH \n API_KEY
//   · METHOD    en mayúsculas
//   · PATH      solo el pathname, sin dominio ni query
//   · QUERY     parámetros ORDENADOS alfabéticamente por clave, `k=v&k2=v2`; vacío si no hay
//   · BODY_HASH SHA-256 en HEXADECIMAL del cuerpo exacto que se envía
//   · API_KEY   el propio api key, literal (no hasheado)
// SIGNATURE = Base64( HMAC-SHA256( key = API_SECRET, message = CANONICAL ) )

export const HASH_CUERPO_VACIO =
  'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'

export function hashCuerpo(body?: string | null): string {
  if (!body) return HASH_CUERPO_VACIO
  return createHash('sha256').update(body, 'utf8').digest('hex')
}

export function queryCanonica(params: URLSearchParams | string): string {
  const sp = typeof params === 'string' ? new URLSearchParams(params) : params
  const pares: [string, string][] = []
  sp.forEach((valor, clave) => { pares.push([clave, valor]) })
  pares.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
  return pares.map(([k, v]) => `${k}=${v}`).join('&')
}

export type PartesCanonical = {
  method: string
  path: string
  query: string
  timestamp: string
  nonce: string
  bodyHash: string
  apiKey: string
}

export function construirCanonical(p: PartesCanonical): string {
  return [p.method.toUpperCase(), p.path, p.query, p.timestamp, p.nonce, p.bodyHash, p.apiKey].join('\n')
}

export function firmarCanonical(canonical: string, apiSecret: string): string {
  return createHmac('sha256', apiSecret).update(canonical, 'utf8').digest('base64')
}

export function selloTiempo(ahora: Date = new Date()): string {
  return ahora.toISOString().replace(/\.\d{3}Z$/, 'Z')
}

export type PeticionFirmable = {
  method: string
  url: string
  body?: string | null
  apiKey: string
  apiSecret: string
  timestamp?: string
  nonce?: string
}

export function firmarPeticion(p: PeticionFirmable): { headers: Record<string, string>; canonical: string } {
  const u = new URL(p.url, 'https://login.smoobu.com')
  const timestamp = p.timestamp ?? selloTiempo()
  const nonce = p.nonce ?? randomUUID()
  const canonical = construirCanonical({
    method: p.method,
    path: u.pathname,
    query: queryCanonica(u.searchParams),
    timestamp,
    nonce,
    bodyHash: hashCuerpo(p.body),
    apiKey: p.apiKey,
  })
  return {
    canonical,
    headers: {
      'X-API-Key': p.apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': firmarCanonical(canonical, p.apiSecret),
    },
  }
}
