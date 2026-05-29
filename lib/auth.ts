import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcryptjs'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'ialimp-dev-secret-change-in-prod'
)

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── Empresa dueña (cuenta master) ────────────────────────────────────
export async function createSessionToken(empresa_id: string, email: string): Promise<string> {
  return new SignJWT({ empresa_id, email, rol: 'owner' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

// ── Usuario empresa (creado por la dueña) ────────────────────────────
export async function createUsuarioToken(
  usuario_id: string, empresa_id: string, email: string,
  rol: string, modulos: string[]
): Promise<string> {
  return new SignJWT({ usuario_id, empresa_id, email, rol, modulos, type: 'usuario' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

// ── Superadmin ───────────────────────────────────────────────────────
export async function createSuperadminToken(id: string, email: string): Promise<string> {
  return new SignJWT({ superadmin_id: id, email, rol: 'superadmin', type: 'superadmin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(JWT_SECRET)
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}
