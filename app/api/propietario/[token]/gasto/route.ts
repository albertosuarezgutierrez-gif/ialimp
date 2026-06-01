import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

async function getCliente(token: string) {
  const r = await prisma.$queryRaw<{ id: string; empresa_id: string }[]>(Prisma.sql`
    SELECT id, empresa_id FROM clientes WHERE access_token = ${token} LIMIT 1`);
  return r[0] || null;
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cli = await getCliente(token);
  if (!cli) return NextResponse.json({ error: 'Token no válido' }, { status: 401 });

  const b = await req.json();
  const base = Number(b.base_imponible) || 0;
  const ivaPct = b.porcentaje_iva == null ? 21 : Number(b.porcentaje_iva);
  if (base <= 0) return NextResponse.json({ error: 'La base debe ser mayor que 0' }, { status: 400 });

  const cuota = Math.round(base * ivaPct) / 100;
  const total = Math.round((base + cuota) * 100) / 100;
  const fecha = b.fecha_doc || new Date().toISOString().slice(0, 10);

  const ins = await prisma.$queryRaw<{ id: string }[]>(Prisma.sql`
    INSERT INTO documentos_contables
      (empresa_id, cliente_id, ambito, tipo_doc, proveedor, fecha_doc,
       base_imponible, porcentaje_iva, cuota_iva, total, categoria, descripcion, pagado)
    VALUES (${cli.empresa_id}::uuid, ${cli.id}::uuid, 'propietario', 'gasto',
       ${b.proveedor || null}, ${fecha}::date,
       ${base}, ${ivaPct}, ${cuota}, ${total},
       ${b.categoria || 'otros'}, ${b.descripcion || null}, ${b.pagado === true})
    RETURNING id`);

  return NextResponse.json({ ok: true, id: ins[0].id, total });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const cli = await getCliente(token);
  if (!cli) return NextResponse.json({ error: 'Token no válido' }, { status: 401 });

  const items = await prisma.$queryRaw<any[]>(Prisma.sql`
    SELECT id, fecha_doc, proveedor, categoria, base_imponible, cuota_iva, total, pagado
    FROM documentos_contables
    WHERE cliente_id = ${cli.id}::uuid AND ambito = 'propietario' AND activo IS TRUE
    ORDER BY fecha_doc DESC NULLS LAST, created_at DESC LIMIT 100`);

  const totalGastos = items.reduce((a, x) => a + (Number(x.total) || 0), 0);
  return NextResponse.json({ items, total_gastos: totalGastos });
}
