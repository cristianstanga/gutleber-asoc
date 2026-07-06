# Gutleber & Asociados

Este archivo se carga automáticamente cuando Claude Code trabaja en este proyecto.

## Marca vigente (2026-07-04) — no usar versiones anteriores

- **Nombre completo**: "Gutleber & Asociados" (no abreviar en UI pública). Nunca confundir con "Gutleber Propiedades", la firma familiar que opera aparte.
- **Paleta**: Petróleo `#0F2233` (primario) + Champagne `#C8A96B` (acento) + Crema `#F5EFE3` (fondo claro) + Carbón `#1A1A18` (fondo oscuro). No usar la paleta anterior (navy `#0F172A` / copper `#B45309`, ni la paleta tierra Carbón/Piedra/Arena/Crema del brief original) — ambas descartadas.
- **Tipografía**: Georgia (display / nombre de la firma) + Arial / Inter (cuerpo, digital).
- **Emblema**: `brand/logo/gutleber_emblema.svg` (versión clara) y `gutleber_emblema_oscuro.svg` (versión oscura) — pin de ubicación cerrado (sin ningún corte lateral) con una casa sólida adentro. Validado por la clienta.
- **Descriptor**: "Negocios Inmobiliarios" (no usar "Inmobiliaria Boutique", descartado).
- **Tokens machine-readable**: `brand/brand.config.json` — usar esto como fuente de verdad al tocar estilos/colores del frontend.
- **Documento de referencia completo**: `Gutleber_Ecosistema_Marca.docx` (raíz del proyecto) — marca, Instagram, WhatsApp Business, cartelería y cómo se conecta todo con el sistema.

## Contacto oficial

- WhatsApp: +54 9 3765 41-0765 — ya integrado vía API oficial de Meta Cloud en `apps/api/src/services/whatsapp-meta.ts` (no confundir con la carpeta vieja `apps/api/baileys_auth_info`, que no está conectada a ningún endpoint activo).
- Instagram: `@gutleberasociados`

## Al tocar el frontend (apps/web)

Reemplazar cualquier referencia a la paleta anterior por los valores de `brand/brand.config.json`. Confirmar con el cliente antes de aplicar cambios visuales grandes — la dirección de marca puede seguir en ajuste.
