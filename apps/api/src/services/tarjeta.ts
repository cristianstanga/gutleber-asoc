/**
 * Generador de tarjetas de propiedad con datos superpuestos.
 * Usa @napi-rs/canvas para dibujar sobre imágenes con texto, badges y branding.
 *
 * Paleta Gutleber:
 *   Carbón    #2C2C2A
 *   Piedra    #8C7B6B
 *   Arena     #C4B09A
 *   Crema     #F0E8DC
 */

import { createCanvas, loadImage, SKRSContext2D } from '@napi-rs/canvas'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// ─── Constantes de diseño ─────────────────────────────────────────────────────

const W = 1080   // ancho tarjeta (square Instagram / WhatsApp)
const H = 1080   // alto tarjeta

const COLOR = {
  carbon:  '#2C2C2A',
  piedra:  '#8C7B6B',
  arena:   '#C4B09A',
  crema:   '#F0E8DC',
  white:   '#FFFFFF',
  overlay: 'rgba(44, 44, 42, 0.65)',  // overlay oscuro sobre foto
  badge:   'rgba(140, 123, 107, 0.92)',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const TIPO_LABEL: Record<string, string> = {
  CASA: 'CASA', DEPARTAMENTO: 'DEPARTAMENTO', LOCAL: 'LOCAL COMERCIAL',
  TERRENO: 'TERRENO', OFICINA: 'OFICINA',
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? `${current} ${word}` : word
    if (ctx.measureText(test).width > maxWidth) {
      if (current) lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

// ─── Generador principal ──────────────────────────────────────────────────────

export interface DatosTarjeta {
  imagenUrl: string      // URL pública o path local
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

export async function generarTarjeta(datos: DatosTarjeta): Promise<Buffer> {
  const canvas = createCanvas(W, H)
  const ctx = canvas.getContext('2d')

  // ── 1. Foto de fondo ────────────────────────────────────────────────────────
  try {
    // Descargar/cargar imagen y redimensionar a 1080x1080
    let imgBuffer: Buffer
    if (datos.imagenUrl.startsWith('http')) {
      const resp = await fetch(datos.imagenUrl)
      const ab = await resp.arrayBuffer()
      imgBuffer = Buffer.from(ab)
    } else {
      imgBuffer = fs.readFileSync(datos.imagenUrl)
    }

    // Sharp: resize + crop centrado
    const resized = await sharp(imgBuffer)
      .resize(W, H, { fit: 'cover', position: 'centre' })
      .toBuffer()

    const bgImg = await loadImage(resized)
    ctx.drawImage(bgImg, 0, 0, W, H)
  } catch {
    // Fallback: fondo degradado arena/carbón si la imagen falla
    const grad = ctx.createLinearGradient(0, 0, W, H)
    grad.addColorStop(0, '#C4B09A')
    grad.addColorStop(1, '#2C2C2A')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Overlay degradado inferior ───────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, H * 0.35, 0, H)
  grad.addColorStop(0, 'rgba(44,44,42,0)')
  grad.addColorStop(0.5, 'rgba(44,44,42,0.72)')
  grad.addColorStop(1, 'rgba(44,44,42,0.92)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // ── 3. Badge tipo de propiedad (arriba izquierda) ───────────────────────────
  const tipoLabel = TIPO_LABEL[datos.tipo] || datos.tipo
  ctx.fillStyle = COLOR.badge
  const badgePad = 18
  ctx.font = 'bold 22px sans-serif'
  const badgeW = (ctx as SKRSContext2D).measureText(tipoLabel).width + badgePad * 2
  const badgeH = 46
  const badgeX = 36
  const badgeY = 36
  roundRect(ctx, badgeX, badgeY, badgeW, badgeH, 8)
  ctx.fillStyle = COLOR.white
  ctx.font = 'bold 22px sans-serif'
  ctx.textBaseline = 'middle'
  ctx.fillText(tipoLabel, badgeX + badgePad, badgeY + badgeH / 2)

  // Badge ALQUILER / VENTA (arriba derecha)
  if (datos.enAlquiler || datos.enVenta) {
    const modoLabel = datos.enAlquiler && datos.enVenta
      ? 'ALQUILER · VENTA'
      : datos.enAlquiler ? 'EN ALQUILER' : 'EN VENTA'
    ctx.font = 'bold 22px sans-serif'
    const modoW = (ctx as SKRSContext2D).measureText(modoLabel).width + badgePad * 2
    ctx.fillStyle = datos.enVenta && !datos.enAlquiler ? '#8C7B6B' : COLOR.badge
    roundRect(ctx, W - modoW - 36, badgeY, modoW, badgeH, 8)
    ctx.fillStyle = COLOR.white
    ctx.fillText(modoLabel, W - modoW - 36 + badgePad, badgeY + badgeH / 2)
  }

  // ── 4. Bloque inferior de datos ─────────────────────────────────────────────
  let y = H - 60  // empezar desde abajo

  // Branding inferior: "Gutleber & Asoc."
  ctx.font = '22px sans-serif'
  ctx.fillStyle = COLOR.arena
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'right'
  ctx.fillText('gutleber.com.ar', W - 36, y)
  ctx.textAlign = 'left'
  y -= 32

  // Precio
  const precioTexto = datos.enAlquiler && datos.alquilerBase
    ? formatARS(datos.alquilerBase) + ' / mes'
    : datos.enVenta && datos.valorVenta
    ? `USD ${datos.valorVenta.toLocaleString('es-AR')}`
    : ''

  if (precioTexto) {
    ctx.font = 'bold 52px sans-serif'
    ctx.fillStyle = COLOR.white
    ctx.fillText(precioTexto, 36, y)
    y -= 64
  }

  // Características: superficie, hab, baños
  const caract: string[] = []
  if (datos.superficie) caract.push(`📐 ${datos.superficie} m²`)
  if (datos.habitaciones) caract.push(`🛏 ${datos.habitaciones} dorm.`)
  if (datos.banos) caract.push(`🚿 ${datos.banos} baño${datos.banos > 1 ? 's' : ''}`)

  if (caract.length > 0) {
    ctx.font = '26px sans-serif'
    ctx.fillStyle = COLOR.arena
    ctx.fillText(caract.join('  ·  '), 36, y)
    y -= 42
  }

  // Dirección (puede ser larga, con wrap)
  ctx.font = 'bold 34px sans-serif'
  ctx.fillStyle = COLOR.white
  const lineasDir = wrapText(ctx as SKRSContext2D, datos.direccion, W - 72)
  for (let i = lineasDir.length - 1; i >= 0; i--) {
    ctx.fillText(lineasDir[i], 36, y)
    if (i > 0) y -= 44
  }
  y -= 50

  // Descripción breve (máx 2 líneas)
  if (datos.descripcion) {
    ctx.font = '24px sans-serif'
    ctx.fillStyle = 'rgba(240,232,220,0.80)'
    const desc = datos.descripcion.length > 100
      ? datos.descripcion.substring(0, 97) + '...'
      : datos.descripcion
    const lineasDesc = wrapText(ctx as SKRSContext2D, desc, W - 72)
    for (let i = Math.min(lineasDesc.length - 1, 1); i >= 0; i--) {
      ctx.fillText(lineasDesc[i], 36, y)
      if (i > 0) y -= 34
    }
  }

  // ── 5. Logo / marca superior ────────────────────────────────────────────────
  ctx.font = 'bold 28px sans-serif'
  ctx.fillStyle = COLOR.white
  ctx.textBaseline = 'middle'
  const logoY = badgeY + badgeH / 2
  // Centrado
  ctx.textAlign = 'center'
  ctx.fillStyle = 'rgba(255,255,255,0.0)' // invisible, solo para posición
  // Línea separadora superior
  ctx.strokeStyle = 'rgba(196,176,154,0.4)'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(36, badgeY + badgeH + 20)
  ctx.lineTo(W - 36, badgeY + badgeH + 20)
  ctx.stroke()

  ctx.textAlign = 'left'

  // Renderizar a PNG con sharp para comprimir
  const pngBuffer = canvas.toBuffer('image/png')
  const jpegBuffer = await sharp(pngBuffer)
    .jpeg({ quality: 90 })
    .toBuffer()

  return jpegBuffer
}

// ─── Helper: rectángulo redondeado ────────────────────────────────────────────

function roundRect(
  ctx: SKRSContext2D,
  x: number, y: number, w: number, h: number, r: number
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
