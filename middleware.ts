import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifySessionToken } from '@/lib/auth'

const PUBLIC_PATHS = ['/login', '/register', '/registro', '/api/auth', '/api/pms/sync', '/api/empresas/register', '/api/leads', '/api/propietario', '/propietario', '/cotizador', '/manual']

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  // Rutas públicas
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  // Rutas de limpiadora (auth por PIN, cookie propia)
  if (pathname.startsWith('/l/') || pathname.startsWith('/api/l/')) {
    return NextResponse.next()
  }

  // Rutas admin/dashboard — requieren sesión empresa
  const token = req.cookies.get('ialimp_session')?.value
  if (!token) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const payload = await verifySessionToken(token)
  if (!payload) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon-|manifest).*)']
}
