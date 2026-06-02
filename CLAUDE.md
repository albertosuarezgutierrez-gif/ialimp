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
- **Email saliente:** centralizado en `lib/mailer.ts` (`getTransporter()` + `MAIL_FROM`). Orden de transporte: **(0) Resend** (preferido) si hay `RESEND_API_KEY` → SMTP de Resend (`smtp.resend.com:465` SSL, usuario fijo `resend`, pass = la API key); requiere el dominio `ialimp.es` **verificado en Resend** (registros DNS) para enviar desde `MAIL_FROM`. **(1) SMTP de IONOS** (`SMTP_USER` / `SMTP_PASSWORD`; host/puerto por defecto `smtp.ionos.es:465` SSL, override con `SMTP_HOST`/`SMTP_PORT`) — respaldo del buzón `hola@ialimp.es` en IONOS. **(2) Gmail** (`GMAIL_USER` / `GMAIL_APP_PASSWORD`). Todos los transportes llevan timeouts (10/10/15 s) para no colgar la función serverless. El **remitente** (`from`) es **siempre `MAIL_FROM` = `hola@ialimp.es`** (display = nombre de la empresa). Si faltan credenciales, `getTransporter()` devuelve `null` y la ruta marca el correo como no enviado (no rompe). Rutas que mandan correo: `clientes/[id]/enviar-acceso`, `sesiones/[id]/completar`, `informes/generar`, `ia/agente-cotizador`.
- `next.config.ts`: `ignoreBuildErrors` + `ignoreDuringBuilds` = `true`. **OJO:** esto ignora errores de TypeScript y de lint, pero **NO** los errores de sintaxis reales (un JSX mal cerrado sí rompe el build).
- Build: `prisma generate && next build` · Install: `npm install --legacy-peer-deps`.
- Commits/PR: prefijo **`fix:`** o **`feat:`**. Vercel ignora los que empiezan por `chore|trigger|rebuild`.

## Despliegue y producción (OJO — cliente en vivo)
- **Producción = `ialimp.vercel.app` = rama `main`.** Vanessa (Sique Brilla) la usa en directo: **cualquier merge a `main` se ve al instante**. No mergear sin que el cambio esté validado (preview verde).
- **Flujo:** desarrollar en rama `feat:`/`fix:` → PR (en borrador) → Vercel genera **preview** propia de la rama (misma BD de producción: lo que escribas en la preview se guarda de verdad) → validar ahí → mergear a `main` para publicar.
- **Controlar qué está "Ready" en producción = panel de Vercel** (`vercel.com/.../ialimp`, filtro *Production*): muestra el deploy *Current* en vivo y los *rollback candidates* para volver atrás en 1 clic. GitHub/PR = el *qué cambió*; Vercel = el *qué está publicado*. (Conviene activar avisos de deploy a Slack/email en Settings → Notifications.)
- Cada PR mergeado a `main` = un deploy de producción. Solo `main` despliega a producción.

## Multi-tenant (CRÍTICO — frontera de seguridad)
- **Scoping por `empresa_id` en TODA query y route.** Nunca consultes ni asignes datos sin filtrar por empresa. Una fuga entre empresas es un fallo grave de RGPD.
- Middleware: 401 a `/api/*` no público sin cookie `ialimp_session`. Eximidos: `/api/auth`, `/api/pms`, `/api/leads`, `/api/propietario`, `/api/cotizador`, `/api/catastro`, `/l`, `/api/l`.
- Crons y llamadas servidor→servidor a `/api/admin/*` DEBEN enviar `Authorization: Bearer CRON_SECRET`, o devuelven **401 silencioso**.

## Diseño (FIJO — nunca cambiar ni mezclar paletas)
- **IALIMP:** header/botones `#4f46e5` · marca `#6366f1` · suaves `#eef2ff` · texto `#1e1b4b` · fondo `#f1f5f9`. **Tema CLARO siempre** (nunca fondos oscuros). Tipografía **NUNITO en todo** (800/900 en títulos y logo, 400-600 en cuerpo). Logo: "ia" indigo + "limp" oscuro.
- **Sique Brilla** (white-label, producto SEPARADO): negro `#0a0805` + dorado `#d4a017`. **Nunca mezclar las dos paletas.**
- Verdes/rojos = solo estado (ok/error).
- **Responsive (FIJO — toda UI nueva o modificada):** la app se usa en **móvil y ordenador**, así que **todo debe adaptarse a la pantalla**. Reglas: anchos **fluidos** (`%`, `fr`, `flex` + `flexWrap:'wrap'`), `maxWidth` con `width:'100%'` en contenedores y tarjetas; **nunca anchos fijos en px** que desborden (si hace falta tope, usar `maxWidth`/`minWidth` con `flex`). Listas/cabeceras que no quepan → `flexWrap:'wrap'` u `overflowX:'auto'`. **Modales SIEMPRE** con `maxHeight:'90vh'` + `overflowY:'auto'` (para que en pantallas bajas se pueda llegar a los botones). Rejillas de formulario con `1fr 1fr` (fluidas) o `repeat(auto-fit,minmax(…,1fr))` para que colapsen a 1 columna en lo más estrecho. No se usan media queries (estilos inline): conseguir la adaptación con estas técnicas.

## Base de datos (Supabase `wswbehlcuxqxyinousql`, COMPARTIDA con SIVRA)
- `$queryRaw` **SIEMPRE** con `Prisma.sql` (nunca interpolar strings). Los **casts van en el SQL** (`${v}::uuid`, `${v}::date`), **nunca concatenados al valor del parámetro** (`${v + '::uuid'}` manda el texto `"…::uuid"` y rompe con `42804 COALESCE types text and uuid cannot be matched`).
- **Tipos reales de `cleaning_sessions`:** `hora_inicio` es **TEXT** (no `time`) → **nunca** castear `::time` (un `COALESCE(${v}::time, hora_inicio)` rompe con `42804 time vs text`). Al editar una sesión por PATCH, hacer **un `UPDATE` por campo y solo si viene en el body** (en vez de un COALESCE de todas las columnas) para no chocar tipos ni pisar lo no enviado.
- `schema.prisma` solo declara `empresas` y `pms_connections`; el resto de tablas (`limpiadoras`, `cleaning_sessions`, `clientes`, `propiedades`, `facturas_*`, etc.) se gestionan por **SQL crudo**.
- `cliente` = entidad facturable (`tipo_persona` ∈ particular/autonomo/empresa); datos fiscales en `clientes`. `cliente_contactos`: N por cliente, `principal` exclusivo. Las columnas jsonb `telefonos`/`emails` fueron ELIMINADAS.
- **Consentimiento RGPD del portal del propietario:** al entrar a `/propietario/[token]`, si el cliente no ha aceptado la versión vigente del texto (`RGPD_VERSION` en `lib/rgpd.ts`), `page.tsx` **NO carga sus datos** y devuelve solo `ConsentimientoRGPD` (pantalla bloqueante). Gate por servidor: `cliente.rgpd_aceptado === true && cliente.rgpd_version === RGPD_VERSION`. Al aceptar, `POST /api/propietario/[token]/consentimiento` (público, exento en middleware) hace snapshot en `clientes` (`rgpd_aceptado`/`rgpd_aceptado_at`/`rgpd_version`) **y** registra evidencia en `cliente_consentimientos` (versión + IP + user-agent + fecha). El texto enmarca a la **empresa** como prestadora del servicio de limpieza y al **titular de la plataforma** (IALIMP) como proveedor del software gratuito a cambio del tratamiento. Si cambia el texto legal, sube `RGPD_VERSION` → re-consent automático.
- `facturas_clientes` congela el destinatario (`dest_*`) para VeriFactu; `iva_importe` / `total` / `lineas.importe` son **GENERATED**.
- Coste de limpieza en contabilidad = **facturas emitidas** (`factura_lineas.propiedad_id`), NO `cleaning_sessions` (evita doble conteo).
- Solo los 4 pisos de Alberto sincronizan Smoobu; externos = alta manual (`origen='manual'`, `external_reservation_id` UNIQUE, `limpiadora_id` NULL).
- Storage: buckets `cleaning-photos` (TTL 5 días), `propuestas-leads`, `cvs-rrhh`, `property-access-files`, `documentos-contables` (justificantes de apuntes; público, path `{empresa_id}/{id}/...`).
- **Contabilidad de empresa** (`/admin/contabilidad`): todo se agrega por **vistas SQL**. `v_contab_ingresos` = `facturas_clientes` + `ingresos_manuales` (UNION ALL); `v_contab_gastos` = `documentos_contables` (`ambito='empresa'`) + `facturas_limpiadoras`. De ahí cuelgan `v_contab_pyg` (Resultado), `v_contab_iva` (IVA, por trimestre) y `v_contab_tesoreria`. **Rentabilidad NO usa la vista** (lee `facturas_clientes` directo → no refleja ingresos manuales). Al extender la rama de una vista, mantener el contrato de columnas idéntico y usar `CREATE OR REPLACE` (NUNCA `DROP`, hace CASCADE).
  - Apunte manual (gasto/ingreso) desde la pestaña Apuntes o el botón ➕ de la cabecera: rutas `/api/admin/contabilidad/{apuntes,ingresos}` (POST/GET + `[id]` DELETE soft) y `/marcar` (pagado/cobrado, `tipo` ∈ factura/gasto/ingreso_manual). IVA con % editable (0 = exento). Adjunto vía `/adjunto` (FormData → bucket + columna `documento_url`).
  - **Recurrentes**: plantillas en `apuntes_recurrentes` (`tipo` gasto/ingreso, `periodicidad` mensual/trimestral/semestral/anual, `fecha_inicio`/`fecha_fin`). El cron `/api/admin/contabilidad/generar-recurrentes` (06:00) + `lib/contab-recurrentes.ts` materializan el apunte real de cada periodo de forma **idempotente** (dedupe por `recurrente_origen` + fecha). Al crear la plantilla se hace backfill inmediato.
- **Deuda conocida:** `cleaning_sessions.property_id` (text legacy) convive con `propiedad_id` (uuid) en 2 formatos (slug `prop_*` y UUID) para los mismos pisos → al consultar, normaliza con `COALESCE(NULLIF(propiedad_id::text,''), property_id::text)` (**ambos a `::text`**: si no, COALESCE peta con `42804` text vs uuid).

## IA (solo NVIDIA NIM, free tier)
- Todo vía `lib/ai-client.ts`. `aiComplete()` = llama-3.3-70b · `aiExtractInvoice()` = llama-3.2-90b-vision.
- `@anthropic-ai/sdk` está **ELIMINADO**. Cualquier feature de IA nueva usa `aiComplete()`.
- Agentes ya existentes (no duplicar): auto-asignación, calidad-fotos, informes (día 1), cotizador, clasificar-queja, escáner de documentos, briefing-diario, comparar-foto, selección de CVs (RRHH).

## Smoobu
Customer `127993947`, header `Api-Key` (no Bearer). READ: reservations/messages/rates/custom-placeholders. WRITE: solo `POST /api/rates`. 403 en apartments/guests/etc.

## Asignación de limpiezas
- Disponibilidad por turnos (`limpiadora_disponibilidad` + `turno`: mañana 08-14 / tarde 14-20 / completo 08-20). **Sin disponibilidad marcada → NO se asigna.**
- Auto-asignación real: `GET /api/admin/auto-assign`, solo toca sesiones de hoy+mañana con `limpiadora_id` NULL (lo ya asignado no se mueve). Crons 5:30 y 16:00 (hora España). El scoring actual prioriza `conoce_propiedad` y desempata por carga (pendiente de mejora).
- **Asignación manual:** `PATCH /api/admin/sesiones/[id]` con `{ limpiadora_id }` (uuid = asignar/reasignar · `null`/'' = desasignar). Scope `empresa_id`; **bloquea si `completed_at`** (409). `DELETE /api/admin/sesiones/[id]` solo `origen='manual'` y sin empezar/completar (las de Smoobu las recrearía `pms/sync`).
- **UI de reasignación:** en **Inicio** (`/dashboard`) el chip de la limpiadora es tocable → bottom-sheet (update optimista, sin recarga); en **Agenda** (`/admin/agenda`) panel "Asignar limpiadora por día" (hoy/mañana). Ambas usan el PATCH de arriba; al desasignar, avisar de que el cron de las 16:00 puede reasignar.

## Definición de "terminado" (checklist al cerrar CUALQUIER trabajo)
Antes de dar por hecho un trabajo, actualiza **TODO lo que el cambio toque, en el mismo PR**:
- [ ] **`public/manual.html`** si cambió UI o funcionalidad (ver «Regla del manual»).
- [ ] **`CLAUDE.md`** si cambió una convención, regla de datos, arquitectura o se añadió tabla/vista/bucket/cron (ver «Cómo mantener este archivo»).
- [ ] **Migraciones**: el `.sql` commiteado en `prisma/migrations/` **y** aplicado en Supabase (la BD se gestiona por SQL crudo; el repo es la fuente de verdad).
- [ ] **`vercel.json`** si se añadió/cambió un cron.
- [ ] **Verificado**: build OK y prueba end-to-end (preview o Supabase MCP). Limpia los datos de prueba (BD de producción en vivo).
No dejes ninguno para "luego": si el trabajo está terminado, la documentación y la config también lo están.

## Regla del manual
Todo cambio de UI o de funcionalidad va **también** a `public/manual.html` + re-deploy.

## VeriFactu
`lib/verifactu.ts` (SHA-256 + XML SOAP AEAT), campos `vf_*`. Sique Brilla SL: obligatorio desde ene-2027.

## Cómo mantener este archivo
Si cambia una convención, una regla de datos o una decisión de arquitectura, **actualiza este `CLAUDE.md` en el mismo PR**. Es la fuente de verdad para trabajar el código de este repo.

> Sin credenciales: tokens, contraseñas y API keys van SIEMPRE en variables de entorno de Vercel, **nunca** en este archivo ni en el repo.
