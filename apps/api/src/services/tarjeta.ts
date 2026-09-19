/**
 * Generador de tarjetas de propiedad — Gutleber & Co.
 * Canvas 1080×1080 px — Instagram / WhatsApp
 *
 * Paleta vigente (brand.config.json 2026-09-17, monocromática):
 *   Negro #000000 | Gris medio #A0A0A0 | Gris claro #E9E9E7 | Blanco roto #F7F7F5
 *
 * Layout:
 *   ┌────────────────────────────────────────┐
 *   │  [emblema  GUTLEBER & Co.]             │  header pill negro
 *   │                                        │
 *   │         FOTO  FULL-BLEED               │
 *   │         (vigneta fuerte desde abajo)   │
 *   │                                        │
 *   │  [EN ALQUILER] [EN VENTA]              │  badges gris medio
 *   │  RIVADAVIA 1450                        │  Poppins bold blanco
 *   │  Centro · Posadas                      │  gris medio italic
 *   │  $450.000/mes   USD 95.000             │  precios (ambos si aplica)
 *   │  120 m²  ·  3 dorm.  ·  2 baños       │  atributos
 *   │  ──────────────────────────────────    │  línea gris medio
 *   │  @gutleberasociados · Posadas          │  footer
 *   └────────────────────────────────────────┘
 */

import { createCanvas, loadImage, SKRSContext2D, GlobalFonts } from '@napi-rs/canvas'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// ── Fuentes ────────────────────────────────────────────────────────────────────
// Poppins (OFL) — marca "Gutleber & Co." 2026-09-17. WorkSans/Lora (marca azul
// anterior) quedan como .ttf sueltos en el repo por si hace falta revertir.
const FONTS_DIR = path.join(__dirname, '../../assets/fonts')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Poppins-Regular.ttf'), 'Poppins')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Poppins-Medium.ttf'),  'Poppins Medium')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Poppins-Bold.ttf'),    'Poppins')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Poppins-Italic.ttf'),  'Poppins')
GlobalFonts.registerFromPath(path.join(FONTS_DIR, 'Poppins-Light.ttf'),   'Poppins Light')

const IMGS_DIR = path.join(__dirname, '../../assets/img')

// ── Dimensiones ────────────────────────────────────────────────────────────────
const W  = 1080
const H  = 1080
const M  = 40     // margen exterior
const P  = 32     // padding interior del panel

// ── Paleta ─────────────────────────────────────────────────────────────────────
// Monocromática — marca "Gutleber & Co." 2026-09-17 (antes azul Petróleo/Acero)
const C = {
  petroleo:    '#000000',
  acero:       '#A0A0A0',
  crema:       '#E9E9E7',
  carbon:      '#121212',
  white:       '#F7F7F5',
  panelBg:     'rgba(0,0,0,0.93)',
  headerBg:    'rgba(0,0,0,0.90)',
  aceroD:      'rgba(160,160,160,0.85)',
}

const TIPO_LABEL: Record<string, string> = {
  CASA: 'CASA', DEPARTAMENTO: 'DPTO.', LOCAL: 'LOCAL', TERRENO: 'TERRENO', OFICINA: 'OFICINA',
}

const fmtARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

// ── Utilidades canvas ──────────────────────────────────────────────────────────

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

function roundRectTopOnly(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + r)
  ctx.lineTo(x + w, y + h)
  ctx.lineTo(x, y + h)
  ctx.lineTo(x, y + r)
  ctx.quadraticCurveTo(x, y, x + r, y)
  ctx.closePath()
  ctx.fill()
}

function wrapText(ctx: SKRSContext2D, text: string, maxW: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const test = line ? `${line} ${word}` : word
    if (ctx.measureText(test).width > maxW) {
      if (line) lines.push(line)
      line = word
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines
}

function badge(
  ctx: SKRSContext2D,
  label: string,
  x: number, y: number,
  bg: string, fg: string,
  fontSize = 17, padH = 18, padV = 10,
): number {
  ctx.font = `bold ${fontSize}px Poppins`
  const tw = ctx.measureText(label).width
  const bw = tw + padH * 2
  const bh = fontSize + padV * 2
  ctx.fillStyle = bg
  roundRect(ctx, x, y, bw, bh, bh / 2)
  ctx.fillStyle = fg
  ctx.textBaseline = 'middle'
  ctx.textAlign    = 'left'
  ctx.fillText(label, x + padH, y + bh / 2)
  return bw
}

// ── Interfaz pública ───────────────────────────────────────────────────────────

export interface DatosTarjeta {
  imagenUrl:    string
  tipo:         string
  direccion:    string
  barrio?:      string | null
  superficie?:  number | null
  enAlquiler:   boolean
  enVenta:      boolean
  alquilerBase?: number | null
  valorVenta?:  number | null
  descripcion?: string | null
  habitaciones?: number | null
  banos?:       number | null
  cochera?:     boolean | null
}

// ── Generador ─────────────────────────────────────────────────────────────────

export async function generarTarjeta(datos: DatosTarjeta): Promise<Buffer> {
  const canvas = createCanvas(W, H)
  const ctx    = canvas.getContext('2d') as SKRSContext2D

  // ── 1. Foto full-bleed ───────────────────────────────────────────────────────
  try {
    let imgBuf: Buffer
    if (datos.imagenUrl.startsWith('http')) {
      const r = await fetch(datos.imagenUrl)
      imgBuf  = Buffer.from(await r.arrayBuffer())
    } else {
      imgBuf = fs.readFileSync(datos.imagenUrl)
    }
    const resized = await sharp(imgBuf).resize(W, H, { fit: 'cover', position: 'centre' }).toBuffer()
    ctx.drawImage(await loadImage(resized), 0, 0, W, H)
  } catch {
    // Fallback: gradiente si no hay foto
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#1A1A1A')
    g.addColorStop(1, '#0A0A0A')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Vigneta — fuerte desde abajo, suave arriba ────────────────────────────
  const gTop = ctx.createLinearGradient(0, 0, 0, 320)
  gTop.addColorStop(0, 'rgba(0,0,0,0.70)')
  gTop.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gTop
  ctx.fillRect(0, 0, W, 320)

  const gBot = ctx.createLinearGradient(0, H, 0, H - 520)
  gBot.addColorStop(0, 'rgba(0,0,0,0.95)')
  gBot.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gBot
  ctx.fillRect(0, H - 520, W, 520)

  // ── 3. Header — emblema + nombre de firma ────────────────────────────────────
  const HH = 78, HW = W - M * 2, HX = M, HY = M
  ctx.fillStyle = C.headerBg
  roundRect(ctx, HX, HY, HW, HH, 14)

  // Emblema PNG
  const embPath = path.join(IMGS_DIR, 'emblema_oscuro.png')
  if (fs.existsSync(embPath)) {
    const embImg = await loadImage(fs.readFileSync(embPath))
    const eh = 52, ew = Math.round(52 * embImg.width / embImg.height)
    ctx.drawImage(embImg, HX + 20, HY + (HH - eh) / 2, ew, eh)

    // Texto firma
    const TX = HX + 20 + ew + 16
    ctx.font         = 'bold 22px Poppins'
    ctx.fillStyle    = C.crema
    ctx.textBaseline = 'alphabetic'
    ctx.textAlign    = 'left'
    ctx.fillText('GUTLEBER & Co.', TX, HY + 36)
    ctx.font         = '11px Poppins'
    ctx.fillStyle    = C.acero
    ctx.globalAlpha  = 0.80
    ctx.fillText('BIENES RAÍCES  ·  POSADAS, MISIONES', TX, HY + 56)
    ctx.globalAlpha  = 1
  }

  // ── 4. Panel inferior ────────────────────────────────────────────────────────
  // Calcular alturas dinámicamente
  ctx.font = 'bold 48px Poppins'
  const dirLines = wrapText(ctx, datos.direccion, W - M * 2 - P * 2)
  const nDirLines = Math.min(dirLines.length, 2)

  const hasBoth   = datos.enAlquiler && datos.enVenta
  const hasBarrio = !!(datos.barrio)
  const hasAlq    = datos.enAlquiler && !!datos.alquilerBase
  const hasVta    = datos.enVenta && !!datos.valorVenta

  const atribs = [
    datos.superficie  ? `${datos.superficie} m²`  : '',
    datos.habitaciones ? `${datos.habitaciones} dorm.` : '',
    datos.banos       ? `${datos.banos} baño${datos.banos > 1 ? 's' : ''}` : '',
    datos.cochera     ? 'cochera' : '',
  ].filter(Boolean)

  let panelH = P
    + 40 + 12                         // badges row
    + nDirLines * 58                  // dirección
    + (hasBarrio ? 36 + 8 : 0)        // barrio
    + ((hasAlq || hasVta) ? 70 + 8 : 0)   // precio alq
    + (hasBoth && hasAlq && hasVta ? 56 + 8 : 0)  // segundo precio
    + (atribs.length ? 32 + 10 : 0)   // atributos
    + 1 + 20                           // divisor
    + 30                               // footer handle
    + P
  panelH = Math.max(panelH, 320)

  const PX = M, PY = H - panelH - M, PW = W - M * 2

  // Panel con esquinas superiores redondeadas
  ctx.fillStyle = C.panelBg
  roundRectTopOnly(ctx, PX, PY, PW, panelH, 20)

  let cy = PY + P

  // ── Badges ────────────────────────────────────────────────────────────────────
  let bx = PX + P
  if (datos.enAlquiler) {
    const bw = badge(ctx, 'EN ALQUILER', bx, cy, C.acero, C.carbon, 16, 20, 10)
    bx += bw + 10
  }
  if (datos.enVenta) {
    badge(ctx, 'EN VENTA', bx, cy, C.crema, C.carbon, 16, 20, 10)
  }
  cy += 40 + 12

  // ── Tipo chip pequeño ────────────────────────────────────────────────────────
  const tipoLabel = TIPO_LABEL[datos.tipo] || datos.tipo
  ctx.font         = '13px Poppins'
  ctx.fillStyle    = C.aceroD
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'
  ctx.fillText(tipoLabel, PX + P, cy)
  cy += 20

  // ── Dirección ─────────────────────────────────────────────────────────────────
  ctx.font         = 'bold 48px Poppins'
  ctx.fillStyle    = C.white
  ctx.textBaseline = 'top'
  for (let i = 0; i < nDirLines; i++) {
    ctx.fillText(dirLines[i], PX + P, cy)
    cy += 56
  }
  cy += 2

  // ── Barrio ────────────────────────────────────────────────────────────────────
  if (hasBarrio) {
    ctx.font         = 'italic 22px Poppins'
    ctx.fillStyle    = C.acero
    ctx.textBaseline = 'top'
    ctx.fillText(`${datos.barrio}  ·  Posadas, Misiones`, PX + P, cy)
    cy += 36 + 8
  }

  // ── Precios ───────────────────────────────────────────────────────────────────
  if (hasAlq) {
    ctx.font         = 'bold 44px Poppins'
    ctx.fillStyle    = C.acero
    ctx.textBaseline = 'top'
    const txt = fmtARS(datos.alquilerBase!)
    ctx.fillText(txt, PX + P, cy)
    const tw = ctx.measureText(txt).width
    ctx.font         = '18px Poppins'
    ctx.fillStyle    = C.crema
    ctx.textBaseline = 'alphabetic'
    ctx.globalAlpha  = 0.70
    ctx.fillText('/ mes', PX + P + tw + 10, cy + 42)
    ctx.globalAlpha  = 1
    cy += 58 + 8
  }
  if (hasVta) {
    ctx.font         = hasBoth ? 'bold 36px Poppins' : 'bold 44px Poppins'
    ctx.fillStyle    = hasBoth ? C.crema : C.acero
    ctx.textBaseline = 'top'
    ctx.fillText(`USD ${datos.valorVenta!.toLocaleString('es-AR')}`, PX + P, cy)
    cy += (hasBoth ? 44 : 58) + 8
  }

  // ── Atributos ─────────────────────────────────────────────────────────────────
  if (atribs.length > 0) {
    ctx.textBaseline = 'top'
    ctx.textAlign    = 'left'
    let ax = PX + P
    for (let i = 0; i < atribs.length; i++) {
      ctx.font      = '20px Poppins'
      ctx.fillStyle = C.crema
      ctx.fillText(atribs[i], ax, cy)
      ax += ctx.measureText(atribs[i]).width
      if (i < atribs.length - 1) {
        ctx.fillStyle = C.acero
        ctx.fillText('  ·  ', ax, cy)
        ax += ctx.measureText('  ·  ').width
      }
    }
    cy += 32 + 10
  }

  // ── Divisor ───────────────────────────────────────────────────────────────────
  ctx.fillStyle   = C.acero
  ctx.globalAlpha = 0.30
  ctx.fillRect(PX + P, cy, PW - P * 2, 1)
  ctx.globalAlpha = 1
  cy += 20

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.font         = '18px Poppins'
  ctx.fillStyle    = C.acero
  ctx.textBaseline = 'top'
  ctx.textAlign    = 'left'
  ctx.globalAlpha  = 0.80
  ctx.fillText('@gutleberasociados  ·  gutleberyasociados.com', PX + P, cy)
  ctx.globalAlpha  = 1

  // ── Render ────────────────────────────────────────────────────────────────────
  return sharp(canvas.toBuffer('image/png')).jpeg({ quality: 93 }).toBuffer()
}
