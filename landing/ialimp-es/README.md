# Landing ialimp.es

Código fuente de la landing pública **ialimp.es** (proyecto Vercel `ialimp-landing`).
Es una web estática (HTML/CSS, sin framework). Hasta ahora se subía por CLI sin estar en
git; este directorio es la fuente de verdad versionada.

## Contenido
- `index.html` — landing principal.
- `aviso-legal.html` — aviso legal (LSSI art. 10).
- `privacidad.html` — política de privacidad (RGPD).
- `cookies.html` — política de cookies.
- `fetch-fonts.sh` — descarga Nunito (woff2) a `fonts/` para auto-alojar la tipografía.
- `fonts/` — tipografías auto-alojadas (los `.woff2` se generan con el script; no van en git).

## Formulario de contacto
- El formulario de `index.html` hace `fetch` POST a `https://app.ialimp.es/api/lead-saas` (endpoint en la
  app, con CORS para `ialimp.es`). Crea un prospecto (`origen='landing'`) y avisa a Alberto por email.
- Botones de **WhatsApp**: el número está hardcodeado en `index.html` (placeholder `34600000000`) — cambiarlo
  por el real. (En los correos del mailing se usa la env `IALIMP_WHATSAPP`.)

## Cumplimiento
- La web **no instala cookies de seguimiento ni analítica** → no requiere banner de consentimiento.
- La tipografía se sirve **auto-alojada** (sin Google Fonts) → no se transfieren datos a terceros.
- Incluye aviso legal, política de privacidad y política de cookies, enlazados en el footer.

## Desplegar a ialimp.es

### Automático (GitHub Actions) — recomendado
El workflow `.github/workflows/deploy-landing.yml` despliega esta carpeta al proyecto
Vercel `ialimp-landing` en cada push a `main` que toque `landing/ialimp-es/` (o a mano
desde la pestaña **Actions → Deploy landing → Run workflow**).

Requisito (una vez): añadir el secreto **`VERCEL_TOKEN`** en
GitHub → Settings → Secrets and variables → Actions. El token se crea en
Vercel → Account Settings → Tokens. (Los IDs de equipo/proyecto ya van fijos en el workflow.)

### Manual (tu terminal)
1. Generar las fuentes (una vez, con red):
   ```bash
   bash fetch-fonts.sh
   ```
2. Desplegar a producción en el proyecto Vercel `ialimp-landing` (desde esta carpeta):
   ```bash
   npx vercel deploy --prod
   ```
   (Vincula este directorio al proyecto `ialimp-landing` la primera vez con `npx vercel link`.)
