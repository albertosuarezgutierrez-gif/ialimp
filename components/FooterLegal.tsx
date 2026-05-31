'use client'

// Footer legal reutilizable. Hereda la fuente global (Plus Jakarta Sans).
export default function FooterLegal() {
  const year = new Date().getFullYear()
  const link = { color: '#64748b', textDecoration: 'none' as const }
  return (
    <footer style={{ width: '100%', padding: '20px 16px', textAlign: 'center', fontSize: 12, color: '#64748b' }}>
      <nav style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: '8px 16px' }}>
        <a href="/aviso-legal" style={link}>Aviso legal</a>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <a href="/privacidad" style={link}>Privacidad</a>
        <span style={{ color: '#cbd5e1' }}>·</span>
        <a href="/cookies" style={link}>Cookies</a>
      </nav>
      <p style={{ marginTop: 8, color: '#94a3b8' }}>© {year} IALIMP. Todos los derechos reservados.</p>
    </footer>
  )
}
