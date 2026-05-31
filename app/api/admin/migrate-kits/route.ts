import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function GET() {
  const results: string[] = []
  try {

    // 1. kits_limpiadoras
    await prisma.$executeRaw(Prisma.sql`
      CREATE TABLE IF NOT EXISTS kits_limpiadoras (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id       UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        limpiadora_id    UUID        NOT NULL REFERENCES limpiadoras(id) ON DELETE CASCADE,
        producto_id      UUID        NOT NULL REFERENCES productos_stock(id) ON DELETE RESTRICT,
        cantidad_inicial NUMERIC(10,3) NOT NULL DEFAULT 1,
        nivel_actual     NUMERIC(5,2),
        nivel_foto_url   TEXT,
        nivel_fecha      TIMESTAMPTZ,
        sesiones_desde_repo INTEGER NOT NULL DEFAULT 0,
        activo           BOOLEAN NOT NULL DEFAULT true,
        notas            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    results.push('kits_limpiadoras: OK')

    // 2. Unique index on kits
    try {
      await prisma.$executeRaw(Prisma.sql`
        CREATE UNIQUE INDEX IF NOT EXISTS uq_kit_limp_prod_activo
        ON kits_limpiadoras (limpiadora_id, producto_id)
        WHERE activo = true
      `)
      results.push('kits unique idx: OK')
    } catch { results.push('kits unique idx: skipped') }

    // 3. reposiciones
    await prisma.$executeRaw(Prisma.sql`
      CREATE TABLE IF NOT EXISTS reposiciones (
        id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        empresa_id       UUID        NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
        kit_id           UUID        NOT NULL REFERENCES kits_limpiadoras(id) ON DELETE CASCADE,
        limpiadora_id    UUID        NOT NULL REFERENCES limpiadoras(id) ON DELETE CASCADE,
        producto_id      UUID        NOT NULL REFERENCES productos_stock(id) ON DELETE RESTRICT,
        cantidad         NUMERIC(10,3) NOT NULL,
        sesiones_previas INTEGER NOT NULL DEFAULT 0,
        coste_unitario   NUMERIC(10,2),
        notas            TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `)
    results.push('reposiciones: OK')

    // 4. Indexes
    await prisma.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_kits_empresa    ON kits_limpiadoras(empresa_id)`)
    await prisma.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_kits_limpiadora ON kits_limpiadoras(limpiadora_id)`)
    await prisma.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_repos_empresa    ON reposiciones(empresa_id)`)
    await prisma.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_repos_limpiadora ON reposiciones(limpiadora_id)`)
    await prisma.$executeRaw(Prisma.sql`CREATE INDEX IF NOT EXISTS idx_repos_producto   ON reposiciones(producto_id)`)
    results.push('indexes: OK')

    // 5. RLS
    try {
      await prisma.$executeRaw(Prisma.sql`ALTER TABLE kits_limpiadoras ENABLE ROW LEVEL SECURITY`)
      await prisma.$executeRaw(Prisma.sql`
        CREATE POLICY kits_empresa ON kits_limpiadoras
        USING (empresa_id::text = current_setting('app.empresa_id', true))
      `)
      await prisma.$executeRaw(Prisma.sql`ALTER TABLE reposiciones ENABLE ROW LEVEL SECURITY`)
      await prisma.$executeRaw(Prisma.sql`
        CREATE POLICY repos_empresa ON reposiciones
        USING (empresa_id::text = current_setting('app.empresa_id', true))
      `)
      results.push('RLS: OK')
    } catch (e: any) { results.push('RLS: ' + e.message.slice(0,60)) }

    // 6. View consumo medio
    await prisma.$executeRaw(Prisma.sql`
      CREATE OR REPLACE VIEW v_consumo_medio_producto AS
      SELECT
        r.empresa_id,
        r.producto_id,
        ps.nombre                      AS producto_nombre,
        ps.unidad,
        COUNT(r.id)                    AS num_reposiciones,
        AVG(r.sesiones_previas)        AS media_sesiones_por_bote,
        AVG(r.cantidad)                AS cantidad_media_repuesta,
        AVG(
          CASE WHEN r.sesiones_previas > 0 AND r.coste_unitario IS NOT NULL
          THEN ROUND((r.cantidad * r.coste_unitario) / r.sesiones_previas, 4)
          END
        )                              AS coste_medio_por_sesion,
        MIN(r.created_at)              AS primera_reposicion,
        MAX(r.created_at)              AS ultima_reposicion
      FROM reposiciones r
      JOIN productos_stock ps ON ps.id = r.producto_id
      GROUP BY r.empresa_id, r.producto_id, ps.nombre, ps.unidad
    `)
    results.push('view v_consumo_medio: OK')

    return NextResponse.json({ ok: true, results })
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message, results }, { status: 500 })
  }
}
