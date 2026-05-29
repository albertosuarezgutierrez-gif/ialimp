
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import ClienteConfigPanel from '@/components/ClienteConfigPanel'
import { serialize } from '@/lib/serialize'

export default async function ClienteDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let empresa_id: string
  try { empresa_id = await requireEmpresaId() } catch { redirect('/login') }

  const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT c.*,
           COALESCE(c.chat_config,
             '{"default_visible_limpiadora":false,"limpiadora_puede_responder":false,"ver_checklist":false,"ver_fotos":false}'::jsonb
           ) AS chat_config,
           COUNT(DISTINCT p.id)::int AS num_propiedades,
           COUNT(DISTINCT cs.id)::int AS num_sesiones
    FROM clientes c
    LEFT JOIN propiedades p ON p.cliente_id = c.id
    LEFT JOIN cleaning_sessions cs ON cs.cliente_id = c.id
    WHERE c.id = ${id}::uuid AND c.empresa_id = ${empresa_id}::uuid
    GROUP BY c.id
  `)
  if (!rows.length) redirect('/admin/clientes')
  const cliente = serialize(rows[0])
  const cfg = cliente.chat_config || {}

  const C = {
    primary: '#4f46e5', brand: '#6366f1', light: '#eef2ff',
    bg: '#f1f5f9', text: '#1e293b', muted: '#64748b', border: '#e2e8f0',
  }

  return (
    <div style={{ fontFamily:"'DM Sans',-apple-system,sans-serif", background: C.bg, minHeight:'100vh', padding:'0 0 40px' }}>
      {/* Header */}
      <div style={{ background: C.primary, padding:'16px 20px', display:'flex', alignItems:'center', gap:12 }}>
        <a href="/admin/clientes"
          style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, width:32, height:32, color:'white', fontSize:18, textDecoration:'none', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ←
        </a>
        <div>
          <div style={{ color:'white', fontWeight:700, fontSize:16 }}>{cliente.nombre}</div>
          <div style={{ color:'rgba(255,255,255,0.65)', fontSize:11 }}>{cliente.num_propiedades} propiedades · {cliente.num_sesiones} sesiones</div>
        </div>
      </div>

      <div style={{ padding:16, display:'flex', flexDirection:'column', gap:14, maxWidth:600 }}>

        {/* Info básica */}
        <div style={{ background:'white', borderRadius:14, border:`1px solid ${C.border}`, padding:'14px 16px' }}>
          <div style={{ fontSize:12, fontWeight:800, color:C.primary, marginBottom:10 }}>👤 Datos del cliente</div>
          {cliente.contacto_nombre && <div style={{ fontSize:13, color:C.text, marginBottom:4 }}>📋 {cliente.contacto_nombre}</div>}
          {cliente.contacto_email  && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>✉️ {cliente.contacto_email}</div>}
          {cliente.contacto_tel    && <div style={{ fontSize:13, color:C.muted, marginBottom:4 }}>📞 {cliente.contacto_tel}</div>}
          {cliente.access_token && (
            <div style={{ marginTop:8, background:C.light, borderRadius:8, padding:'8px 12px' }}>
              <div style={{ fontSize:10, fontWeight:700, color:C.brand, marginBottom:2 }}>ENLACE PROPIETARIO</div>
              <div style={{ fontSize:11, color:C.muted, wordBreak:'break-all' }}>
                {`/propietario/${cliente.access_token}`}
              </div>
            </div>
          )}
        </div>

        {/* Panel de permisos */}
        <ClienteConfigPanel
          clienteId={cliente.id}
          clienteNombre={cliente.nombre}
          configInicial={{
            default_visible_limpiadora: cfg.default_visible_limpiadora ?? false,
            limpiadora_puede_responder: cfg.limpiadora_puede_responder ?? false,
            ver_checklist:              cfg.ver_checklist ?? false,
            ver_fotos:                  cfg.ver_fotos ?? false,
          }}
        />
      </div>
    </div>
  )
}
