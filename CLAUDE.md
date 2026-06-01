# CLAUDE.md — IALIMP

Lee este archivo al empezar cualquier sesión. Son las reglas para trabajar en este repo **sin romper nada**.

## Qué es
IALIMP: SaaS **multi-tenant** de gestión de limpiezas de pisos turísticos (spin-off del módulo de limpieza de SIVRA). Flujo: salida de huésped (Smoobu) → sesión de limpieza → asignación a limpiadora → app móvil de la limpiadora (checklist + fotos) → facturación al propietario.
- App: `ialimp.vercel.app` · Landing del SaaS: `ialimp.es`.
- White-label por host: `siquebrilla.vercel.app` muestra "Sique Brilla"; `ialimp.vercel.app` muestra "ialimp" (misma app, según `hostname`).
- Cliente piloto: Sique Brilla SL (dueña: Vanessa Cruz).

## Fronteras (no mezclar)
Este repo es **solo IALIMP** (limpieza). No confundir con:
- **SIVRA** = intranet de gestión de los 4 pisos (finanzas, pricing, mensajes).
- **House Sevillana** = landing de marketing de un piso.
- **ia.rest** = hostelería/TPV, OTRA base de datos. Sin relación.

## Stack
Next.js `^15.5` · React 19 · Prisma `^5.22` · **JWT (jose + bcryptjs, SIN NextAuth)** · next-intl · zod · date-fns · recharts · nodemailer · pdf-parse · web-push.
- Cookie de sesión: `ialimp_session`. (NextAuth es exclusivo de SIVRA; aquí NO se usa.)
- `next.config.ts`: `ignoreBuildErrors` + `ignoreDuringBuilds` = `true`. **OJO:** esto ignora errores de TypeScript y de lint, pero **NO** los errores de sintaxis reales (un JSX mal cerrado sí rompe el build).
- Build: `prisma generate && next build` · Install: `npm install --legacy-peer-deps`.
- Commits/PR: prefijo **`fix:`** o **`feat:`**. Vercel ignora los que empiezan por `chore|trigger|rebuild`.

## Multi-tenant (CRÍTICO — frontera de seguridad)
- **Scoping por `empresa_id` en TODA query y route.** Nunca consultes ni asignes datos sin filtrar por empresa. Una fuga entre empresas es un fallo grave de RGPD.
- Middleware: 401 a `/api/*` no público sin cookie `ialimp_session`. Eximidos: `/api/auth`, `/api/pms`, `/api/leads`, `/api/propietario`, `/api/cotizador`, `/api/catastro`, `/l`, `/api/l`.
- Crons y llamadas servidor→servidor a `/api/admin/*` DEBEN enviar `Authorization: Bearer CRON_SECRET`, o devuelven **401 silencioso**.

## Diseño (FIJO — nunca cambiar ni mezclar paletas)
- **IALIMP:** header/botones `#4f46e5` · marca `#6366f1` · suaves `#eef2ff` · texto `#1e1b4b` · fondo `#f1f5f9`. **Tema CLARO siempre** (nunca fondos oscuros). Tipografía **NUNITO en todo** (800/900 en títulos y logo, 400-600 en cuerpo). Logo: "ia" indigo + "limp" oscuro.
- **Sique Brilla** (white-label, producto SEPARADO): negro `#0a0805` + dorado `#d4a017`. **Nunca mezclar las dos paletas.**
- Verdes/rojos = solo estado (ok/error).

## Base de datos (Supabase `wswbehlcuxqxyinousql`, COMPARTIDA con SIVRA)
- `$queryRaw` **SIEMPRE** con `Prisma.sql` (nunca interpolar strings).
- `schema.prisma` solo declara `empresas` y `pms_connections`; el resto de tablas (`limpiadoras`, `cleaning_sessions`, `clientes`, `propiedades`, `facturas_*`, etc.) se gestionan por **SQL crudo**.
- `cliente` = entidad facturable (`tipo_persona` ∈ particular/autonomo/empresa); datos fiscales en `clientes`. `cliente_contactos`: N por cliente, `principal` exclusivo. Las columnas jsonb `telefonos`/`emails` fueron ELIMINADAS.
- `facturas_clientes` congela el destinatario (`dest_*`) para VeriFactu; `iva_importe` / `total` / `lineas.importe` son **GENERATED**.
- Coste de limpieza en contabilidad = **facturas emitidas** (`factura_lineas.propiedad_id`), NO `cleaning_sessions` (evita doble conteo).
- Solo los 4 pisos de Alberto sincronizan Smoobu; externos = alta manual (`origen='manual'`, `external_reservation_id` UNIQUE, `limpiadora_id` NULL).
- Storage: buckets `cleaning-photos` (TTL 5 días), `propuestas-leads`, `cvs-rrhh`.
- **Deuda conocida:** `cleaning_sessions.property_id` convive en 2 formatos (slug `prop_*` y UUID) para los mismos pisos → al consultar, normaliza con `COALESCE(NULLIF(propiedad_id,''), property_id)`.

## IA (solo NVIDIA NIM, free tier)
- Todo vía `lib/ai-client.ts`. `aiComplete()` = llama-3.3-70b · `aiExtractInvoice()` = llama-3.2-90b-vision.
- `@anthropic-ai/sdk` está **ELIMINADO**. Cualquier feature de IA nueva usa `aiComplete()`.
- Agentes ya existentes (no duplicar): auto-asignación, calidad-fotos, informes (día 1), cotizador, clasificar-queja, escáner de documentos, briefing-diario, comparar-foto, selección de CVs (RRHH).

## Smoobu
Customer `127993947`, header `Api-Key` (no Bearer). READ: reservations/messages/rates/custom-placeholders. WRITE: solo `POST /api/rates`. 403 en apartments/guests/etc.

## Asignación de limpiezas
- Disponibilidad por turnos (`limpiadora_disponibilidad` + `turno`: mañana 08-14 / tarde 14-20 / completo 08-20). **Sin disponibilidad marcada → NO se asigna.**
- Auto-asignación real: `GET /api/admin/auto-assign`, solo toca sesiones de hoy+mañana con `limpiadora_id` NULL (lo ya asignado no se mueve). Crons 5:30 y 16:00 (hora España). El scoring actual prioriza `conoce_propiedad` y desempata por carga (pendiente de mejora).

## Regla del manual
Todo cambio de UI o de funcionalidad va **también** a `public/manual.html` + re-deploy.

## VeriFactu
`lib/verifactu.ts` (SHA-256 + XML SOAP AEAT), campos `vf_*`. Sique Brilla SL: obligatorio desde ene-2027.

## Cómo mantener este archivo
Si cambia una convención, una regla de datos o una decisión de arquitectura, **actualiza este `CLAUDE.md` en el mismo PR**. Es la fuente de verdad para trabajar el código de este repo.

> Sin credenciales: tokens, contraseñas y API keys van SIEMPRE en variables de entorno de Vercel, **nunca** en este archivo ni en el repo.
