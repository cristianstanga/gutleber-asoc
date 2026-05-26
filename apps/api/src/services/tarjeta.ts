/**
 * Generador de tarjetas de propiedad — Gutleber & Asoc.
 * Canvas 1080×1080 px (square, ideal WhatsApp / Instagram)
 *
 * Layout v3 — Presencia Velada:
 *   ┌──────────────────────────────────────────┐
 *   │  [   HEADER FLOTANTE — pill carbón   ]   │  ← margen 36px, h~80px
 *   │                                          │
 *   │         FOTO FULL-BLEED                  │  ← foto ocupa todo el canvas
 *   │         (viñeta perimetral suave)         │
 *   │                                          │
 *   │  [   PANEL DATOS FLOTANTE — carbón   ]   │  ← margen 36px, h~290px
 *   │                          gutleber.com.ar │
 *   └──────────────────────────────────────────┘
 *
 * Paleta Gutleber:
 *   Carbón  #2C2C2A  |  Piedra  #8C7B6B  |  Arena  #C4B09A  |  Crema  #F0E8DC
 */

import { createCanvas, loadImage, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas'
import sharp from 'sharp'
import path from 'path'

// Registrar fuentes con soporte completo para español (acentos, ñ, etc.)
const FONTS_DIR = path.join(__dirname, '../../assets/fonts')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'WorkSans-Regular.ttf'),  'WorkSans')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'WorkSans-Bold.ttf'),     'WorkSans')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Lora-Regular.ttf'),      'Lora')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Lora-Italic.ttf'),       'Lora')

const W = 1080
const H = 1080
const FLOAT_M = 36      // margen entre borde canvas y paneles flotantes
const IPAD    = 28      // padding interior de paneles

const C = {
  carbon:      '#2C2C2A',
  piedra:      '#8C7B6B',
  arena:       '#C4B09A',
  crema:       '#F0E8DC',
  white:       '#FFFFFF',
  headerBg:    'rgba(44,44,42,0.88)',
  panelBg:     'rgba(36,36,34,0.92)',
  badgePiedra: 'rgba(140,123,107,0.95)',
  badgeArena:  'rgba(196,176,154,0.95)',
  vigFade:     (a: number) => `rgba(0,0,0,${a})`,
}

const TIPO_LABEL: Record<string, string> = {
  CASA: 'CASA', DEPARTAMENTO: 'DEPARTAMENTO', LOCAL: 'LOCAL COMERCIAL',
  TERRENO: 'TERRENO', OFICINA: 'OFICINA',
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency', currency: 'ARS', maximumFractionDigits: 0,
  }).format(n)

// ─── Helpers ──────────────────────────────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
  x: number, y: number,
  w: number, h: number,
  r: number,
) {
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

function pillWidth(ctx: SKRSContext2D, text: string, fontSize: number, padH = 16): number {
  ctx.font = `bold ${fontSize}px WorkSans`
  return ctx.measureText(text).width + padH * 2
}

function drawPill(
  ctx: SKRSContext2D,
  text: string,
  x: number, y: number,
  bg: string, fg: string,
  fontSize: number,
  padH = 16, padV = 9,
): number {
  ctx.font = `bold ${fontSize}px WorkSans`
  const tw = ctx.measureText(text).width
  const pw = tw + padH * 2
  const ph = fontSize + padV * 2
  ctx.fillStyle = bg
  roundRect(ctx, x, y, pw, ph, ph / 2)
  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.textAlign = 'left'
  ctx.fillText(text, x + padH, y + ph / 2)
  return pw
}

function wrapText(ctx: SKRSContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxW) {
      if (line) lines.push(line)
      line = w
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

/** Emblema del pin: círculo + arco arquitectónico + punta de pin */
function drawEmblema(ctx: SKRSContext2D, cx: number, cy: number, size = 40) {
  const r   = size / 2
  const lw  = Math.max(1.2, size / 22)
  ctx.strokeStyle = C.crema
  ctx.lineWidth   = lw
  ctx.globalAlpha = 0.92

  // Círculo exterior
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // Arco arquitectónico interior (semicírculo superior + jambas)
  const ai = r * 0.52
  const ay = cy - r * 0.08
  ctx.beginPath()
  ctx.arc(cx, ay, ai, Math.PI, 0)
  ctx.stroke()
  const jh = ai * 0.55
  ctx.beginPath()
  ctx.moveTo(cx - ai, ay)
  ctx.lineTo(cx - ai, ay + jh)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + ai, ay)
  ctx.lineTo(cx + ai, ay + jh)
  ctx.stroke()

  // Punto interior (cerradura)
  const pd = Math.max(2, lw + 0.5)
  ctx.fillStyle = C.crema
  ctx.beginPath()
  ctx.arc(cx, ay + ai * 0.18, pd, 0, Math.PI * 2)
  ctx.fill()

  // Punta del pin
  const tipY = cy + r + size * 0.52
  const pw   = Math.max(3, size / 6)
  ctx.fillStyle = C.crema
  ctx.beginPath()
  ctx.moveTo(cx - pw, cy + r - 2)
  ctx.lineTo(cx + pw, cy + r - 2)
  ctx.lineTo(cx, tipY)
  ctx.closePath()
  ctx.fill()

  ctx.globalAlpha = 1
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
  const ctx    = canvas.getContext('2d') as SKRSContext2D

  // ── 1. Foto de fondo — full bleed ───────────────────────────────────────────
  try {
    let imgBuf: Buffer
    if (datos.imagenUrl.startsWith('http')) {
      const r = await fetch(datos.imagenUrl)
      imgBuf  = Buffer.from(await r.arrayBuffer())
    } else {
      const fs = await import('fs')
      imgBuf   = fs.readFileSync(datos.imagenUrl)
    }
    const resized = await sharp(imgBuf).resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer()
    const bg      = await loadImage(resized)
    ctx.drawImage(bg, 0, 0, W, H)
  } catch {
    // Fallback: gradiente cálido diagonal si no hay foto
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0,   '#B8A898')
    grad.addColorStop(0.4, '#9C8B7B')
    grad.addColorStop(1,   '#3A3835')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Viñeta perimetral — 4 gradientes desde cada borde ──────────────────
  const vigDepth = 260
  const vigAlpha = 0.72

  // Tope
  const gTop = ctx.createLinearGradient(0, 0, 0, vigDepth)
  gTop.addColorStop(0, `rgba(0,0,0,${vigAlpha})`)
  gTop.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gTop
  ctx.fillRect(0, 0, W, vigDepth)

  // Fondo
  const gBot = ctx.createLinearGradient(0, H, 0, H - vigDepth)
  gBot.addColorStop(0, `rgba(0,0,0,${vigAlpha})`)
  gBot.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gBot
  ctx.fillRect(0, H - vigDepth, W, vigDepth)

  // Izquierda
  const gLeft = ctx.createLinearGradient(0, 0, vigDepth, 0)
  gLeft.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.7})`)
  gLeft.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gLeft
  ctx.fillRect(0, 0, vigDepth, H)

  // Derecha
  const gRight = ctx.createLinearGradient(W, 0, W - vigDepth, 0)
  gRight.addColorStop(0, `rgba(0,0,0,${vigAlpha * 0.7})`)
  gRight.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gRight
  ctx.fillRect(W - vigDepth, 0, vigDepth, H)

  // ── 3. Header flotante ───────────────────────────────────────────────────────
  const HH = 82
  const HW = W - FLOAT_M * 2
  const HX = FLOAT_M
  const HY = FLOAT_M

  ctx.fillStyle = C.headerBg
  roundRect(ctx, HX, HY, HW, HH, 16)

  // Emblema del pin
  const EMB_CX = HX + 44
  const EMB_CY = HY + HH / 2 - 2
  drawEmblema(ctx, EMB_CX, EMB_CY, 40)

  // Nombre firma
  const NX = EMB_CX + 32
  ctx.font          = 'bold 22px WorkSans'
  ctx.fillStyle     = C.crema
  ctx.textBaseline  = 'alphabetic'
  ctx.textAlign     = 'left'
  ctx.fillText('GUTLEBER & ASOC.', NX, HY + 36)
  ctx.font          = '11px WorkSans'
  ctx.fillStyle     = C.arena
  ctx.globalAlpha   = 0.72
  ctx.fillText('INMOBILIARIA BOUTIQUE  ·  POSADAS', NX, HY + 56)
  ctx.globalAlpha   = 1

  // Badge modo — flotante grande, debajo del header, izquierda
  if (datos.enAlquiler || datos.enVenta) {
    const modoLabel = datos.enAlquiler && datos.enVenta
      ? 'ALQUILER  ·  VENTA'
      : datos.enAlquiler ? 'EN ALQUILER' : 'EN VENTA'
    const badgeBg = datos.enVenta && !datos.enAlquiler ? C.badgeArena : C.badgePiedra
    const MODO_FONT = 'bold 26px WorkSans'
    ctx.font = MODO_FONT
    const tw  = ctx.measureText(modoLabel).width
    const bw  = tw + 40
    const bh  = 52
    const bx  = FLOAT_M
    const by  = HY + HH + 18
    ctx.fillStyle = badgeBg
    roundRect(ctx, bx, by, bw, bh, bh / 2)
    ctx.fillStyle    = C.carbon
    ctx.textBaseline = 'middle'
    ctx.textAlign    = 'center'
    ctx.fillText(modoLabel, bx + bw / 2, by + bh / 2)
  }

  // ── 4. Panel de datos flotante (inferior) ────────────────────────────────────
  const tipoLabel = TIPO_LABEL[datos.tipo] || datos.tipo
  const caract: string[] = []
  if (datos.superficie)    caract.push(`${datos.superficie} m²`)
  if (datos.habitaciones)  caract.push(`${datos.habitaciones} dorm.`)
  if (datos.banos)         caract.push(`${datos.banos} baño${datos.banos > 1 ? 's' : ''}`)

  const precioTexto = datos.enAlquiler && datos.alquilerBase
    ? formatARS(datos.alquilerBase)
    : datos.enVenta && datos.valorVenta
    ? `USD ${datos.valorVenta.toLocaleString('es-AR')}`
    : null

  const PANEL_W = W - FLOAT_M * 2
  // Calcular altura dinámica del panel
  let panelH = IPAD                                 // padding top
    + 34 + 14                                       // badge tipo + gap
    + (Math.min(wrapText(ctx, datos.direccion, PANEL_W - IPAD * 2).length, 2)) * 56
    + (caract.length > 0 ? 28 + 10 : 0)            // características
    + (datos.descripcion ? 30 + 6 : 0)             // descripción
    + 1 + 16                                        // divisor
    + (precioTexto ? 70 : 0)                        // precio
    + IPAD                                          // padding bottom
  panelH = Math.max(panelH, 280)

  const PANEL_X = FLOAT_M
  const PANEL_Y = H - panelH - FLOAT_M

  ctx.fillStyle = C.panelBg
  roundRect(ctx, PANEL_X, PANEL_Y, PANEL_W, panelH, 18)

  let cy = PANEL_Y + IPAD

  // Badge tipo
  ctx.textAlign = 'left'
  drawPill(ctx, tipoLabel, PANEL_X + IPAD, cy, C.badgePiedra, C.crema, 13, 16, 8)
  cy += 34 + 14

  // Dirección
  ctx.font         = 'bold 44px Lora'
  ctx.fillStyle    = C.white
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'
  const lineasDir  = wrapText(ctx, datos.direccion, PANEL_W - IPAD * 2)
  for (let i = 0; i < Math.min(lineasDir.length, 2); i++) {
    ctx.fillText(lineasDir[i], PANEL_X + IPAD, cy)
    cy += 54
  }
  cy += 4

  // Descripción breve (opcional)
  if (datos.descripcion) {
    const desc = datos.descripcion.length > 80
      ? datos.descripcion.slice(0, 77) + '…'
      : datos.descripcion
    ctx.font      = '18px WorkSans'
    ctx.fillStyle = 'rgba(196,176,154,0.78)'
    ctx.fillText(desc, PANEL_X + IPAD, cy)
    cy += 30
  }

  // Características
  if (caract.length > 0) {
    ctx.font         = '20px WorkSans'
    ctx.textBaseline = 'top'
    let cx = PANEL_X + IPAD
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
    cy += 28 + 10
  }

  // Línea divisora
  ctx.fillStyle    = C.arena
  ctx.globalAlpha  = 0.18
  ctx.fillRect(PANEL_X + IPAD, cy, PANEL_W - IPAD * 2, 1)
  ctx.globalAlpha  = 1
  cy += 16

  // Precio
  if (precioTexto) {
    ctx.font         = 'bold 54px Lora'
    ctx.fillStyle    = C.white
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'left'
    ctx.fillText(precioTexto, PANEL_X + IPAD, cy)
    if (datos.enAlquiler) {
      const pw = ctx.measureText(precioTexto).width
      ctx.font         = '18px WorkSans'
      ctx.fillStyle    = C.arena
      ctx.textBaseline = 'alphabetic'
      ctx.fillText('/ mes', PANEL_X + IPAD + pw + 14, cy + 50)
    }
  }

  // ── 5. Footer (sobre la foto, bajo el panel) ──────────────────────────────
  const footerY = H - 22

  // Línea decorativa arena (izquierda)
  ctx.fillStyle   = C.arena
  ctx.globalAlpha = 0.62
  ctx.fillRect(FLOAT_M, footerY - 8, 44, 3)
  ctx.globalAlpha = 1

  // URL derecha
  ctx.font          = '15px WorkSans'
  ctx.fillStyle     = C.piedra
  ctx.textBaseline  = 'alphabetic'
  ctx.textAlign     = 'right'
  ctx.globalAlpha   = 0.82
  ctx.fillText('gutleber.com.ar', W - FLOAT_M, footerY)
  ctx.globalAlpha   = 1

  // ── Render final ──────────────────────────────────────────────────────────
  const pngBuf = canvas.toBuffer('image/png')
  return sharp(pngBuf).jpeg({ quality: 92 }).toBuffer()
}
