import type { Metadata, Viewport } from 'next'
import './globals.css'
import CookieBanner from '@/components/CookieBanner'

export const metadata: Metadata = {
  title: 'ialimp — Gestión de limpiezas',
  description: 'Software de coordinación de limpieza para empresas de apartamentos turísticos',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  // IALIMP es tema CLARO siempre: declara color-scheme light para que Android/
  // el navegador no aplique "forzar oscuro" e invierta la app (ver CLAUDE.md).
  colorScheme: 'light',
  themeColor: '#4f46e5',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        {children}
        <CookieBanner />
      </body>
    </html>
  )
}
