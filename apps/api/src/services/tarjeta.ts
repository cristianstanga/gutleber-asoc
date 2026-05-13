/**
 * Generador de tarjetas de propiedad — Gutleber & Asoc.
 * Canvas 1080×1080 px (square, ideal WhatsApp / Instagram)
 *
 * Layout v2:
 *   ┌──────────────────────────────────────┐
 *   │  [LOGO + TAGLINE]        [MODO BADGE]│  ← franja superior 90px
 *   │──────────────────────────────────────│
 *   │                                      │
 *   │           FOTO DE FONDO              │  ← centro con overlay degradado
 *   │                                      │
 *   │──────────────────────────────────────│
 *   │  TIPO BADGE                          │  ← zona inferior 340px
 *   │  DIRECCIÓN (grande)                  │
 *   │  descripción (opcional)              │
 *   │  superficie · dormitorios · baños    │
 *   │  ──────────────────────────────────  │
 *   │  PRECIO               QR / branding  │
 *   └──────────────────────────────────────┘
 *
 * Paleta Gutleber:
 *   Carbón  #2C2C2A  |  Piedra  #8C7B6B  |  Arena  #C4B09A  |  Crema  #F0E8DC
 */

import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas'
import sharp from 'sharp'

// ─── Dimensiones ──────────────────────────────────────────────────────────────

const W = 1080
const H = 1080
const PAD = 44          // padding horizontal base
const TOP_BAR = 88      // altura franja superior
const BOT_ZONE = 320    // altura zona inferior de datos

// ─── Paleta ───────────────────────────────────────────────────────────────────

const C = {
  carbon:  '#2C2C2A',
  piedra:  '#8C7B6B',
  arena:   '#C4B09A',
  crema:   '#F0E8DC',
  white:   '#FFFFFF',
  // overlays
  topBar:    'rgba(44,44,42,0.88)',
  botZone:   'rgba(30,30,28,0.94)',
  midFade:   (alpha: number) => `rgba(44,44,42,${alpha})`,
  badge:     'rgba(140,123,107,0.95)',
  badgeVenta: 'rgba(196,176,154,0.95)',
}

const TIPO_LABEL: Record<string, string> = {
  CASA: 'CASA', DEPARTAMENTO: 'DEPARTAMENTO', LOCAL: 'LOCAL COMERCIAL',
  TERRENO: 'TERRENO', OFICINA: 'OFICINA',
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)

// ─── Helpers canvas ───────────────────────────────────────────────────────────

function roundRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h - r)
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
  ctx.lineTo(x + r, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - r)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxWidth) {
      if (line) lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Pinta un badge pill con texto. Devuelve el ancho total del badge. */
function drawBadge(
  ctx: SKRSContext2D,
  text: string,
  x: number, y: number,
  bgColor: string,
  textColor: string,
  fontSize: number,
  radius = 8,
  padH = 16, padV = 10
): number {
  ctx.font = `bold ${fontSize}px sans-serif`
  const tw = ctx.measureText(text).width
  const bw = tw + padH * 2
  const bh = fontSize + padV * 2
  ctx.fillStyle = bgColor
  roundRect(ctx, x, y, bw, bh, radius)
  ctx.fillStyle = textColor
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + padH, y + bh / 2)
  return bw
}

// ─── Interfaz pública ─────────────────────────────────────────────────────────

export interface DatosTarjeta {
  imagenUrl: string
  tipo: string
  direccion: string
  superficie?: number | null
  enAlquiler: boolean
  enVenta: boolean
  alquilerBase?: number | null
  valorVenta?: number | null
  descripcion?: string | null
  habitaciones?: number | null
  banos?: number | null
}

// ─── Generador principal ──────────────────────────────────────────────────────

export async function generarTarjeta(datos: DatosTarjeta): Promise<Buffer> {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d') as SKRSContext2D

  // ── 1. Foto de fondo (toda la tarjeta) ──────────────────────────────────────
  try {
    let imgBuf: Buffer
    if (datos.imagenUrl.startsWith('http')) {
      const r = await fetch(datos.imagenUrl)
      imgBuf = Buffer.from(await r.arrayBuffer())
    } else {
      const fs = await import('fs')
      imgBuf = fs.readFileSync(datos.imagenUrl)
    }
    const resized = await sharp(imgBuf).resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer()
    const bg = await loadImage(resized)
    ctx.drawImage(bg, 0, 0, W, H)
  } catch {
    // Fallback degradado
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#C4B09A')
    grad.addColorStop(1, '#2C2C2A')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Franja superior oscura ────────────────────────────────────────────────
  ctx.fillStyle = C.topBar
  ctx.fillRect(0, 0, W, TOP_BAR)

  // ── 3. Degradado central (foto → zona inferior) ──────────────────────────────
  const fadeStart = TOP_BAR + 60
  const fadeEnd = H - BOT_ZONE
  const midGrad = ctx.createLinearGradient(0, fadeEnd - 200, 0, fadeEnd)
  midGrad.addColorStop(0, C.midFade(0))
  midGrad.addColorStop(1, C.midFade(0.85))
  ctx.fillStyle = midGrad
  ctx.fillRect(0, fadeStart, W, fadeEnd - fadeStart + 50)

  // ── 4. Zona inferior ─────────────────────────────────────────────────────────
  const botY = H - BOT_ZONE
  ctx.fillStyle = C.botZone
  ctx.fillRect(0, botY, W, BOT_ZONE)

  // Línea separadora sutil en la transición
  ctx.fillStyle = C.arena
  ctx.globalAlpha = 0.25
  ctx.fillRect(PAD, botY, W - PAD * 2, 1)
  ctx.globalAlpha = 1

  // ── 5. Logo / branding en franja superior ───────────────────────────────────
  // Nombre empresa
  ctx.font = 'bold 26px sans-serif'
  ctx.fillStyle = C.white
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText('GUTLEBER & ASOC.', PAD, TOP_BAR / 2 - 5)

  // Tagline debajo
  ctx.font = '12px sans-serif'
  ctx.fillStyle = C.arena
  ctx.fillText('GESTIÓN · INVERSIÓN · PATRIMONIO', PAD, TOP_BAR / 2 + 16)

  // ── 6. Badge ALQUILER / VENTA (franja superior derecha) ─────────────────────
  if (datos.enAlquiler || datos.enVenta) {
    const modoLabel = datos.enAlquiler && datos.enVenta
      ? 'ALQUILER · VENTA'
      : datos.enAlquiler ? 'EN ALQUILER' : 'EN VENTA'
    const bgModo = datos.enVenta && !datos.enAlquiler ? C.badgeVenta : C.badge
    ctx.font = 'bold 18px sans-serif'
    const tw = ctx.measureText(modoLabel).width
    const bw = tw + 28
    const bh = 36
    const bx = W - PAD - bw
    const by = (TOP_BAR - bh) / 2
    ctx.fillStyle = bgModo
    roundRect(ctx, bx, by, bw, bh, 6)
    ctx.fillStyle = C.carbon
    ctx.textBaseline = 'middle'
    ctx.textAlign = 'center'
    ctx.fillText(modoLabel, bx + bw / 2, by + bh / 2)
  }

  // ── 7. Zona inferior: tipo badge ─────────────────────────────────────────────
  const tipoLabel = TIPO_LABEL[datos.tipo] || datos.tipo
  ctx.textAlign = 'left'
  let cy = botY + 30
  drawBadge(ctx, tipoLabel, PAD, cy, C.piedra, C.white, 17, 6, 14, 8)
  cy += 48

  // ── 8. Dirección ─────────────────────────────────────────────────────────────
  ctx.font = 'bold 46px sans-serif'
  ctx.fillStyle = C.white
  ctx.textBaseline = 'top'
  ctx.textAlign = 'left'
  const lineasDir = wrapText(ctx, datos.direccion, W - PAD * 2)
  // Máximo 2 líneas
  for (let i = 0; i < Math.min(lineasDir.length, 2); i++) {
    ctx.fillText(lineasDir[i], PAD, cy)
    cy += 54
  }
  cy += 4

  // ── 9. Descripción breve ──────────────────────────────────────────────────────
  if (datos.descripcion) {
    const desc = datos.descripcion.length > 90
      ? datos.descripcion.slice(0, 87) + '...'
      : datos.descripcion
    ctx.font = '20px sans-serif'
    ctx.fillStyle = 'rgba(196,176,154,0.85)'
    ctx.textBaseline = 'top'
    ctx.fillText(desc, PAD, cy)
    cy += 32
  }

  // ── 10. Características ───────────────────────────────────────────────────────
  const caract: string[] = []
  if (datos.superficie) caract.push(`${datos.superficie} m²`)
  if (datos.habitaciones) caract.push(`${datos.habitaciones} dorm.`)
  if (datos.banos) caract.push(`${datos.banos} baño${datos.banos > 1 ? 's' : ''}`)

  if (caract.length > 0) {
    ctx.font = '20px sans-serif'
    ctx.fillStyle = C.arena
    ctx.textBaseline = 'top'
    // Dibuja cada chip por separado con separador ·
    let cx = PAD
    for (let i = 0; i < caract.length; i++) {
      ctx.fillStyle = C.arena
      ctx.fillText(caract[i], cx, cy)
      cx += ctx.measureText(caract[i]).width
      if (i < caract.length - 1) {
        ctx.fillStyle = C.piedra
        ctx.fillText('  ·  ', cx, cy)
        cx += ctx.measureText('  ·  ').width
      }
    }
    cy += 30
  }

  // ── 11. Línea separadora antes del precio ─────────────────────────────────────
  cy += 10
  ctx.fillStyle = C.arena
  ctx.globalAlpha = 0.20
  ctx.fillRect(PAD, cy, W - PAD * 2, 1)
  ctx.globalAlpha = 1
  cy += 18

  // ── 12. Precio (grande) ───────────────────────────────────────────────────────
  const precioTexto = datos.enAlquiler && datos.alquilerBase
    ? formatARS(datos.alquilerBase)
    : datos.enVenta && datos.valorVenta
    ? `USD ${datos.valorVenta.toLocaleString('es-AR')}`
    : null

  if (precioTexto) {
    ctx.font = 'bold 58px sans-serif'
    ctx.fillStyle = C.white
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillText(precioTexto, PAD, cy)

    // Etiqueta pequeña a la derecha del precio
    const sufijo = datos.enAlquiler ? '/ mes' : 'negociable'
    ctx.font = '18px sans-serif'
    ctx.fillStyle = C.arena
    const pw = ctx.measureText(precioTexto).width
    ctx.textBaseline = 'alphabetic'
    ctx.fillText(sufijo, PAD + pw + 12, cy + 50)
  }

  // ── 13. URL branding (abajo derecha) ──────────────────────────────────────────
  ctx.font = '18px sans-serif'
  ctx.fillStyle = C.piedra
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'right'
  ctx.fillText('gutleber.com.ar', W - PAD, H - 28)

  // ── 14. Punto decorativo ──────────────────────────────────────────────────────
  // Pequeño rectángulo de color arena en bottom-left como acento de marca
  ctx.fillStyle = C.arena
  ctx.globalAlpha = 0.6
  ctx.fillRect(PAD, H - 26, 40, 3)
  ctx.globalAlpha = 1

  // ── Render final ──────────────────────────────────────────────────────────────
  const pngBuf = canvas.toBuffer('image/png')
  return sharp(pngBuf).jpeg({ quality: 92 }).toBuffer()
}
