# CLAUDE.md — IALIMP

Lee este archivo al empezar cualquier sesión. Son las reglas para trabajar en este repo **sin romper nada**. Es la fuente de verdad: si algo cambia, actualízalo en el mismo PR (ver §final).

## Qué es
IALIMP: SaaS **multi-tenant** de gestión de limpiezas de pisos turísticos (spin-off del módulo de limpieza de SIVRA). Flujo: salida de huésped (Smoobu) → sesión de limpieza → asignación a limpiadora → app móvil de la limpiadora (checklist + fotos) → facturación al propietario → contabilidad.
- App: `ialimp.vercel.app` · Landing del SaaS: `ialimp.es`.
- White-label por host: `siquebrilla.vercel.app` / `sique-brilla.vercel.app` muestran "Sique Brilla"; `ialimp.vercel.app` muestra "ialimp" (misma app y misma base, según `hostname`).
- Cliente piloto: **Sique Brilla SL** (dueña: Vanessa Cruz). Vanessa opera TODA la cartera (hotel VAC + los 4 pisos de Alberto + el resto de propietarios). **Alberto es un cliente más** dentro de esa empresa; el motor debe razonar sobre el portfolio completo de ella.

## Fronteras (no mezclar)
Este repo es **solo IALIMP** (limpieza). No confundir con:
- **SIVRA** = intranet de gestión de los 4 pisos de Alberto (finanzas, pricing, mensajes). Comparte la misma DB Supabase.
- **House Sevillana** = landing de marketing de UN piso (`housesevillana.es`).
- **ia.rest** = hostelería/TPV, OTRA base de datos (`efncqyvhniaxsirhdxaa`). Sin relación.

## Stack
Next.js `^15.5` · React 19 · Prisma `^5.22` · **JWT (jose + bcryptjs, SIN NextAuth)** · next-intl · zod · date-fns · recharts · nodemailer · pdf-parse · web-push (VAPID) · Stripe.
- Cookie de sesión: `ialimp_session`. (NextAuth es exclusivo de SIVRA; aquí NO se usa.)
- `next.config.ts`: `ignoreBuildErrors` + `ignoreDuringBuilds` = `true`. **OJO:** ignora errores de TypeScript y de lint, pero **NO** los errores de sintaxis reales (un JSX mal cerrado sí rompe el build).
- Build: `prisma generate && next build` · Install: `npm install --legacy-peer-deps`.
- Commits/PR: prefijo **`fix:`** o **`feat:`**. Vercel ignora los que empiezan por `chore|trigger|rebuild`.
- `lib/`: `auth.ts` (JWT/cookie), `tenant.ts` (`requireEmpresaId()` — empresa SIEMPRE del lado servidor), `prisma.ts`, `ai-client.ts`, `clientes.ts`, `serialize.ts`, `verifactu.ts`.

## Multi-tenant y roles (CRÍTICO — frontera de seguridad)
- **Scoping por `empresa_id` en TODA query y route**, vía `requireEmpresaId()` (nunca confíes en un `empresa_id` del input/cliente). Una fuga entre empresas es un fallo grave de RGPD.
- **Roles** (en el JWT como `payload.rol`): `superadmin` (acceso a todo, gestiona empresas en `/superadmin`), `owner` (todo lo de SU empresa) y usuario de empresa (acceso limitado por `payload.modulos[]`).
- **Middleware (`middleware.ts`):** 401/redirect sin cookie válida. Rutas públicas eximidas (prefijo): `/api/auth`, `/api/pms/sync`, `/api/empresas/register`, `/api/leads`, `/api/propietario`, `/propietario`, `/api/superadmin/login`, `/superadmin`, `/api/cotizador`, `/api/catastro`. La app de limpiadora (`/l`, `/api/l`) va por su propio login (PIN). `/superadmin*` exige `rol=superadmin`.
- **Gating por módulo** (`MODULO_MAP` en middleware): a un usuario de empresa con `modulos[]` se le bloquea (403 en API, redirect en UI) el módulo que no tenga. Módulos: `clientes`, `rrhh`, `stock`, `lenceria`, `facturacion`, `informes`, `configuracion`, etc. `owner`/`superadmin` saltan el gating.
- Crons y llamadas servidor→servidor a `/api/admin/*` DEBEN enviar `Authorization: Bearer CRON_SECRET`, o devuelven **401 silencioso** (gotcha histórico: `comparar-foto` no se ejecutaba en prod por esto).

## Diseño (FIJO — nunca cambiar ni mezclar paletas)
- **IALIMP:** header/botones `#4f46e5` · marca `#6366f1` · suaves `#eef2ff` · texto `#1e1b4b` · fondo `#f1f5f9`. **Tema CLARO siempre** (nunca fondos oscuros). Tipografía **NUNITO en todo** (800/900 en títulos y logo, 400-600 en cuerpo). Logo: "ia" indigo + "limp" oscuro (`components/LogoIalimp.tsx`).
- **Sique Brilla** (white-label, producto SEPARADO): negro `#0a0805` + dorado `#d4a017`. **Nunca mezclar las dos paletas.**
- Verdes/rojos = solo estado (ok/error).

## Base de datos (Supabase `wswbehlcuxqxyinousql`, COMPARTIDA con SIVRA)
- `$queryRaw` **SIEMPRE** con `Prisma.sql` (nunca interpolar strings). Los **casts van en el SQL** (`${v}::uuid`, `${v}::date`), **nunca concatenados al valor del parámetro** (`${v + '::uuid'}` manda el texto `"…::uuid"` y rompe con `42804 COALESCE types text and uuid cannot be matched`). Castea `::int`/`::float8` en agregados para evitar errores BigInt.
- `schema.prisma` solo declara `empresas` y `pms_connections`; el resto de tablas (`limpiadoras`, `cleaning_sessions`, `clientes`, `propiedades`, `facturas_*`, contabilidad, stock, etc.) se gestionan por **SQL crudo**.
- **Vistas SQL** que usa el código (no son tablas): `carga_limpiadora` (limpiezas+minutos por limpiadora/día) y `agenda_dia` (sesiones con propiedad, fecha, hora_checkout, limpiadora). Las consume el asistente y la previsión.
- `cliente` = entidad facturable (`tipo_persona` ∈ particular/autonomo/empresa); datos fiscales en `clientes`. `cliente_contactos`: N por cliente, `principal` exclusivo. Las columnas jsonb `telefonos`/`emails` fueron ELIMINADAS.
- `facturas_clientes` congela el destinatario (`dest_*`) para VeriFactu; `iva_importe` / `total` / `lineas.importe` son **GENERATED** (no escribir a mano).
- Coste de limpieza en contabilidad = **facturas emitidas** (`factura_lineas.propiedad_id`), NO `cleaning_sessions` (evita doble conteo).
- Solo los 4 pisos de Alberto sincronizan Smoobu; externos = alta manual (`origen='manual'`, `external_reservation_id` UNIQUE, `limpiadora_id` NULL).
- Storage: buckets `cleaning-photos` (TTL 5 días), `propuestas-leads`, `cvs-rrhh`.
- **Deuda conocida:** `cleaning_sessions.property_id` (text legacy) convive con `propiedad_id` (uuid) en 2 formatos (slug `prop_*` y UUID) para los mismos pisos → al consultar, normaliza con `COALESCE(NULLIF(propiedad_id::text,''), property_id::text)` (**ambos a `::text`**: si no, COALESCE peta con `42804` text vs uuid).

## IDs útiles (NO son secretos — evitan errores de query)
- empresa Sique Brilla: `05edacff-ea49-42fe-8997-f9369613a845`.
- **Wendy** (limpiadora) `04caa4dc…` ⚠️ **NO es Vanessa**. **Vanessa** (limpiadora real) `55ee2bd5-e31a-42fe-8b3c-d144cc2b5b95`. No confundir al escribir queries.
- cliente Alberto: `4b189d4d…` · hotel "VAC LUXURY HOMES SPAIN SL": `8331b427-…-d59e4543cfa6` (8 props "HOTEL VAC - Hab 1..8", tipo `habitacion_hotel`).

## IA (solo NVIDIA NIM, free tier)
- Texto vía `lib/ai-client.ts` → `aiComplete()` = `meta/llama-3.3-70b-instruct`. **`@anthropic-ai/sdk` está ELIMINADO**; cualquier feature de texto nueva usa `aiComplete()`.
- **Visión**: NO está en `ai-client.ts` (el viejo `aiExtractInvoice()` ya no existe). Cada endpoint que necesita visión llama inline al modelo `meta/llama-3.2-90b-vision-instruct` (ver `comparar-foto`, `analizar-foto`, `analizar-botes`, `escanear/process`). NIM admite **1 imagen** por llamada.
- Key por env (`NVIDIA_API_KEY`).
- **Agentes existentes (NO duplicar):**
  - **auto-asignación** (scoring determinista, §Asignación).
  - **comparar-foto** (`/api/admin/ia/comparar-foto`): jimp monta foto del item + foto objetivo del protocolo en 1 imagen → visión → `{ coincide, accion }`. Se dispara en `upload-photo` si el item tiene foto objetivo. **Semáforo de apoyo: avisa "revisar", NUNCA bloquea la limpieza.** Ante la duda → revisión manual.
  - **analizar-foto / analizar-botes** (visión: análisis de fotos / lectura de botes de producto para stock).
  - **escáner de documentos** (`escanear/process` + cron `procesar-documentos`): foto/PDF → visión → apunte contable + stock. Prompt endurecido: lee importes **IMPRESOS**, **NO calcula IVA**, cuadra `base+iva=total`. Borrado = soft-delete (`activo`).
  - **briefing-diario** (`/api/admin/ia/briefing`): limpiezas hoy + sin asignar + ausencias + facturación por cobrar.
  - **clasificar-queja** · **cotizador / agente-cotizador** (leads) · **patrones** · **selección de CVs RRHH** · **informes** mensuales (día 1).
  - **asistente** (`/api/admin/asistente`, UI `/admin/asistente`): chat de Vanessa sobre los datos de SU empresa. **Patrón seguro (no relajar):** la IA NO escribe SQL; elige una *intención* de una lista fija (`quien_trabaja`, `carga_semana`, `sin_asignar`, `agenda_dia`, `facturas_cobrar`, `agenda_limpiadora`…) y extrae parámetros; cada intención = consulta pre-escrita scopeada por `empresa_id` (siempre del servidor); la IA solo redacta con los datos devueltos (no inventa).
- **Propuestos (no construidos):** `aiExtractProtocol()` (ingerir fichas de limpieza PDF/Word → pre-rellenar protocolo digital).

## Módulos (UI)
`/dashboard` (Inicio, SSE en vivo) · `/admin/negocio` (Clientes › Propiedades › Protocolos) · `/admin/clientes` (+`[id]`, contactos, config) · `/admin/equipo` (limpiadoras, disponibilidad por turnos, kits) · `/admin/agenda` · `/admin/operaciones` · `/admin/facturas` (VeriFactu) · `/admin/contabilidad` · `/admin/materiales` + `/admin/escanear` · `/admin/stock` · `/admin/lenceria` · `/admin/rrhh` · `/admin/crm` · `/admin/informes` · `/admin/ia` · `/admin/asistente` · `/admin/chat` · `/admin/planes` (Stripe) · `/admin/configuracion` · `/admin/usuarios` · `/superadmin` (gestión multi-empresa) · `/l` + `/l/login` (app limpiadora, PIN) · `/propietario/[token]` · `/cotizador` · `/registro`.
- **Portal propietario `/propietario/[token]`** (token = `clientes.access_token`): tabs Hoy / Reservas / Finanzas / Docs / Acceso / Chat; crear limpiezas directas; Finanzas lista facturas emitidas + Descargar PDF; firma de consentimiento; gastos/quejas/escanear.

## Contabilidad (`/admin/contabilidad`)
- Apuntes contables (PGC), entrada manual (`/api/admin/contabilidad/apuntes` POST/PATCH/DELETE) + automáticos desde el escáner de documentos.
- Vistas/cálculos: `resultado` (P&G), `iva` (liquidación), `tesoreria`, `rentabilidad` (por piso). Export disponible. Todo scopeado por `empresa_id`.
- Coste de limpieza sale de **facturas emitidas** (`factura_lineas.propiedad_id`), nunca de `cleaning_sessions`.

## Smoobu
Customer `127993947`, header `Api-Key` (no Bearer). READ: reservations/messages/rates/custom-placeholders. WRITE: solo `POST /api/rates`. 403 en apartments/guests/etc. Sync (`pms/sync`, cada 10 min) auto-reconcilia (cancela/actualiza limpiezas cuando cambia la reserva). 4 apartamentos de Alberto: 352007 House Sevillana · 352928 Duplex Center · 352943 Luxury Busto · 352418 Busto Reform.

## Asignación de limpiezas
- Disponibilidad por turnos (`limpiadora_disponibilidad` + `turno`: mañana 08-14 / tarde 14-20 / completo 08-20). **Sin disponibilidad marcada → NO se asigna.**
- Auto-asignación real: `GET /api/admin/auto-assign`, solo toca sesiones de hoy+mañana con `limpiadora_id` NULL (lo ya asignado no se mueve). Crons 5:30 y 16:00 (hora España, DST-proof). Dentro de la tanda asigna en orden y escribe en BD antes de la siguiente sesión → la carga se recalcula con lo ya repartido (balance acumulado).
- **Scoring v2 (vigente):** carga **continua** (no el bucket que se saturaba a 4 h) + **tope real por `horas_max`**; `conoce_propiedad` es un **bonus** (~1,5 h equivalentes), no absoluto, así la carga puede ganarle. Pasarse de `horas_max` lleva un castigo grande pero **nunca** deja la sesión sin asignar (solo la disponibilidad vacía hace eso). Clave de piso unificada con `COALESCE(NULLIF(propiedad_id::text,''), property_id::text)`.
- **Asignación manual:** `PATCH /api/admin/sesiones/[id]` con `{ limpiadora_id }` (uuid = asignar/reasignar · `null`/'' = desasignar). Scope `empresa_id`; **bloquea si `completed_at`** (409). `DELETE /api/admin/sesiones/[id]` solo `origen='manual'` y sin empezar/completar (las de Smoobu las recrearía `pms/sync`).
- **UI de reasignación:** en **Inicio** (`/dashboard`) el chip de la limpiadora es tocable → bottom-sheet (update optimista); en **Agenda** (`/admin/agenda`) panel "Asignar limpiadora por día". Ambas usan el PATCH; al desasignar, avisar de que el cron de las 16:00 puede reasignar.
- **Pisos de Alberto:** `asignacion_fija` APAGADA en los 4 (nacen sin limpiadora; reparte el scoring o Vanessa a mano). `limpiadora_principal_id = Wendy` solo como pista; **no** hay default a Wendy en código.
- **Pendiente (scoring v3 — lógica de Vanessa, multi-persona):** hotel ≤4 limpiezas→1 persona, >4→2 (rotando por descansos); repartir entradas (cada una un piso con entrada, luego rellenar); empezar por salidas más tempranas. **Decisión pendiente de Alberto/Vanessa:** si la del hotel por la mañana sigue con apartamentos (su balance de minutos cuenta el hotel) o es jornada completa.

## Crons (`vercel.json`)
`pms/sync` cada 10 min · `programaciones/generar` 05:00 · `auto-assign` 05:30 y 16:00 (hora España) · `informes/cron` 07:00 día 1 · `ausencias` 09:30 · `fotos-cleanup` 03:00 · `alertas-gastos` 08:00 · `cron/procesar-documentos` cada minuto. Todos requieren `Bearer CRON_SECRET`.

## VeriFactu
`lib/verifactu.ts` (SHA-256 + XML SOAP AEAT), campos `vf_*` en `facturas_clientes`/`facturas_limpiadoras`. Sique Brilla SL (sociedad): obligatorio **ene-2027**. Última factura con software previo: **2025/248** (31/05/2026); al migrar, la numeración **sigue** (→ 2025/249), IALIMP = SIF nuevo → 1ª factura `PrimerRegistro=S` y cadena de huellas desde cero (confirmar con gestoría).

## Regla del manual
Todo cambio de UI o de funcionalidad va **también** a `public/manual.html` + re-deploy. (Comparativa admin: `public/manual-comparativa-admin.html`.)

## Cómo mantener este archivo
Si cambia una convención, una regla de datos o una decisión de arquitectura, **actualiza este `CLAUDE.md` en el mismo PR**. Es la fuente de verdad para trabajar el código de este repo.

> Sin credenciales: tokens, contraseñas y API keys van SIEMPRE en variables de entorno de Vercel, **nunca** en este archivo ni en el repo. Env usadas: `NVIDIA_API_KEY`, `CRON_SECRET`, `SMOOBU_API_KEY`, `GMAIL_APP_PASSWORD`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, VAPID (`NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`), Supabase (`NEXT_PUBLIC_SUPABASE_URL`/`_ANON_KEY`), cadena Prisma (pooler 6543, `pgbouncer=true`).
