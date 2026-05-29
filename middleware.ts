import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth'

const PUBLIC_PATHS = [
  '/login', '/register', '/registro', '/cotizador', '/manual',
  '/api/auth', '/api/pms/sync', '/api/empresas/register',
  '/api/leads', '/api/propietario', '/propietario',
]

const SUPERADMIN_PATHS = ['/superadmin', '/api/superadmin']

// Módulos que protege cada ruta del panel admin
const MODULO_MAP: Record<string, string> = {
  '/admin/clientes':    'clientes',
  '/admin/rrhh':        'rrhh',
  '/admin/lenceria':    'lenceria',
  '/admin/stock':       'stock',
  '/admin/facturas':    'facturacion',
  '/admin/informes':    'informes',
  '/admin/agenda':      'agenda',
  '/admin/crm':         'clientes',
  '/admin/planes':      'configuracion',
  '/admin/usuarios':    'configuracion',
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas — sin auth
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rutas limpiadora — auth por PIN/cookie propia
  if (pathname.startsWith('/l/') || pathname.startsWith('/api/l/')) {
    return NextResponse.next()
  }

  const token = req.cookies.get('ialimp_session')?.value
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifySessionToken(token) as any
  if (!payload) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Rutas superadmin — solo para superadmin
  if (SUPERADMIN_PATHS.some(p => pathname.startsWith(p))) {
    if (payload.rol !== 'superadmin') {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  // Superadmin puede acceder a todo
  if (payload.rol === 'superadmin') return NextResponse.next()

  // Owner puede acceder a todo de su empresa
  if (payload.rol === 'owner') return NextResponse.next()

  // Usuarios empresa — verificar módulo
  const moduloRequerido = Object.entries(MODULO_MAP).find(([path]) =>
    pathname.startsWith(path)
  )?.[1]

  if (moduloRequerido) {
    const modulos: string[] = payload.modulos || []
    if (!modulos.includes(moduloRequerido)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'Sin permiso para este módulo' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
