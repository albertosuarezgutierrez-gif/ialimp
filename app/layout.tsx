import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ialimp — Gestión de limpiezas',
  description: 'Software de coordinación de limpieza para empresas de apartamentos turísticos',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
