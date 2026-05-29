import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ialimp-dev-secret-change-in-prod'
)

export interface SessionPayload {
  empresa_id?:   string
  usuario_id?:   string
  superadmin_id?: string
  email?:        string
  rol:           string         // owner | admin | supervisor | superadmin
  modulos?:      string[]
  type?:         string
}

export async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ialimp_session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

export async function getEmpresaId(): Promise<string | null> {
  const s = await getSession()
  return s?.empresa_id || null
}

export async function requireEmpresaId(): Promise<string> {
  const id = await getEmpresaId()
  if (!id) throw new Error('No autenticado')
  return id
}

export async function requireSession(): Promise<SessionPayload> {
  const s = await getSession()
  if (!s) throw new Error('No autenticado')
  return s
}

export async function isSuperadmin(): Promise<boolean> {
  const s = await getSession()
  return s?.rol === 'superadmin'
}

export async function isOwner(): Promise<boolean> {
  const s = await getSession()
  return s?.rol === 'owner'
}

// Comprueba si la sesión tiene acceso a un módulo concreto
// Owner siempre tiene acceso a todo
export async function hasModulo(modulo: string): Promise<boolean> {
  const s = await getSession()
  if (!s) return false
  if (s.rol === 'owner' || s.rol === 'superadmin') return true
  return (s.modulos || []).includes(modulo)
}
