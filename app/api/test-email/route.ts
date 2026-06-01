import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO — BORRAR tras la prueba.
// No guarda credenciales: se pasan por querystring en la llamada de prueba.
export async function GET(req: Request) {
  const u = new URL(req.url)
  if (u.searchParams.get('key') !== 'dbf7fc959094270d9d5e54fb') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const user = u.searchParams.get('smtp_user') || 'hola@ialimp.es'
  const pass = u.searchParams.get('smtp_pass') || ''
  const to   = u.searchParams.get('to') || 'alberto.suarez.gutierrez@gmail.com'
  const host = u.searchParams.get('host') || 'smtp.ionos.es'
  const port = Number(u.searchParams.get('port') || 465)

  try {
    const t = nodemailer.createTransport({
      host, port, secure: port === 465,
      auth: { user, pass },
    })
    const info = await t.sendMail({
      from: `"ialimp (prueba)" <hola@ialimp.es>`,
      to,
      subject: '🔧 Prueba de envío IONOS — ' + new Date().toISOString(),
      html: `<div style="font-family:sans-serif">
        <p>Correo de <b>prueba</b> de ialimp vía SMTP de IONOS.</p>
        <p>Si lo recibes, el envío funciona y el remitente es <b>hola@ialimp.es</b>.</p>
      </div>`,
    })
    return NextResponse.json({
      ok: true, accepted: info.accepted, rejected: info.rejected,
      response: info.response, messageId: info.messageId, host, port,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, code: e.code, command: e.command, host, port })
  }
}
