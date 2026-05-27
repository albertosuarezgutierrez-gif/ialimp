'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LimpiadoarasLogin() {
  const [pin, setPin]       = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handlePin(digit: string) {
    if (pin.length >= 4) return
    const newPin = pin + digit
    setPin(newPin)
    setError('')
    if (newPin.length === 4) {
      setLoading(true)
      const r = await fetch('/api/l/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: newPin }),
      })
      const d = await r.json()
      if (d.ok) { router.push('/l') }
      else { setError('PIN incorrecto'); setPin('') }
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f1f5f9', padding: '24px',
      fontFamily: "'DM Sans', -apple-system, sans-serif"
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 16px',
          background: '#4f46e5',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 36, boxShadow: '0 8px 24px rgba(79,70,229,0.3)'
        }}>🧹</div>
        <div style={{ fontWeight: 800, fontSize: 22, color: '#1e1b4b', letterSpacing: '-0.02em' }}>ialimp</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Introduce tu PIN</div>
        {error && (
          <div style={{ color: '#dc2626', fontSize: 13, marginTop: 10, fontWeight: 600 }}>{error}</div>
        )}
      </div>

      {/* Puntos PIN */}
      <div style={{ display: 'flex', gap: 18, marginBottom: 40 }}>
        {[0,1,2,3].map(i => (
          <div key={i} style={{
            width: 16, height: 16, borderRadius: '50%',
            background: i < pin.length ? '#4f46e5' : '#e2e8f0',
            boxShadow: i < pin.length ? '0 2px 8px rgba(79,70,229,0.4)' : 'none',
            transition: 'all 0.15s',
          }} />
        ))}
      </div>

      {/* Teclado */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, width: 264 }}>
        {['1','2','3','4','5','6','7','8','9','','0','⌫'].map((d, i) => (
          <button key={i}
            disabled={loading || d === ''}
            onClick={() => d === '⌫' ? setPin(p => p.slice(0,-1)) : handlePin(d)}
            style={{
              height: 70, borderRadius: 16, border: 'none',
              fontSize: d === '⌫' ? 22 : 26, fontWeight: 500,
              cursor: d === '' ? 'default' : 'pointer',
              background: d === '' ? 'transparent' : 'white',
              color: d === '⌫' ? '#94a3b8' : '#1e293b',
              boxShadow: d === '' ? 'none' : '0 1px 4px rgba(0,0,0,0.08)',
              transition: 'all 0.1s', opacity: loading ? 0.5 : 1,
              fontFamily: 'inherit'
            }}>
            {d}
          </button>
        ))}
      </div>

      <div style={{ marginTop: 40, fontSize: 11, color: '#94a3b8' }}>
        Powered by ialimp
      </div>
    </div>
  )
}
