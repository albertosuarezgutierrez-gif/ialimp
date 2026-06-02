'use client'
import LogoIalimp from '@/components/LogoIalimp'
import { useState } from 'react'

export default function RecuperarPage() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [msg, setMsg]       = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res  = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      // Respuesta genérica (anti-enumeración): mostramos confirmación pase lo que pase.
      setMsg(data.message || 'Si ese email tiene una cuenta, te hemos enviado un enlace.')
      setEnviado(true)
    } catch {
      setMsg('Si ese email tiene una cuenta, te hemos enviado un enlace.')
      setEnviado(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;500;600;700;800;900&display=swap');
        .login-root { min-height:100dvh; display:flex; align-items:center; justify-content:center; padding:clamp(16px,5vw,48px); font-family:'Nunito',-apple-system,sans-serif; background:linear-gradient(145deg,#eef2ff 0%,#f1f5f9 55%,#e0e7ff 100%); position:relative; overflow:hidden; }
        .login-blob1 { position:absolute; pointer-events:none; width:min(500px,80vw); height:min(500px,80vw); background:radial-gradient(circle,rgba(99,102,241,.14) 0%,transparent 70%); top:-15%; right:-10%; border-radius:50%; }
        .login-blob2 { position:absolute; pointer-events:none; width:min(300px,60vw); height:min(300px,60vw); background:radial-gradient(circle,rgba(139,92,246,.10) 0%,transparent 70%); bottom:5%; left:-8%; border-radius:50%; }
        .login-wrap { position:relative; z-index:1; width:100%; max-width:420px; }
        .login-tagline { text-align:center; font-size:11px; color:#94a3b8; letter-spacing:.1em; text-transform:uppercase; margin-bottom:clamp(28px,5vw,44px); }
        .login-card { background:#fff; border:1px solid #e2e8f0; border-radius:24px; padding:clamp(24px,5vw,36px); box-shadow:0 10px 40px rgba(79,70,229,.10); }
        .login-title { font-size:19px; font-weight:800; color:#1e1b4b; margin:0 0 6px; }
        .login-sub { font-size:13.5px; color:#64748b; line-height:1.5; margin:0 0 20px; }
        .login-label { display:block; font-size:11px; font-weight:700; color:#64748b; text-transform:uppercase; letter-spacing:.08em; margin-bottom:7px; }
        .login-input { width:100%; background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:13px 15px; color:#1e1b4b; font-family:inherit; font-size:14px; outline:none; margin-bottom:18px; transition:border-color .15s,background .15s; }
        .login-input:focus { border-color:#6366f1; background:#fff; }
        .login-input::placeholder { color:#94a3b8; }
        .login-btn { width:100%; background:#4f46e5; border:none; border-radius:12px; padding:15px; color:#fff; font-family:inherit; font-size:15px; font-weight:800; cursor:pointer; margin-top:4px; box-shadow:0 4px 20px rgba(79,70,229,.3); transition:all .15s; }
        .login-btn:hover:not(:disabled) { background:#3730a3; transform:translateY(-1px); box-shadow:0 6px 24px rgba(79,70,229,.4); }
        .login-btn:disabled { opacity:.55; cursor:not-allowed; }
        .login-ok { background:#f0fdf4; border:1px solid #bbf7d0; border-radius:10px; padding:14px 16px; color:#15803d; font-size:13.5px; line-height:1.5; }
        .login-footer { text-align:center; font-size:12px; color:#94a3b8; margin-top:20px; }
        .login-footer a { color:#4f46e5; font-weight:700; text-decoration:none; }
        .login-footer a:hover { text-decoration:underline; }
      `}</style>

      <div className="login-root">
        <div className="login-blob1" />
        <div className="login-blob2" />
        <div className="login-wrap">
          <div style={{ textAlign:'center', marginBottom:4 }}>
            <LogoIalimp size={28} color="#4f46e5" />
          </div>
          <div className="login-tagline">Gestión inteligente de limpiezas</div>

          <div className="login-card">
            {enviado ? (
              <>
                <h1 className="login-title">Revisa tu correo</h1>
                <div className="login-ok">✓ {msg}</div>
                <div className="login-footer" style={{ marginTop:18 }}>
                  El enlace caduca en 1 hora. <a href="/login">Volver al acceso</a>
                </div>
              </>
            ) : (
              <>
                <h1 className="login-title">¿Olvidaste tu contraseña?</h1>
                <p className="login-sub">Escribe el email de tu cuenta y te enviaremos un enlace para crear una nueva contraseña.</p>
                <form onSubmit={handleSubmit}>
                  <label className="login-label">Email</label>
                  <input className="login-input" type="email" value={email}
                    onChange={e => setEmail(e.target.value)} placeholder="tu@email.com"
                    autoComplete="email" required />
                  <button className="login-btn" type="submit" disabled={loading}>
                    {loading ? 'Enviando...' : 'Enviar enlace →'}
                  </button>
                </form>
                <div className="login-footer">
                  ¿Ya la recuerdas? <a href="/login">Volver al acceso</a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
