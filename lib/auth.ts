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

// ── Propietario (cliente facturable que accede a su portal) ──────────
// Cookie propia `ialimp_prop` (NO `ialimp_session`): así el middleware del
// panel admin nunca trata a un propietario como usuario interno.
export async function createPropietarioToken(
  cliente_id: string, empresa_id: string, email: string
): Promise<string> {
  return new SignJWT({ cliente_id, empresa_id, email, rol: 'propietario', type: 'propietario' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET)
}

// Política de contraseña: ≥8, mayúscula, minúscula, número y símbolo.
// Devuelve el mensaje de error o null si es válida.
export function validatePasswordStrength(pw: string): string | null {
  if (!pw || pw.length < 8) return 'La contraseña debe tener al menos 8 caracteres'
  if (!/[a-z]/.test(pw))     return 'Debe incluir una letra minúscula'
  if (!/[A-Z]/.test(pw))     return 'Debe incluir una letra mayúscula'
  if (!/[0-9]/.test(pw))     return 'Debe incluir un número'
  if (!/[^A-Za-z0-9]/.test(pw)) return 'Debe incluir un símbolo (p. ej. ! @ # . -)'
  return null
}

export async function verifySessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    return payload
  } catch {
    return null
  }
}
