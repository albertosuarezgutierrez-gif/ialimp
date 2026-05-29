import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { serialize } from '@/lib/serialize'
import { requireEmpresaId, isOwner, isSuperadmin } from '@/lib/tenant'
import { hashPassword, createUsuarioToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET() {
  try {
    const empresa_id = await requireEmpresaId()
    const usuarios = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, nombre, email, rol, modulos, activo, ultimo_acceso, created_at
      FROM usuarios_empresa
      WHERE empresa_id = ${empresa_id}::uuid
      ORDER BY created_at DESC
    `)
    return NextResponse.json(serialize({ usuarios }))
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    if (!await isOwner() && !await isSuperadmin()) {
      return NextResponse.json({ error: 'Solo la dueña puede crear usuarios' }, { status: 403 })
    }
    const { nombre, email, password, rol = 'admin', modulos = [] } = await req.json()
    if (!nombre?.trim() || !email?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Nombre, email y contraseña son obligatorios' }, { status: 400 })
    }

    const hash = await hashPassword(password)
    const result = await prisma.$queryRaw<any[]>(Prisma.sql`
      INSERT INTO usuarios_empresa (empresa_id, nombre, email, password_hash, rol, modulos)
      VALUES (${empresa_id}::uuid, ${nombre.trim()}, ${email.toLowerCase().trim()},
              ${hash}, ${rol}, ${modulos})
      RETURNING id, nombre, email, rol, modulos, activo, created_at
    `)
    return NextResponse.json(serialize({ ok: true, usuario: result[0] }), { status: 201 })
  } catch (e: any) {
    if (e.message.includes('unique')) return NextResponse.json({ error: 'Email ya en uso' }, { status: 409 })
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    if (!await isOwner() && !await isSuperadmin()) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }
    const { id, nombre, modulos, rol, activo, password } = await req.json()
    if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 })

    if (password) {
      const hash = await hashPassword(password)
      await prisma.$executeRaw(Prisma.sql`
        UPDATE usuarios_empresa SET password_hash = ${hash}, updated_at = now()
        WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
      `)
    }

    await prisma.$executeRaw(Prisma.sql`
      UPDATE usuarios_empresa
      SET nombre = ${nombre}, modulos = ${modulos}, rol = ${rol},
          activo = ${activo ?? true}, updated_at = now()
      WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const empresa_id = await requireEmpresaId()
    if (!await isOwner() && !await isSuperadmin()) {
      return NextResponse.json({ error: 'Sin permiso' }, { status: 403 })
    }
    const { id } = await req.json()
    await prisma.$executeRaw(Prisma.sql`
      DELETE FROM usuarios_empresa WHERE id = ${id}::uuid AND empresa_id = ${empresa_id}::uuid
    `)
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
