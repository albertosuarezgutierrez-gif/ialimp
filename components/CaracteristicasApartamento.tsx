'use client'

interface Props {
  form: any
  onChange: (k: string, v: any) => void
}

const EXTRAS = [
  { key: 'tiene_piscina',         label: 'Piscina',         icon: '🏊' },
  { key: 'tiene_terraza',         label: 'Terraza',         icon: '🌿' },
  { key: 'tiene_barbacoa',        label: 'Barbacoa',        icon: '🍖' },
  { key: 'tiene_jacuzzi',         label: 'Jacuzzi',         icon: '🛁' },
  { key: 'tiene_lavadora',        label: 'Lavadora',        icon: '👕' },
  { key: 'tiene_secadora',        label: 'Secadora',        icon: '♨️' },
  { key: 'tiene_cocina_completa', label: 'Cocina completa', icon: '🍳' },
  { key: 'tiene_lavavajillas',    label: 'Lavavajillas',    icon: '🍽️' },
  { key: 'tiene_parking',         label: 'Parking',         icon: '🚗' },
  { key: 'kit_bienvenida',        label: 'Kit bienvenida',  icon: '🎁' },
]

export default function CaracteristicasApartamento({ form, onChange }: Props) {
  const f = (k: string, v: any) => onChange(k, v)

  // Cálculo de material estimado en tiempo real
  const huesps   = Number(form.num_huespedes_max || 2)
  const camas135 = Number(form.num_camas_135 || 0)
  const camas90  = Number(form.num_camas_90 || 0)
  const literas  = Number(form.num_literas || 0)       // cada litera = 2 camas de 90
  const banos    = Number(form.num_banos || 1)

  // Total sábanas de 90: camas individuales + literas × 2
  const total90 = camas90 + literas * 2

  const material = {
    '🛏️ Sábanas 135cm':         camas135,
    '🛏️ Sábanas 90cm':          total90,
    '🛁 Toallas baño':           huesps,
    '🤝 Toallas mano':           huesps,
    '🦶 Toallas pie ducha':      huesps,
    ...(form.tiene_piscina ? { '🏊 Toallas piscina': huesps } : {}),
    '🧴 Gel/champú (x baño)':   banos,
    '🧻 Papel higiénico':        banos * 2,
    '🧼 Jabón manos':            banos + Number(form.num_aseos || 0),
    ...(form.tiene_cocina_completa ? {
      '🧽 Esponja + bayeta': 1,
      '🗑️ Bolsas basura':    3,
      ...(form.tiene_lavavajillas ? { '🍽️ Pastillas lavavajillas': 2 } : {})
    } : {}),
    ...(form.kit_bienvenida ? { '🎁 Kit bienvenida': 1 } : {})
  }

  return (
    <div className="bg-amber-50 rounded-2xl p-4 space-y-4">
      <div className="text-sm font-semibold text-amber-700">🏠 Características del apartamento</div>

      {/* Camas por medida */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Camas
          <span className="font-normal text-gray-400 ml-1">— determina el stock de sábanas necesario</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key: 'num_camas_135', label: '🛏️ Camas 135cm',  desc: 'Matrimonio / doble' },
            { key: 'num_camas_90',  label: '🛏️ Camas 90cm',   desc: 'Individual' },
              { key: 'num_literas',   label: '🪜 Literas',       desc: 'Cada litera = 2 × 90cm' },
          ].map(c => (
            <div key={c.key} className="bg-white rounded-xl p-2.5 border border-amber-100">
              <label className="block text-xs font-semibold text-gray-700 mb-0.5">{c.label}</label>
              <div className="text-xs text-gray-400 mb-1.5">{c.desc}</div>
              <input type="number" min="0" max="20"
                value={(form as any)[c.key] || 0}
                onChange={e => f(c.key, Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ))}
        </div>

        {/* Resumen sábanas en tiempo real */}
        {(camas135 + total90) > 0 && (
          <div className="mt-2 bg-amber-100 rounded-lg px-3 py-2 flex gap-4 text-xs">
            {camas135 > 0 && (
              <span className="text-amber-800 font-semibold">
                🛏️ {camas135} juego{camas135 > 1 ? 's' : ''} 135cm
              </span>
            )}
            {total90 > 0 && (
              <span className="text-amber-800 font-semibold">
                🛏️ {total90} juego{total90 > 1 ? 's' : ''} 90cm
                {literas > 0 && <span className="font-normal text-amber-600"> ({literas} litera{literas > 1 ? 's' : ''} × 2)</span>}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Baños + huéspedes */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { key: 'num_banos',         label: '🚿 Baños'      },
          { key: 'num_aseos',         label: '🚽 Aseos'      },
          { key: 'num_huespedes_max', label: '👥 Huésp. máx' },
        ].map(c => (
          <div key={c.key}>
            <label className="block text-xs text-gray-500 mb-1">{c.label}</label>
            <input type="number" min="0" max="20"
              value={(form as any)[c.key] || 0}
              onChange={e => f(c.key, Number(e.target.value))}
              className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-amber-400" />
          </div>
        ))}
      </div>

      {/* Extras */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Instalaciones y extras</label>
        <div className="grid grid-cols-2 gap-2">
          {EXTRAS.map(e => (
            <label key={e.key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-amber-100 transition">
              <input type="checkbox"
                checked={Boolean((form as any)[e.key])}
                onChange={ev => f(e.key, ev.target.checked)}
                className="w-4 h-4 text-amber-500 rounded" />
              <span className="text-sm">{e.icon} {e.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Gestión lencería */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-2">Gestión de lencería</label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { id: 'propietario', label: 'Propietario', icon: '👤', desc: 'Tiene la suya' },
            { id: 'empresa',     label: 'Empresa',     icon: '🏢', desc: 'Nosotros la llevamos' },
            { id: 'mixto',       label: 'Mixto',       icon: '🔀', desc: 'Compartida' },
          ].map(opt => (
            <button key={opt.id} type="button"
              onClick={() => f('gestion_lenceria', opt.id)}
              className="p-2 rounded-xl border-2 text-center transition"
              style={{
                borderColor: form.gestion_lenceria === opt.id ? '#f59e0b' : '#e5e7eb',
                background:  form.gestion_lenceria === opt.id ? '#fef3c7' : 'white'
              }}>
              <div className="text-base">{opt.icon}</div>
              <div className="text-xs font-semibold" style={{ color: form.gestion_lenceria === opt.id ? '#92400e' : '#374151' }}>{opt.label}</div>
              <div className="text-xs text-gray-400 leading-tight">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Notas material */}
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          Notas de material
          <span className="font-normal text-gray-400 ml-1">— jabones especiales, marca papel…</span>
        </label>
        <textarea value={form.notas_material || ''}
          onChange={e => f('notas_material', e.target.value)}
          placeholder="Ej: Jabón La Toja, papel triple capa, toallas blancas 600g…"
          rows={2}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
      </div>

      {/* Material estimado por limpieza */}
      {(camas135 + total90 + banos) > 0 && (
        <div className="bg-white rounded-xl p-3 border border-amber-200">
          <p className="text-xs font-semibold text-amber-700 mb-2">📦 Material estimado por limpieza</p>
          <div className="grid grid-cols-2 gap-1">
            {Object.entries(material).filter(([, v]) => Number(v) > 0).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs">
                <span className="text-gray-600">{k}</span>
                <span className="font-bold text-amber-700">{String(v)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

