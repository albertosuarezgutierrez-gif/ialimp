import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import nodemailer from 'nodemailer'

export async function POST(req: Request) {
  try {
    const empresa_id = await requireEmpresaId()
    const { cliente_id, periodo, enviar_email = false } = await req.json()
    // periodo = "2026-05"
    const [year, month] = periodo.split('-').map(Number)
    const inicio = new Date(year, month - 1, 1).toISOString().split('T')[0]
    const fin    = new Date(year, month, 0).toISOString().split('T')[0]

    // Datos del periodo
    const [empresa, cliente, sesiones, quejas_data] = await Promise.all([
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT nombre, email FROM empresas WHERE id = ${empresa_id}::uuid`),
      prisma.$queryRaw<any[]>(Prisma.sql`SELECT * FROM clientes WHERE id = ${cliente_id}::uuid`),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT cs.*, l.nombre AS limpiadora_nombre,
          EXTRACT(EPOCH FROM (cs.hora_salida - cs.hora_llegada))/3600.0 AS horas_trabajadas
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.empresa_id = ${empresa_id}::uuid AND cs.cliente_id = ${cliente_id}::uuid
          AND cs.session_date BETWEEN ${inicio}::date AND ${fin}::date
          AND cs.completed_at IS NOT NULL
        ORDER BY cs.session_date ASC
      `),
      prisma.$queryRaw<any[]>(Prisma.sql`
        SELECT q.*, p.nombre AS propiedad_nombre FROM quejas q
        LEFT JOIN propiedades p ON p.id = q.propiedad_id
        WHERE q.empresa_id = ${empresa_id}::uuid AND q.cliente_id = ${cliente_id}::uuid
          AND q.creada_at::date BETWEEN ${inicio}::date AND ${fin}::date
      `)
    ])

    const c    = cliente[0]
    const e    = empresa[0]
    const totalH = sesiones.reduce((a: number, s: any) => a + (Number(s.horas_trabajadas) || 0), 0)
    const totalF = sesiones.reduce((a: number, s: any) => a + (Number(s.precio_final) || 0), 0)
    const mes    = new Date(year, month - 1, 1).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

    // Generar HTML del informe
    const html = '<html><head><meta charset="utf-8"><style>body{font-family:Arial,sans-serif;margin:40px;color:#1e293b}' +
      '.header{background:#4f46e5;color:white;padding:24px;border-radius:8px;margin-bottom:24px}' +
      '.header h1{margin:0;font-size:24px}.header p{margin:4px 0;opacity:.8;font-size:14px}' +
      'table{width:100%;border-collapse:collapse;margin:16px 0}' +
      'th{background:#f1f5f9;padding:10px;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:.05em}' +
      'td{padding:10px;border-bottom:1px solid #e2e8f0;font-size:13px}' +
      '.total{font-weight:700;background:#eef2ff}.stat{display:inline-block;margin:8px 16px 8px 0;text-align:center}' +
      '.stat-n{font-size:28px;font-weight:800;color:#4f46e5}.stat-l{font-size:11px;color:#64748b}</style></head><body>' +
      '<div class="header"><h1>' + e.nombre + '</h1><p>Informe de servicio — ' + mes + '</p>' +
      '<p>Cliente: ' + c.nombre + '</p></div>' +
      '<div style="display:flex;gap:16px;margin-bottom:24px">' +
      '<div class="stat"><div class="stat-n">' + sesiones.length + '</div><div class="stat-l">Limpiezas</div></div>' +
      '<div class="stat"><div class="stat-n">' + totalH.toFixed(1) + 'h</div><div class="stat-l">Horas trabajadas</div></div>' +
      '<div class="stat"><div class="stat-n">' + quejas_data.length + '</div><div class="stat-l">Incidencias</div></div>' +
      '<div class="stat"><div class="stat-n">' + (totalF > 0 ? totalF.toFixed(0) + '€' : '—') + '</div><div class="stat-l">Facturado</div></div>' +
      '</div>' +
      '<h3 style="margin:16px 0 8px;color:#4f46e5">Limpiezas realizadas</h3>' +
      '<table><tr><th>Fecha</th><th>Propiedad</th><th>Limpiadora</th><th>Estado</th>' + (c.tipo === 'comunidad' ? '<th>Firma</th>' : '') + '</tr>' +
      sesiones.map((s: any) => '<tr><td>' + s.session_date + '</td><td>' + (s.property_name || '—') + '</td><td>' +
        (s.limpiadora_nombre || '—') + '</td><td>✅ Completada</td>' +
        (c.tipo === 'comunidad' ? '<td>' + (s.firma_at ? '✅ Firmado' : '—') + '</td>' : '') + '</tr>').join('') +
      '</table>' +
      (quejas_data.length > 0 ? '<h3 style="margin:24px 0 8px;color:#dc2626">Incidencias del mes</h3>' +
        '<table><tr><th>Fecha</th><th>Propiedad</th><th>Descripción</th><th>Estado</th></tr>' +
        quejas_data.map((q: any) => '<tr><td>' + q.creada_at?.toString().slice(0,10) + '</td><td>' +
          (q.propiedad_nombre||'—') + '</td><td>' + q.descripcion + '</td><td>' + q.estado + '</td></tr>').join('') +
        '</table>' : '') +
      '<div style="margin-top:32px;padding:16px;background:#f8fafc;border-radius:8px;font-size:12px;color:#64748b">' +
      '<strong>' + e.nombre + '</strong><br>Informe generado automáticamente por ialimp</div></body></html>'

    // Guardar informe
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO informes_mensuales (empresa_id, cliente_id, periodo, total_sesiones, total_horas, total_quejas, total_facturado, html_contenido)
      VALUES (${empresa_id}::uuid, ${cliente_id}::uuid, ${periodo}, ${sesiones.length}, ${totalH}, ${quejas_data.length}, ${totalF || 0}, ${html})
      ON CONFLICT (empresa_id, cliente_id, periodo) DO UPDATE SET html_contenido = EXCLUDED.html_contenido, total_sesiones = EXCLUDED.total_sesiones
    `)

    // Enviar email si solicitado y hay credenciales
    let email_enviado = false
    if (enviar_email && c.notif_email && process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
      try {
        const t = nodemailer.createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
        await t.sendMail({
          from: '"' + e.nombre + '" <' + process.env.GMAIL_USER + '>',
          to: c.notif_email,
          subject: 'Informe de servicio ' + mes + ' — ' + e.nombre,
          html
        })
        await prisma.$executeRaw(Prisma.sql`UPDATE informes_mensuales SET email_enviado = true, email_enviado_at = NOW() WHERE empresa_id = ${empresa_id}::uuid AND cliente_id = ${cliente_id}::uuid AND periodo = ${periodo}`)
        email_enviado = true
      } catch {}
    }

    return NextResponse.json({ ok: true, html, sesiones: sesiones.length, email_enviado })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
