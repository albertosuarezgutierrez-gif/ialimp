'use client'
import LogoIalimp from '@/components/LogoIalimp'
import TurnstileWidget from '@/components/TurnstileWidget'
import { useState } from 'react'

type Modo = 'login' | 'registro'

export default function PropietarioLogin() {
  const [modo, setModo]         = useState<Modo>('login')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [captcha, setCaptcha]   = useState('')
  const [error, setError]       = useState('')
  const [ok, setOk]             = useState('')
  const [loading, setLoading]   = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setOk('')
    try {
      const res = await fetch('/api/propietario/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, turnstileToken: captcha }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No se pudo iniciar sesión'); return }
      window.location.href = '/propietario'   // recarga → el servidor pinta el portal
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  async function pedirEnlace(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError(''); setOk('')
    try {
      const res = await fetch('/api/propietario/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, turnstileToken: captcha }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'No se pudo enviar el correo'); return }
      setOk(data.message || 'Si tu correo está registrado, te hemos enviado un enlace. Revisa tu bandeja y la carpeta de spam.')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');
        .pl-root {
          min-height: 100dvh; display: flex; align-items: center; justify-content: center;
          padding: clamp(16px, 5vw, 48px); font-family: 'Nunito', -apple-system, sans-serif;
          background: linear-gradient(145deg, #eef2ff 0%, #f1f5f9 55%, #e0e7ff 100%);
          position: relative; overflow: hidden; color: #1e1b4b;
        }
        .pl-blob1 { position:absolute; pointer-events:none; width:min(500px,80vw); height:min(500px,80vw);
          background: radial-gradient(circle, rgba(99,102,241,.14) 0%, transparent 70%); top:-15%; right:-10%; border-radius:50%; }
        .pl-blob2 { position:absolute; pointer-events:none; width:min(300px,60vw); height:min(300px,60vw);
          background: radial-gradient(circle, rgba(139,92,246,.10) 0%, transparent 70%); bottom:5%; left:-8%; border-radius:50%; }
        .pl-wrap { position:relative; z-index:1; width:100%; max-width:420px; }
        .pl-tagline { text-align:center; font-size:11px; color:#94a3b8; letter-spacing:.1em;
          text-transform:uppercase; margin: 6px 0 clamp(22px,5vw,36px); }
        .pl-card { background:#fff; border:1px solid #e2e8f0; border-radius:24px;
          padding: clamp(22px,5vw,34px); box-shadow:0 10px 40px rgba(79,70,229,.10); }
        .pl-tabs { display:flex; gap:6px; background:#f1f5f9; border-radius:12px; padding:4px; margin-bottom:22px; }
        .pl-tab { flex:1; border:none; background:transparent; border-radius:9px; padding:9px 8px;
          font-family:inherit; font-size:13px; font-weight:800; color:#64748b; cursor:pointer; transition:all .15s; }
        .pl-tab.active { background:#fff; color:#4f46e5; box-shadow:0 1px 4px rgba(79,70,229,.15); }
        .pl-label { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase;
          letter-spacing:.08em; margin-bottom:7px; }
        .pl-input { width:100%; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:13px 15px;
          color:#1e1b4b; font-family:inherit; font-size:14px; outline:none; margin-bottom:16px;
          transition:border-color .15s, background .15s; }
        .pl-input:focus { border-color:#6366f1; background:#fff; }
        .pl-input::placeholder { color:#94a3b8; }
        .pl-btn { width:100%; background:#4f46e5; border:none; border-radius:12px; padding:15px; color:#fff;
          font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; margin-top:2px;
          box-shadow:0 4px 20px rgba(79,70,229,.3); transition:all .15s; }
        .pl-btn:hover:not(:disabled) { background:#3730a3; transform:translateY(-1px); }
        .pl-btn:disabled { opacity:.55; cursor:not-allowed; }
        .pl-error { background:#fef2f2; border:1px solid #fecaca; border-radius:10px; padding:10px 14px;
          color:#dc2626; font-size:13px; margin-bottom:14px; }
        .pl-ok { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:12px 14px;
          color:#15803d; font-size:13px; line-height:1.5; margin-bottom:14px; }
        .pl-hint { font-size:12px; color:#94a3b8; line-height:1.5; margin-bottom:16px; }
        .pl-footer { text-align:center; font-size:12px; color:#94a3b8; margin-top:18px; line-height:1.6; }
        .pl-footer a { color:#4f46e5; font-weight:700; text-decoration:none; cursor:pointer; }
        .pl-footer a:hover { text-decoration:underline; }
      `}</style>

      <div className="pl-root">
        <div className="pl-blob1" />
        <div className="pl-blob2" />

        <div className="pl-wrap">
          <div style={{ textAlign:'center', marginBottom: 2 }}>
            <LogoIalimp size={28} color="#4f46e5" />
          </div>
          <div className="pl-tagline">Acceso para propietarios</div>

          <div className="pl-card">
            <div className="pl-tabs">
              <button className={`pl-tab ${modo==='login'?'active':''}`}
                onClick={() => { setModo('login'); setError(''); setOk('') }} type="button">
                Entrar
              </button>
              <button className={`pl-tab ${modo==='registro'?'active':''}`}
                onClick={() => { setModo('registro'); setError(''); setOk('') }} type="button">
                Crear cuenta
              </button>
            </div>

            {error && <div className="pl-error">⚠ {error}</div>}
            {ok    && <div className="pl-ok">✅ {ok}</div>}

            {modo === 'login' ? (
              <form onSubmit={entrar}>
                <label className="pl-label">Tu email</label>
                <input className="pl-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                  autoComplete="email" required />
                <label className="pl-label">Contraseña</label>
                <input className="pl-input" type="password" value={password}
                  onChange={e => setPassword(e.target.value)} placeholder="••••••••"
                  autoComplete="current-password" required />
                <TurnstileWidget onToken={setCaptcha} />
                <button className="pl-btn" type="submit" disabled={loading}>
                  {loading ? 'Accediendo…' : 'Entrar en mi portal →'}
                </button>
                <div className="pl-footer">
                  ¿Olvidaste tu contraseña?{' '}
                  <a onClick={() => { setModo('registro'); setError(''); setOk('') }}>Recupérala aquí</a>
                </div>
              </form>
            ) : (
              <form onSubmit={pedirEnlace}>
                <p className="pl-hint">
                  Escribe el correo que tienes registrado con tu empresa de limpieza.
                  Te enviaremos un enlace para crear (o restablecer) tu contraseña.
                </p>
                <label className="pl-label">Tu email</label>
                <input className="pl-input" type="email" value={email}
                  onChange={e => setEmail(e.target.value)} placeholder="tucorreo@ejemplo.com"
                  autoComplete="email" required />
                <TurnstileWidget onToken={setCaptcha} />
                <button className="pl-btn" type="submit" disabled={loading}>
                  {loading ? 'Enviando…' : 'Enviarme el enlace →'}
                </button>
                <div className="pl-footer">
                  ¿Ya tienes contraseña?{' '}
                  <a onClick={() => { setModo('login'); setError(''); setOk('') }}>Inicia sesión</a>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
