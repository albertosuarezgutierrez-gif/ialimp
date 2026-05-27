import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: Request) {
  const empresa_id = await requireEmpresaId().catch(() => null)
  if (!empresa_id) return new Response('Unauthorized', { status: 401 })

  const hoy = new Date().toISOString().split('T')[0]

  const encoder = new TextEncoder()
  const stream  = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'))
      }

      // Enviar estado inicial
      const sesiones = await prisma.$queryRaw<any[]>(Prisma.sql\`
        SELECT cs.id::text, cs.property_name,
          cs.started_at, cs.completed_at,
          cs.hora_checkout::text AS hora_checkout,
          l.nombre AS limpiadora_nombre,
          CASE WHEN cs.completed_at IS NOT NULL THEN 'completada'
               WHEN cs.started_at   IS NOT NULL THEN 'en_curso'
               ELSE 'pendiente' END AS estado
        FROM cleaning_sessions cs
        LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
        WHERE cs.empresa_id = \${empresa_id}::uuid
          AND cs.session_date = \${hoy}::date
        ORDER BY cs.hora_checkout NULLS LAST
      \`)
      send({ type: 'init', sesiones })

      // Poll cada 15 segundos
      let prev = JSON.stringify(sesiones)
      const interval = setInterval(async () => {
        try {
          const actual = await prisma.$queryRaw<any[]>(Prisma.sql\`
            SELECT cs.id::text, cs.property_name,
              cs.started_at, cs.completed_at,
              cs.hora_checkout::text AS hora_checkout,
              l.nombre AS limpiadora_nombre,
              CASE WHEN cs.completed_at IS NOT NULL THEN 'completada'
                   WHEN cs.started_at   IS NOT NULL THEN 'en_curso'
                   ELSE 'pendiente' END AS estado
            FROM cleaning_sessions cs
            LEFT JOIN limpiadoras l ON l.id = cs.limpiadora_id
            WHERE cs.empresa_id = \${empresa_id}::uuid
              AND cs.session_date = \${hoy}::date
            ORDER BY cs.hora_checkout NULLS LAST
          \`)
          const current = JSON.stringify(actual)
          if (current !== prev) {
            send({ type: 'update', sesiones: actual })
            prev = current
          } else {
            send({ type: 'ping', ts: Date.now() })
          }
        } catch { clearInterval(interval); controller.close() }
      }, 15000)

      // Limpiar al cerrar
      req.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    }
  })
}
