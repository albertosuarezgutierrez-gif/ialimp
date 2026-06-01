import nodemailer from 'nodemailer'

// Remitente único de toda la app (display = nombre de empresa en cada ruta).
export const MAIL_FROM = process.env.MAIL_FROM || 'hola@ialimp.es'

// Construye el transporter de correo desde variables de entorno.
// 1) SMTP genérico (IONOS u otro): SMTP_USER + SMTP_PASSWORD
//    (host/puerto por defecto = IONOS España: smtp.ionos.es:465 SSL).
// 2) Fallback Gmail: GMAIL_USER + GMAIL_APP_PASSWORD.
// Devuelve null si no hay credenciales → la ruta marca el correo como no enviado.
export function getTransporter() {
  if (process.env.SMTP_USER && process.env.SMTP_PASSWORD) {
    const host = process.env.SMTP_HOST || 'smtp.ionos.es'
    const port = Number(process.env.SMTP_PORT || 465)
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465, // 465 = SSL; 587 = STARTTLS
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
    })
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
  }
  return null
}
