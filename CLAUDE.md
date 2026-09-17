# Gutleber & Co.

Este archivo se carga automáticamente cuando Claude Code trabaja en este proyecto.

## Marca vigente (2026-09-17) — no usar versiones anteriores

- **Nombre completo**: "Gutleber & Co." — reemplaza por completo a "Gutleber & Asociados" (retirado). Nunca confundir con "Gutleber Propiedades", la firma familiar que opera aparte.
- **Paleta**: monocromática. Negro `#121212` (primario) + Gris Oscuro `#2B2B2B` + Gris Medio `#A0A0A0` (acento) + Gris Claro `#E9E9E7` (fondo neutro) + Blanco Roto `#F7F7F5` (fondo claro, sin cambios). No usar ninguna paleta anterior: azul Petróleo `#0D3B4E`/Acero `#7FA1BB` (2026-07 a 2026-09), navy `#0F172A`/copper `#B45309`, tierra Carbón/Piedra/Arena/Crema del brief original, ni dorado/champagne (retirado 2026-07-06, sigue retirado).
- **Colores funcionales del panel interno** (`apps/web`, NO son de marca): verde/rojo/ámbar estándar de Tailwind para alertas y estados de pago (al día/vencido/pendiente) — esto no cambia con el rebrand, es semántica funcional separada de la identidad visual.
- **Tipografía**: Poppins (display y cuerpo) — reemplaza a Georgia+Arial. Se carga vía Google Fonts. Es una aproximación al logo de referencia del cliente, no el archivo original del diseñador.
- **Logo**: el logo de referencia (imagen provista por el cliente 2026-09-17) es un **wordmark puro sin ícono** — "Gutleber & Co." + "BIENES RAÍCES" en negro sobre blanco. Todavía no tenemos el archivo vectorial original, así que está recreado por aproximación en `apps/web/public/logo-login.svg`. El pin+casa (`emblema.svg`/`emblema_oscuro.svg`) es una adaptación nuestra recoloreada a monocromo para contextos donde se necesita una marca compacta (favicon, sidebar) — no forma parte del logo de referencia original.
- **Descriptor**: "Bienes Raíces" (reemplaza a "Negocios Inmobiliarios"; tampoco usar "Inmobiliaria Boutique" ni "Gestión · Inversión · Patrimonio", ambos descartados de antes).
- **Tokens machine-readable**: `brand/brand.config.json` — usar esto como fuente de verdad al tocar estilos/colores del frontend.
- **Documento madre**: `brand/manual/Gutleber_Manual_Identidad_Visual.pdf` está **desactualizado** (describe la marca azul anterior) — pendiente de reemplazar.

## Pendiente del rebrand (2026-09-17) — no tocado todavía

El nombre viejo "Gutleber & Asoc." / "Gutleber & Asociados" todavía aparece en ~50 lugares del backend que NO se actualizaron en el primer pase porque requieren más cuidado que un cambio de texto:

- **Mensajes de WhatsApp** del agente IA (`apps/api/src/services/agente.ts`, `agente-ia.ts`) y de los cron jobs (`cron.ts`, `pagos.ts`, `visitas.ts`, `indices.ts`) — firman como "Gutleber & Asoc."
- **Plantillas de WhatsApp ya aprobadas en Meta** (`gutleber_pago_cobrado`, `gutleber_contacto`, etc., texto en `apps/api/src/index.ts`) — si el texto cambia, hay que volver a mandarlas a aprobación en Meta Business Manager, no es instantáneo.
- **PDFs**: contratos (`apps/api/src/services/contrato.ts`) y liquidaciones/recibos (`apps/api/src/services/pdf.ts`) tienen "GUTLEBER" con posiciones de píxel fijas — cambiar el texto puede requerir reacomodar el layout.
- **Generador de placas** para Instagram/WhatsApp (`apps/api/src/services/tarjeta.ts` + `apps/web/src/pages/TarjetaBuilder.tsx`) — dibuja "GUTLEBER & Asociados" en un canvas, necesita rediseño visual, no solo cambio de texto.
- **Emails** (`apps/api/src/services/email.ts`).
- El handle de Instagram (`@gutleberasociados`) y el dominio (`gutleberyasociados.com`) tampoco se tocaron — son decisiones de contenido/infraestructura separadas.

## Contacto oficial

- WhatsApp: +54 9 3765 41-0765 — ya integrado vía API oficial de Meta Cloud en `apps/api/src/services/whatsapp-meta.ts` (no confundir con la carpeta vieja `apps/api/baileys_auth_info`, que no está conectada a ningún endpoint activo).
- Instagram: `@gutleberasociados` (handle sin cambios pese al rebrand — pendiente de decidir si se actualiza)

## Al tocar el frontend (apps/web, apps/web-publico)

Reemplazar cualquier referencia a la paleta anterior por los valores de `brand/brand.config.json`. Confirmar con el cliente antes de aplicar cambios visuales grandes — la dirección de marca puede seguir en ajuste.
