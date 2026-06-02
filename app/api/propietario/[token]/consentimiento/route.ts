import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { RGPD_VERSION } from '@/lib/rgpd'

// POST /api/propietario/[token]/consentimiento
// Registra la autorización RGPD del cliente para acceder a su intranet.
// Público (token en URL): /api/propietario está exento de auth en el middleware.
export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params
    const { version } = await req.json().catch(() => ({}))
    const ver = (version || RGPD_VERSION).toString()

    // Identificar al cliente por su token de acceso (scope implícito por token único).
    const clientes = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, empresa_id FROM clientes
      WHERE access_token = ${token} AND notif_activa = true
    `)
    if (!clientes.length) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    const { id, empresa_id } = clientes[0]

    // Evidencia: IP y user-agent del navegador del cliente.
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || null
    const userAgent = req.headers.get('user-agent') || null

    // Snapshot del consentimiento vigente en el cliente.
    await prisma.$executeRaw(Prisma.sql`
      UPDATE clientes SET
        rgpd_aceptado    = true,
        rgpd_aceptado_at = now(),
        rgpd_version     = ${ver}
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)

    // Histórico auditable.
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO cliente_consentimientos (empresa_id, cliente_id, version, ip, user_agent)
      VALUES (${empresa_id}::uuid, ${id}::uuid, ${ver}, ${ip}, ${userAgent})
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
