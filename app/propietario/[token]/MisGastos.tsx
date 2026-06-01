'use client';
import { useEffect, useState } from 'react';

const C = {
  indigo: '#4f46e5', soft: '#eef2ff', text: '#1e1b4b',
  card: '#fff', border: '#e2e8f0', muted: '#64748b', ok: '#16a34a',
};
const FONT = 'Nunito, system-ui, sans-serif';
const eur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(n) || 0);

export default function MisGastos({ token }: { token: string }) {
  const [f, setF] = useState<any>({
    fecha_doc: new Date().toISOString().slice(0, 10),
    proveedor: '', categoria: 'otros', base_imponible: '',
    porcentaje_iva: 21, descripcion: '', pagado: false,
  });
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const cargar = async () => {
    const r = await fetch(`/api/propietario/${token}/gasto`).then(x => x.json());
    setItems(r.items || []);
    setTotal(r.total_gastos || 0);
  };

  useEffect(() => { cargar(); /* eslint-disable-next-line */ }, [token]);

  const set = (k: string, v: any) => setF((s: any) => ({ ...s, [k]: v }));
  const base = Number(f.base_imponible) || 0;
  const cuota = Math.round(base * (Number(f.porcentaje_iva) || 0)) / 100;
  const tot = Math.round((base + cuota) * 100) / 100;

  const guardar = async () => {
    if (base <= 0) { setMsg('Pon un importe mayor que 0.'); return; }
    setSaving(true); setMsg('');
    const r = await fetch(`/api/propietario/${token}/gasto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    }).then(x => x.json());
    setSaving(false);
    if (r.ok) {
      setMsg('Gasto guardado ✓');
      set('base_imponible', '');
      set('descripcion', '');
      set('proveedor', '');
      cargar();
    } else {
      setMsg(r.error || 'Error al guardar');
    }
  };

  const inp: React.CSSProperties = {
    width: '100%', padding: '10px', borderRadius: 8,
    border: `1px solid ${C.border}`, fontFamily: FONT, fontSize: 15, marginTop: 4,
    boxSizing: 'border-box',
  };
  const lbl: React.CSSProperties = { fontWeight: 700, fontSize: 13, color: C.muted };

  return (
    <div style={{ fontFamily: FONT, color: C.text }}>
      <h3 style={{ fontWeight: 900, fontSize: 18, margin: '0 0 12px' }}>Mis gastos</h3>
      <div style={{
        background: C.card, border: `1px solid ${C.border}`, borderRadius: 14,
        padding: 16, maxWidth: 520, display: 'grid', gap: 12,
      }}>
        <div>
          <div style={lbl}>Fecha</div>
          <input type="date" style={inp} value={f.fecha_doc} onChange={e => set('fecha_doc', e.target.value)} />
        </div>
        <div>
          <div style={lbl}>Proveedor</div>
          <input style={inp} value={f.proveedor} onChange={e => set('proveedor', e.target.value)} placeholder="Fontanero, suministros…" />
        </div>
        <div>
          <div style={lbl}>Concepto</div>
          <input style={inp} value={f.descripcion} onChange={e => set('descripcion', e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={lbl}>Importe base (€)</div>
            <input type="number" inputMode="decimal" style={inp} value={f.base_imponible} onChange={e => set('base_imponible', e.target.value)} />
          </div>
          <div style={{ width: 110 }}>
            <div style={lbl}>IVA %</div>
            <select style={inp} value={f.porcentaje_iva} onChange={e => set('porcentaje_iva', Number(e.target.value))}>
              <option value={21}>21</option>
              <option value={10}>10</option>
              <option value={4}>4</option>
              <option value={0}>0</option>
            </select>
          </div>
        </div>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14 }}>
          <input type="checkbox" checked={f.pagado} onChange={e => set('pagado', e.target.checked)} />
          Ya pagado
        </label>
        <div style={{ background: C.soft, borderRadius: 8, padding: '8px 12px', fontSize: 14 }}>
          IVA {eur(cuota)} · <b>Total {eur(tot)}</b>
        </div>
        {msg && (
          <div style={{ color: msg.includes('✓') ? C.ok : '#dc2626', fontWeight: 700 }}>{msg}</div>
        )}
        <button
          onClick={guardar}
          disabled={saving}
          style={{
            background: C.indigo, color: '#fff', border: 'none', borderRadius: 10,
            padding: '12px', fontFamily: FONT, fontWeight: 800, cursor: 'pointer',
          }}
        >
          {saving ? 'Guardando…' : 'Guardar gasto'}
        </button>
      </div>

      <div style={{
        display: 'flex', justifyContent: 'space-between',
        maxWidth: 520, margin: '16px 0 8px', fontWeight: 800,
      }}>
        <span>Total gastos</span><span>{eur(total)}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 520 }}>
        {items.length === 0 ? (
          <div style={{ color: C.muted }}>Aún no has registrado gastos.</div>
        ) : (
          items.map(x => (
            <div key={x.id} style={{
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: '10px 12px',
              display: 'flex', justifyContent: 'space-between',
            }}>
              <span>{x.fecha_doc} · {x.proveedor || x.categoria}</span>
              <b>{eur(x.total)}</b>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
