import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

// Enlace de un clic para el pie de los emails comerciales (lo exige la LSSI).
// Uso:  https://ialimp.vercel.app/api/propietario/{TOKEN}/baja-comercial
function pagina(titulo: string, mensaje: string) {
  return new Response(
    `<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${titulo}</title>
<style>
  body{margin:0;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:#f1f5f9;color:#0f172a;
       display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}
  .card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;padding:32px;max-width:420px;text-align:center;
        box-shadow:0 10px 40px rgba(79,70,229,.10)}
  h1{font-size:20px;margin:0 0 8px}
  p{font-size:15px;line-height:1.6;color:#334155;margin:0}
  .dot{width:44px;height:44px;border-radius:999px;background:#eef2ff;color:#4f46e5;
       display:flex;align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px}
</style></head>
<body><div class="card"><div class="dot">&#10003;</div><h1>${titulo}</h1><p>${mensaje}</p></div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const rows = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT id FROM clientes WHERE access_token = ${token} LIMIT 1
  `)
  if (!rows.length) {
    return pagina('Enlace no válido', 'No hemos podido procesar la baja. Comprueba el enlace o contáctanos.')
  }

  await prisma.$executeRaw(Prisma.sql`
    UPDATE clientes SET acepto_comercial = false, acepto_comercial_fecha = now()
    WHERE id = ${rows[0].id}::uuid
  `)

  return pagina(
    'Baja confirmada',
    'Ya no recibirás más comunicaciones comerciales. Seguirás recibiendo los avisos necesarios del servicio.'
  )
}
