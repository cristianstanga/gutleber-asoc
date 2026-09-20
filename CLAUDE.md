# Gutleber & Co.

Este archivo se carga automáticamente cuando Claude Code trabaja en este proyecto.

## Marca vigente (2026-09-17) — no usar versiones anteriores

- **Nombre completo**: "Gutleber & Co." — reemplaza por completo a "Gutleber & Asociados" (retirado). Nunca confundir con "Gutleber Propiedades", la firma familiar que opera aparte.
- **Paleta**: monocromática. Negro `#121212` (primario) + Gris Oscuro `#2B2B2B` + Gris Medio `#A0A0A0` (acento) + Gris Claro `#E9E9E7` (fondo neutro) + Blanco Roto `#F7F7F5` (fondo claro, sin cambios). No usar ninguna paleta anterior: azul Petróleo `#0D3B4E`/Acero `#7FA1BB` (2026-07 a 2026-09), navy `#0F172A`/copper `#B45309`, tierra Carbón/Piedra/Arena/Crema del brief original, ni dorado/champagne (retirado 2026-07-06, sigue retirado).
- **Colores funcionales del panel interno** (`apps/web`, NO son de marca): verde/rojo/ámbar estándar de Tailwind para alertas y estados de pago (al día/vencido/pendiente) — esto no cambia con el rebrand, es semántica funcional separada de la identidad visual.
- **Tipografía**: Poppins (display y cuerpo) — reemplaza a Georgia+Arial. Se carga vía Google Fonts. Sigue siendo una aproximación: la fuente real del wordmark (ver abajo) no fue identificada todavía, y el cliente decidió (2026-09-19) no invertir tiempo en igualarla por ahora — Poppins se queda.
- **Logo**: desde 2026-09-19 tenemos el **archivo vectorial oficial** provisto por el diseñador del cliente, en `brand/logo/wordmark-oficial/` (4 variantes: `logo-principal-{negro,blanco}.svg` con "Gutleber & Co." + "BIENES RAÍCES", y `logo-reducido-{negro,blanco}.svg` solo con "Gutleber & Co.", sin el descriptor). Es un **wordmark puro sin ícono**. Usado en `apps/web/public/logo-login.svg` (login/forgot/reset password, variante blanca sobre fondo oscuro) y `apps/web-publico/public/logo-horizontal.svg` (header/footer del sitio público, variante reducida blanca).
- **Ícono/emblema**: el pin+casa que existía antes (inventado por nosotros, sin relación con la marca real del cliente) fue **reemplazado el 2026-09-19** por un ícono extraído directamente del vector oficial: el símbolo "&" del wordmark, recortado del path original (no redibujado), sobre una placa cuadrada de esquinas redondeadas. Archivos: `apps/web/public/emblema.svg` (placa negra, "&" claro — para fondos claros) y `emblema_oscuro.svg` (placa clara, "&" oscuro — para fondos oscuros), mismos nombres/paths que antes para no tener que tocar el código que los referencia (`Sidebar.tsx`, `MobileHeader.tsx`, `TarjetaBuilder.tsx`, `favicon.svg`, `apple-touch-icon`). Espejado en `apps/web-publico/public/`. El backend (`apps/api/src/services/tarjeta.ts`, generador de placas para redes) usa los PNG rasterizados `apps/api/assets/img/emblema_claro.png` / `emblema_oscuro.png`, regenerados a partir de los SVG nuevos con `sharp`.
- **Descriptor**: "Bienes Raíces" (reemplaza a "Negocios Inmobiliarios"; tampoco usar "Inmobiliaria Boutique" ni "Gestión · Inversión · Patrimonio", ambos descartados de antes).
- **Tokens machine-readable**: `brand/brand.config.json` — usar esto como fuente de verdad al tocar estilos/colores del frontend.
- **Documento madre**: `brand/manual/Gutleber_Manual_Identidad_Visual.pdf` está **desactualizado** (describe la marca azul anterior) — pendiente de reemplazar.

## Rebrand del backend (completado 2026-09-19)

Los mensajes de WhatsApp (agente IA, cron jobs de pagos/visitas/índices), los PDFs (contratos y liquidaciones/recibos), el generador de placas para Instagram/WhatsApp (`tarjeta.ts` + `TarjetaBuilder.tsx`, con fuente Poppins real vía `.ttf` licenciadas) y los emails ya dicen "Gutleber & Co." — se completó en una sesión posterior a la del 09-17, ver `[[project-rebrand-gutleber-co]]` en memoria para el detalle. De paso se corrigió un bug real: el PDF de recibos decía "GUTLEBER / PROPIEDADES", confundiéndose con la firma familiar separada.

**Único pendiente real**: las 4 plantillas de WhatsApp ya aprobadas en Meta (`gutleber_contacto`, `gutleber_recibo`, `gutleber_transferencia`, `gutleber_pago_cobrado`) fueron editadas a "Gutleber & Co." vía la Graph API y quedaron en revisión (`PENDING`) — falta confirmar que Meta las aprobó. Mientras tanto, `apps/api/src/routes/inbox.ts` sigue mostrando el texto viejo a propósito (espeja lo que la plantilla todavía envía en la práctica) — no tocar ahí hasta confirmar la aprobación.

El handle de Instagram (`@gutleberasociados`) y el dominio (`gutleberyasociados.com`) tampoco se tocaron — son decisiones de contenido/infraestructura separadas.

## Contacto oficial

- WhatsApp: +54 9 3765 41-0765 — ya integrado vía API oficial de Meta Cloud en `apps/api/src/services/whatsapp-meta.ts` (no confundir con la carpeta vieja `apps/api/baileys_auth_info`, que no está conectada a ningún endpoint activo).
- Instagram: `@gutleberasociados` (handle sin cambios pese al rebrand — pendiente de decidir si se actualiza)

## Al tocar el frontend (apps/web, apps/web-publico)

Reemplazar cualquier referencia a la paleta anterior por los valores de `brand/brand.config.json`. Confirmar con el cliente antes de aplicar cambios visuales grandes — la dirección de marca puede seguir en ajuste.
