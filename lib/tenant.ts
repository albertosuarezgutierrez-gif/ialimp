import { cookies } from 'next/headers'
import { jwtVerify } from 'jose'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ialimp-dev-secret-change-in-prod'
)

export async function getEmpresaId(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get('ialimp_session')?.value
    if (!token) return null
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return (payload.empresa_id as string) || null
  } catch {
    return null
  }
}

export async function requireEmpresaId(): Promise<string> {
  const id = await getEmpresaId()
  if (!id) throw new Error('No autenticado')
  return id
}
