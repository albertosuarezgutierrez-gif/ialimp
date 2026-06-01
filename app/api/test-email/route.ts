import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

// ⚠️ ENDPOINT TEMPORAL DE DIAGNÓSTICO — BORRAR tras la prueba.
// Protegido por ?key=. No expone secretos (solo el dominio del remitente).
export async function GET(req: Request) {
  const url = new URL(req.url)
  if (url.searchParams.get('key') !== '5e67cccbadfd0eba7f36558d') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  const to   = url.searchParams.get('to') || 'alberto.suarez.gutierrez@gmail.com'
  const from = process.env.MAIL_FROM || 'hola@ialimp.es'

  const gmailUser = process.env.GMAIL_USER || ''
  const diag = {
    gmail_user_set: !!gmailUser,
    gmail_user_domain: gmailUser.split('@')[1] || null,
    app_password_set: !!process.env.GMAIL_APP_PASSWORD,
    mail_from: from,
  }

  if (!gmailUser || !process.env.GMAIL_APP_PASSWORD) {
    return NextResponse.json({ ok: false, error: 'Credenciales no configuradas', diag })
  }

  try {
    const t = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: gmailUser, pass: process.env.GMAIL_APP_PASSWORD }
    })
    const info = await t.sendMail({
      from: `"ialimp (prueba)" <${from}>`,
      to,
      subject: '🔧 Prueba de envío ialimp — ' + new Date().toISOString(),
      html: `<div style="font-family:sans-serif">
        <p>Correo de <b>prueba</b> del sistema de envío de ialimp.</p>
        <p>Si lo recibes, el envío funciona. Remitente configurado: <b>${from}</b></p>
      </div>`
    })
    return NextResponse.json({
      ok: true,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
      envelope: info.envelope,
      messageId: info.messageId,
      diag,
    })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, code: e.code, command: e.command, diag })
  }
}
