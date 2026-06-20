import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { serialize } from '@/lib/serialize'
import { requireEmpresaId } from '@/lib/tenant'

/**
 * GET /api/admin/equipo
 *
 * Listado UNIFICADO de personas del equipo (panel + App /l).
 *
 * Combina dos tablas que hoy se muestran en pestañas separadas:
 *   - usuarios_empresa  → usuarios de panel (admin / supervisor), pueden estar
 *                          vinculados a una limpiadora vía limpiadora_id.
 *   - limpiadoras       → personal operativo (App /l con PIN).
 *
 * Deduplica por usuarios_empresa.limpiadora_id: una persona que es panel + app
 * aparece UNA sola vez. Las limpiadoras "sueltas" (sin usuario de panel) — que
 * hoy no aparecen en la pestaña Accesos porque esta solo lee usuarios_empresa —
 * se incluyen aquí.
 *
 * Lectura puramente aditiva: NO modifica ninguna tabla, NO reemplaza endpoints
 * existentes (/api/admin/limpiadoras y /api/admin/usuarios-empresa siguen igual).
 */
export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()

    // 1) Usuarios de panel (con su limpiadora vinculada, si la tienen)
    const usuarios = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT ue.id::text                                       AS id,
             ue.nombre,
             ue.email,
             ue.rol,
             ue.modulos,
             ue.activo,
             ue.ultimo_acceso,
             ue.limpiadora_id::text                            AS limpiadora_id,
             l.color                                           AS color,
             (l.id IS NOT NULL OR 'limpiadora' = ANY(ue.modulos)) AS tiene_app_l
      FROM usuarios_empresa ue
      LEFT JOIN limpiadoras l ON l.id = ue.limpiadora_id
      WHERE ue.empresa_id = ${empresa_id}::uuid
      ORDER BY ue.created_at DESC
    `)

    // 2) Limpiadoras NO vinculadas a ningún usuario de panel (solo App /l)
    const limpiadoras = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT l.id::text   AS id,
             l.nombre,
             l.telefono,
             l.color,
             l.activa      AS activo
      FROM limpiadoras l
      WHERE l.empresa_id = ${empresa_id}::uuid
        AND NOT EXISTS (
          SELECT 1 FROM usuarios_empresa ue
          WHERE ue.limpiadora_id = l.id
            AND ue.empresa_id = ${empresa_id}::uuid
        )
      ORDER BY l.activa DESC, l.nombre
    `)

    const personas = [
      ...usuarios.map((u) => ({
        id:            u.id,
        nombre:        u.nombre,
        email:         u.email ?? null,
        telefono:      null as string | null,
        rol:           u.rol,                 // owner | admin | supervisor
        modulos:       u.modulos ?? [],
        activo:        u.activo,
        color:         u.color ?? null,
        limpiadora_id: u.limpiadora_id ?? null,
        tiene_panel:   true,
        tiene_app_l:   !!u.tiene_app_l,
        ultimo_acceso: u.ultimo_acceso ?? null,
        origen:        'usuario' as const,
      })),
      ...limpiadoras.map((l) => ({
        id:            l.id,
        nombre:        l.nombre,
        email:         null as string | null,
        telefono:      l.telefono ?? null,
        rol:           'limpiadora',
        modulos:       ['limpiadora'],
        activo:        l.activo,
        color:         l.color ?? null,
        limpiadora_id: l.id,
        tiene_panel:   false,
        tiene_app_l:   true,
        ultimo_acceso: null,
        origen:        'limpiadora' as const,
      })),
    ]

    // Activos primero, luego alfabético
    personas.sort(
      (a, b) =>
        (a.activo === b.activo ? 0 : a.activo ? -1 : 1) ||
        String(a.nombre).localeCompare(String(b.nombre), 'es'),
    )

    const counts = {
      total:       personas.length,
      panel:       personas.filter((p) => p.tiene_panel).length,
      app:         personas.filter((p) => p.tiene_app_l).length,
      limpiadoras: personas.filter((p) => p.rol === 'limpiadora' || p.tiene_app_l).length,
      gestion:     personas.filter((p) => p.tiene_panel).length,
    }

    return NextResponse.json(serialize({ personas, counts }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
