export const metadata = {
  title: 'Manual de usuario — IALIMP',
  description: 'Guía completa para usar IALIMP: gestión de limpiezas, app limpiadora, portal propietario y más.',
}

export default function ManualPage() {
  return (
    <html lang="es">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'DM Sans', sans-serif", background: '#f1f5f9' }}>
        <ManualContent />
      </body>
    </html>
  )
}

function ManualContent() {
  return <ManualPageClient />
}

// We render as a server component that embeds the full HTML
// Since we need interactivity (TOC, search, anchors) we use a client component
import ManualPageClient from './ManualClient'
