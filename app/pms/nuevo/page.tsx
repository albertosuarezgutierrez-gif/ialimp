'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const PMS_TIPOS = [
  { id: 'smoobu',   label: 'Smoobu',       icon: '🏠' },
  { id: 'octorate', label: 'Octorate',      icon: '🐙' },
  { id: 'icnea',    label: 'Icnea',         icon: '📋' },
  { id: 'hostify',  label: 'Hostify',       icon: '⚡' },
  { id: 'kross',    label: 'Kross Booking', icon: '🔑' },
  { id: 'airbnb',   label: 'Airbnb (iCal)', icon: '🏡' },
  { id: 'ical',     label: 'Otro (URL iCal)', icon: '📅' },
]

export default function NuevoPmsPage() {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({ cliente_nombre: '', pms_tipo: '', ical_url: '' })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/pms/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error'); return }
      router.push('/dashboard')
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-indigo-600 text-white px-4 py-3 flex items-center gap-3">
        <a href="/dashboard" className="text-indigo-200 hover:text-white">← Volver</a>
        <h1 className="font-bold">Conectar PMS</h1>
      </header>

      <div className="p-4 max-w-lg mx-auto">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-6">
          {[1,2,3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{s}</div>
              {s < 3 && <div className={`h-0.5 w-8 ${step > s ? 'bg-indigo-600' : 'bg-gray-200'}`}/>}
            </div>
          ))}
          <span className="text-sm text-gray-500 ml-2">
            {step === 1 ? 'Nombre del cliente' : step === 2 ? 'Tipo de PMS' : 'URL iCal'}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {step === 1 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">¿Cómo se llama este cliente?</h2>
              <input
                type="text"
                placeholder="Ej: AlohaSevilla, Apartamentos Resolana..."
                value={form.cliente_nombre}
                onChange={e => setForm(f => ({ ...f, cliente_nombre: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                required
              />
              <button type="button" onClick={() => form.cliente_nombre && setStep(2)}
                className="w-full mt-4 bg-indigo-600 text-white py-2 rounded-lg font-semibold">
                Siguiente →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-4">¿Qué PMS usa?</h2>
              <div className="grid grid-cols-2 gap-3">
                {PMS_TIPOS.map(p => (
                  <button key={p.id} type="button"
                    onClick={() => { setForm(f => ({ ...f, pms_tipo: p.id })); setStep(3) }}
                    className={`p-3 rounded-xl border-2 text-left transition ${
                      form.pms_tipo === p.id
                        ? 'border-indigo-600 bg-indigo-50'
                        : 'border-gray-200 hover:border-indigo-300'
                    }`}>
                    <div className="text-2xl">{p.icon}</div>
                    <div className="text-sm font-medium mt-1">{p.label}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h2 className="font-semibold text-gray-800 mb-1">URL del calendario iCal</h2>
              <p className="text-sm text-gray-500 mb-4">
                Copia la URL del calendario .ics desde el PMS de tu cliente
              </p>
              <input
                type="url"
                placeholder="https://..."
                value={form.ical_url}
                onChange={e => setForm(f => ({ ...f, ical_url: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
              {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
              <div className="flex gap-3 mt-4">
                <button type="button" onClick={() => setStep(2)}
                  className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg">
                  ← Atrás
                </button>
                <button type="submit" disabled={loading}
                  className="flex-1 bg-indigo-600 text-white py-2 rounded-lg font-semibold disabled:opacity-50">
                  {loading ? 'Conectando...' : 'Conectar ✓'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
