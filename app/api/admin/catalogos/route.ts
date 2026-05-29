import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { requireEmpresaId } from '@/lib/tenant'
import { serialize } from '@/lib/serialize'

// Catálogos configurables por empresa
// Todos viven en cotizador_config como columnas JSONB
// GET  → devuelve todos los catálogos
// PATCH → actualiza uno o varios catálogos

const DEFAULTS = {
  tipos_servicio_op: [
    { id: 'rotacion',      label: 'Rotación',     emoji: '🔄', desc: 'Entre huéspedes',    activo: true },
    { id: 'profunda',      label: 'Profunda',      emoji: '🧽', desc: 'Limpieza a fondo',   activo: true },
    { id: 'comunidad',     label: 'Comunidad',     emoji: '🏢', desc: 'Zonas comunes',      activo: true },
    { id: 'obra',          label: 'Final obra',    emoji: '🏗️', desc: 'Post-construcción', activo: true },
    { id: 'mantenimiento', label: 'Mantenimiento', emoji: '🔧', desc: 'Revisión y orden',  activo: true },
    { id: 'particular',    label: 'Particular',    emoji: '🏡', desc: 'Casa o piso',        activo: true },
    { id: 'oficina',       label: 'Oficina',       emoji: '💼', desc: 'Local o empresa',   activo: true },
  ],
  categorias_stock: [
    { id: 'limpieza',    label: 'Limpieza',    emoji: '🧴', activo: true },
    { id: 'lenceria',    label: 'Lencería',    emoji: '🛏️', activo: true },
    { id: 'consumible',  label: 'Consumible',  emoji: '🧻', activo: true },
    { id: 'herramienta', label: 'Herramienta', emoji: '🧹', activo: true },
  ],
  unidades_stock: [
    { id: 'unidad', label: 'Unidad' },
    { id: 'kg',     label: 'Kg'     },
    { id: 'litro',  label: 'Litro'  },
    { id: 'rollo',  label: 'Rollo'  },
    { id: 'pack',   label: 'Pack'   },
    { id: 'caja',   label: 'Caja'   },
    { id: 'par',    label: 'Par'    },
  ],
  tipos_lenceria: [
    { id: 'sabanas_dobles',       label: 'Sábanas dobles',       emoji: '🛏️', activo: true },
    { id: 'sabanas_individuales', label: 'Sábanas individuales', emoji: '🛏️', activo: true },
    { id: 'fundas',               label: 'Fundas nórdicas',      emoji: '🛏️', activo: true },
    { id: 'toallas_bano',         label: 'Toallas de baño',      emoji: '🛁', activo: true },
    { id: 'toallas_mano',         label: 'Toallas de mano',      emoji: '🤝', activo: true },
    { id: 'toallas_piscina',      label: 'Toallas piscina',      emoji: '🏊', activo: true },
  ],
  tipos_cliente: [
    { id: 'apartamentos_turisticos', label: 'Aptos. turísticos', emoji: '🏠', color: '#6366f1', activo: true },
    { id: 'particular',              label: 'Casa particular',   emoji: '🏡', color: '#ec4899', activo: true },
    { id: 'comunidad',               label: 'Comunidad',         emoji: '🏢', color: '#0ea5e9', activo: true },
    { id: 'empresa',                 label: 'Empresa',           emoji: '💼', color: '#f59e0b', activo: true },
    { id: 'oficina',                 label: 'Oficina',           emoji: '🖥️', color: '#8b5cf6', activo: true },
    { id: 'hotel',                   label: 'Hotel',             emoji: '🏨', color: '#10b981', activo: true },
    { id: 'otro',                    label: 'Otro',              emoji: '📋', color: '#64748b', activo: true },
  ],
  categorias_incidencia: [
    { id: 'limpieza',      label: 'Limpieza',         emoji: '🧹', activo: true },
    { id: 'mantenimiento', label: 'Mantenimiento',    emoji: '🔧', activo: true },
    { id: 'material',      label: 'Material / Stock', emoji: '📦', activo: true },
    { id: 'acceso',        label: 'Acceso / Llaves',  emoji: '🔑', activo: true },
    { id: 'huesped',       label: 'Huésped',          emoji: '👤', activo: true },
    { id: 'otro',          label: 'Otro',             emoji: '❓', activo: true },
  ],
  niveles_urgencia: [
    { id: 'normal',  label: 'Normal',  color: '#64748b', activo: true },
    { id: 'urgente', label: 'Urgente', color: '#dc2626', activo: true },
  ],
  estados_lead: [
    { id: 'nuevo',             label: 'Nuevo',             color: '#6366f1', activo: true },
    { id: 'contactado',        label: 'Contactado',        color: '#d97706', activo: true },
    { id: 'propuesta_enviada', label: 'Propuesta enviada', color: '#7c3aed', activo: true },
    { id: 'presupuestado',     label: 'Presupuestado',     color: '#0891b2', activo: true },
    { id: 'ganado',            label: 'Ganado ✅',          color: '#16a34a', activo: true },
    { id: 'perdido',           label: 'Perdido',           color: '#dc2626', activo: true },
  ],
  tipos_expediente_rrhh: [
    { id: 'amonestacion', label: 'Amonestación', emoji: '⚠️', activo: true },
    { id: 'sancion',      label: 'Sanción',       emoji: '🔴', activo: true },
    { id: 'felicitacion', label: 'Felicitación',  emoji: '⭐', activo: true },
    { id: 'formacion',    label: 'Formación',     emoji: '📚', activo: true },
    { id: 'baja',         label: 'Baja médica',   emoji: '🏥', activo: true },
    { id: 'otro',         label: 'Otro',          emoji: '📋', activo: true },
  ],
}

export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const rows = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT tipos_servicio_op, categorias_stock, unidades_stock, tipos_lenceria,
             tipos_cliente, categorias_incidencia, niveles_urgencia, estados_lead, tipos_expediente_rrhh
      FROM cotizador_config
      WHERE empresa_id = ${empresa_id}::uuid
      LIMIT 1
    `)

    if (!rows.length || !rows[0].tipos_servicio_op?.length) {
      // Primera vez: crear/rellenar con defaults
      await prisma.$executeRaw(Prisma.sql`
        INSERT INTO cotizador_config (empresa_id,
          tipos_servicio_op, categorias_stock, unidades_stock, tipos_lenceria,
          tipos_cliente, categorias_incidencia, niveles_urgencia, estados_lead, tipos_expediente_rrhh)
        VALUES (${empresa_id}::uuid,
          ${JSON.stringify(DEFAULTS.tipos_servicio_op)}::jsonb,
          ${JSON.stringify(DEFAULTS.categorias_stock)}::jsonb,
          ${JSON.stringify(DEFAULTS.unidades_stock)}::jsonb,
          ${JSON.stringify(DEFAULTS.tipos_lenceria)}::jsonb,
          ${JSON.stringify(DEFAULTS.tipos_cliente)}::jsonb,
          ${JSON.stringify(DEFAULTS.categorias_incidencia)}::jsonb,
          ${JSON.stringify(DEFAULTS.niveles_urgencia)}::jsonb,
          ${JSON.stringify(DEFAULTS.estados_lead)}::jsonb,
          ${JSON.stringify(DEFAULTS.tipos_expediente_rrhh)}::jsonb
        )
        ON CONFLICT (empresa_id) DO UPDATE SET
          tipos_servicio_op     = COALESCE(NULLIF(cotizador_config.tipos_servicio_op, '[]'::jsonb), EXCLUDED.tipos_servicio_op),
          categorias_stock      = COALESCE(NULLIF(cotizador_config.categorias_stock, '[]'::jsonb),  EXCLUDED.categorias_stock),
          unidades_stock        = COALESCE(NULLIF(cotizador_config.unidades_stock, '[]'::jsonb),    EXCLUDED.unidades_stock),
          tipos_lenceria        = COALESCE(NULLIF(cotizador_config.tipos_lenceria, '[]'::jsonb),    EXCLUDED.tipos_lenceria),
          tipos_cliente         = COALESCE(NULLIF(cotizador_config.tipos_cliente, '[]'::jsonb),     EXCLUDED.tipos_cliente),
          categorias_incidencia = COALESCE(NULLIF(cotizador_config.categorias_incidencia, '[]'::jsonb), EXCLUDED.categorias_incidencia),
          niveles_urgencia      = COALESCE(NULLIF(cotizador_config.niveles_urgencia, '[]'::jsonb),  EXCLUDED.niveles_urgencia),
          estados_lead          = COALESCE(NULLIF(cotizador_config.estados_lead, '[]'::jsonb),      EXCLUDED.estados_lead),
          tipos_expediente_rrhh = COALESCE(NULLIF(cotizador_config.tipos_expediente_rrhh, '[]'::jsonb), EXCLUDED.tipos_expediente_rrhh)
      `)
      return NextResponse.json(serialize({ catalogos: DEFAULTS }))
    }

    return NextResponse.json(serialize({ catalogos: rows[0] }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    const body = await req.json()

    const allowed = [
      'tipos_servicio_op', 'categorias_stock', 'unidades_stock', 'tipos_lenceria',
      'tipos_cliente', 'categorias_incidencia', 'niveles_urgencia', 'estados_lead', 'tipos_expediente_rrhh'
    ]

    // Construir SET dinámico solo con los campos enviados
    const updates: string[] = []
    const values: any = {}
    for (const key of allowed) {
      if (body[key] !== undefined) {
        updates.push(key)
        values[key] = body[key]
      }
    }

    if (!updates.length) {
      return NextResponse.json({ error: 'No hay campos válidos para actualizar' }, { status: 400 })
    }

    // Upsert con los campos enviados
    await prisma.$executeRaw(Prisma.sql`
      INSERT INTO cotizador_config (empresa_id, ${Prisma.raw(updates.join(', '))})
      VALUES (${empresa_id}::uuid, ${Prisma.raw(updates.map(k => `'${JSON.stringify(values[k])}'::jsonb`).join(', '))})
      ON CONFLICT (empresa_id) DO UPDATE SET
        ${Prisma.raw(updates.map(k => `${k} = '${JSON.stringify(values[k])}'::jsonb`).join(', '))},
        updated_at = now()
    `)

    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
