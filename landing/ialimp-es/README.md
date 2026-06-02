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

## Cumplimiento
- La web **no instala cookies de seguimiento ni analítica** → no requiere banner de consentimiento.
- La tipografía se sirve **auto-alojada** (sin Google Fonts) → no se transfieren datos a terceros.
- Incluye aviso legal, política de privacidad y política de cookies, enlazados en el footer.

## Desplegar a ialimp.es
1. Generar las fuentes (una vez, con red):
   ```bash
   bash fetch-fonts.sh
   ```
2. Desplegar a producción en el proyecto Vercel `ialimp-landing` (desde esta carpeta):
   ```bash
   npx vercel deploy --prod
   ```
   (Vincula este directorio al proyecto `ialimp-landing` la primera vez con `npx vercel link`.)

> Alternativa: conectar el proyecto `ialimp-landing` a este repo en Vercel y fijar el
> *Root Directory* a `landing/ialimp-es/` para que despliegue automáticamente con cada push.
