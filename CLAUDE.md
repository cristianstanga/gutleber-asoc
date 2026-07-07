# Gutleber & Asociados

Este archivo se carga automáticamente cuando Claude Code trabaja en este proyecto.

## Marca vigente (2026-07-06) — no usar versiones anteriores

- **Nombre completo**: "Gutleber & Asociados" (no abreviar en UI pública). Nunca confundir con "Gutleber Propiedades", la firma familiar que opera aparte.
- **Paleta**: Azul Petróleo `#0D3B4E` (primario) + Azul Acero Claro `#7FA1BB` (acento) + Gris Claro `#E7EBEE` (fondo neutro) + Blanco Roto `#F7F7F5` (fondo claro). El dorado/champagne queda retirado por completo desde el 2026-07-06. No usar ninguna paleta anterior (petróleo `#0F2233`/champagne `#C8A96B`, navy `#0F172A`/copper `#B45309`, ni la paleta tierra Carbón/Piedra/Arena/Crema del brief original) — todas descartadas.
- **Tipografía**: Georgia (display / nombre de la firma) + Arial / Inter (cuerpo, digital).
- **Emblema**: `brand/logo/gutleber_emblema.svg` (versión clara) y `gutleber_emblema_oscuro.svg` (versión oscura) — pin de ubicación cerrado (sin ningún corte lateral) con una casa sólida adentro. Misma geometría validada por la clienta; recoloreado a la paleta azul el 2026-07-06.
- **Descriptor**: "Negocios Inmobiliarios" (no usar "Inmobiliaria Boutique" ni "Gestión · Inversión · Patrimonio", ambos descartados).
- **Tokens machine-readable**: `brand/brand.config.json` — usar esto como fuente de verdad al tocar estilos/colores del frontend.
- **Documento madre único**: `brand/manual/Gutleber_Manual_Identidad_Visual.pdf` — marca, paleta, tipografía, emblema, Instagram, WhatsApp Business, cartelería, ejemplos de uso, conexión con el sistema y cómo invocar en VS Code. `Gutleber_Ecosistema_Marca.docx` fue eliminado el 2026-07-06 tras fusionar todo su contenido único en este PDF; no debe recrearse como documento separado.

## Contacto oficial

- WhatsApp: +54 9 3765 41-0765 — ya integrado vía API oficial de Meta Cloud en `apps/api/src/services/whatsapp-meta.ts` (no confundir con la carpeta vieja `apps/api/baileys_auth_info`, que no está conectada a ningún endpoint activo).
- Instagram: `@gutleberasociados`

## Al tocar el frontend (apps/web)

Reemplazar cualquier referencia a la paleta anterior por los valores de `brand/brand.config.json`. Confirmar con el cliente antes de aplicar cambios visuales grandes — la dirección de marca puede seguir en ajuste.
