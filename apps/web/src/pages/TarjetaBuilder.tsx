import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Download, RotateCcw, ImagePlus, X, ChevronLeft, ChevronRight, Layers, Pencil } from 'lucide-react'
import { api } from '../lib/api'

// ── Paleta de marca ───────────────────────────────────────────────────────────
const C = {
  petroleo:   '#0D3B4E',
  acero:      '#7FA1BB',
  crema:      '#E7EBEE',
  carbon:     '#091E2E',
  white:      '#F7F7F5',
  headerBg:   'rgba(13,59,78,0.90)',
  panelBg:    'rgba(13,59,78,0.93)',
  aceroD:     'rgba(127,161,187,0.85)',
}

// ── Catálogos ─────────────────────────────────────────────────────────────────
const TIPOS   = ['Casa', 'Departamento', 'Dúplex', 'PH', 'Local', 'Oficina', 'Terreno']
const TIPO_MAP: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}
const CARACTS = ['Garage', 'Cochera', 'Pileta', 'Jardín', 'Terraza', 'Balcón', 'Parrilla', 'Seguridad', 'Amueblado']

type Formato   = '1:1' | '9:16'
type Operacion = 'alquiler' | 'venta' | 'ambas'
type Moneda    = 'ARS' | 'USD'

interface CardState {
  formato:      Formato
  operacion:    Operacion
  tipo:         string
  direccion:    string
  superficie:   string
  precio:       string
  moneda:       Moneda
  habitaciones: string
  banos:        string
  caracts:      Set<string>
  fotos:        string[]
  fotoIdx:      number
  offsetX:      number
  offsetY:      number
  zoom:         number
}

const CANVAS_W: Record<Formato, number> = { '1:1': 1080, '9:16': 1080 }
const CANVAS_H: Record<Formato, number> = { '1:1': 1080, '9:16': 1920 }
const DISPLAY_W = 480 // ancho CSS del preview

// ── Font loading ──────────────────────────────────────────────────────────────
let fontsLoaded = false
async function ensureFonts() {
  if (fontsLoaded) return
  try {
    await Promise.all([
      new FontFace('WorkSans', 'url(/fonts/WorkSans-Regular.ttf)').load().then(f => document.fonts.add(f)),
      new FontFace('WorkSans', 'url(/fonts/WorkSans-Bold.ttf)', { weight: 'bold' }).load().then(f => document.fonts.add(f)),
      new FontFace('Lora',     'url(/fonts/Lora-Regular.ttf)').load().then(f => document.fonts.add(f)),
    ])
    fontsLoaded = true
  } catch { /* usa sistema si falla */ }
}

// ── Canvas drawing helpers ────────────────────────────────────────────────────
function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

// ── Función principal de dibujo ───────────────────────────────────────────────
function drawCard(
  ctx: CanvasRenderingContext2D,
  W: number, H: number,
  s: CardState,
  img: HTMLImageElement | null,
  embImg: HTMLImageElement | null,
) {
  ctx.clearRect(0, 0, W, H)
  const M      = Math.round(W * 0.038)
  const STRIP_H = Math.round(W * 0.265)  // franja de datos — fija por ancho
  const PH      = H - STRIP_H

  // ── Foto — ocupa todo el canvas (incluye zona franja) ─────────────────────
  if (img && img.complete && img.naturalWidth > 0) {
    ctx.save()
    ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip()
    const ia = img.naturalWidth / img.naturalHeight
    const ca = W / H
    let bw: number, bh: number
    if (ia > ca) { bh = H * s.zoom; bw = bh * ia }
    else         { bw = W * s.zoom; bh = bw / ia }
    ctx.drawImage(img, (W - bw) / 2 + s.offsetX, (H - bh) / 2 + s.offsetY, bw, bh)
    ctx.restore()
  } else {
    const g = ctx.createLinearGradient(0, 0, W, H)
    g.addColorStop(0, '#1C3A52'); g.addColorStop(1, '#0A1A28')
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H)
  }

  // ── Gradiente arriba — para el ribbon ─────────────────────────────────────
  const gT = ctx.createLinearGradient(0, 0, 0, H * 0.18)
  gT.addColorStop(0, 'rgba(8,18,28,0.55)'); gT.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = gT; ctx.fillRect(0, 0, W, H * 0.18)

  // ── Degrade petróleo desde ~63% → sólido al final ────────────────────────
  const gStrip = ctx.createLinearGradient(0, H * 0.63, 0, H)
  gStrip.addColorStop(0,    'rgba(15,34,51,0)')
  gStrip.addColorStop(0.28, 'rgba(15,34,51,0.70)')
  gStrip.addColorStop(0.58, 'rgba(15,34,51,0.93)')
  gStrip.addColorStop(1,    'rgba(15,34,51,0.98)')
  ctx.fillStyle = gStrip; ctx.fillRect(0, H * 0.63, W, H * 0.37)

  // ── Ribbon diagonal — top-right ───────────────────────────────────────────
  const rlabel = s.operacion === 'ambas' ? 'ALQUILER / VENTA'
    : s.operacion === 'alquiler' ? 'EN ALQUILER' : 'EN VENTA'
  const rBg = s.operacion === 'venta' ? C.crema : C.acero
  ctx.save()
  ctx.translate(W, 0)
  ctx.rotate(Math.PI / 4)
  const rBW = Math.round(W * 0.42), rBH = Math.round(W * 0.062), rCY = Math.round(W * 0.155)
  ctx.fillStyle = rBg
  ctx.fillRect(-rBW / 2, rCY - rBH / 2, rBW, rBH)
  ctx.font = `bold ${Math.round(rBH * 0.50)}px WorkSans`
  ctx.fillStyle = C.carbon; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
  ctx.fillText(rlabel, 0, rCY)
  ctx.restore()

  // ── Texto sobre foto — dirección (hero) + tipo (label pequeño) ──────────
  ctx.shadowColor = 'rgba(0,0,0,0.65)'; ctx.shadowBlur = 6

  // Dirección — texto hero (60%)
  const dirFsz2 = Math.round(W * 0.052)
  ctx.font = `bold ${dirFsz2}px Lora`
  ctx.fillStyle = C.white; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left'
  ctx.fillText(s.direccion || 'Dirección de la propiedad', M, PH - Math.round(W * 0.040))

  // Tipo — label pequeño encima (40%)
  const tipoFsz = Math.round(W * 0.022)
  ctx.font = `bold ${tipoFsz}px WorkSans`
  ctx.fillStyle = C.acero; ctx.globalAlpha = 0.88
  ctx.fillText(s.tipo.toUpperCase(), M, PH - Math.round(W * 0.040) - dirFsz2 - Math.round(W * 0.010))
  ctx.globalAlpha = 1

  // ── Precio — pill bottom-right ────────────────────────────────────────────
  ctx.shadowBlur = 0
  const hasPrecio = !!(s.precio && +s.precio > 0)
  if (hasPrecio) {
    const pFmt = s.moneda === 'ARS'
      ? `AR$ ${new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 }).format(+s.precio)}`
      : `USD ${new Intl.NumberFormat('es-AR').format(+s.precio)}`
    const pFsz = Math.round(W * 0.025)
    ctx.font = `bold ${pFsz}px WorkSans`
    const pW = ctx.measureText(pFmt).width + 36, pH2 = pFsz + 24
    const pX = W - M - pW, pY = PH - Math.round(W * 0.128)
    ctx.fillStyle = C.petroleo; ctx.globalAlpha = 0.88
    rr(ctx, pX, pY, pW, pH2, 8)
    ctx.globalAlpha = 1
    ctx.fillStyle = C.acero; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
    ctx.fillText(pFmt, pX + pW / 2, pY + pH2 / 2)
    if (s.operacion !== 'venta') {
      ctx.font = `${Math.round(pFsz * 0.64)}px WorkSans`
      ctx.fillStyle = C.crema; ctx.globalAlpha = 0.62
      ctx.fillText('/ mes', pX + pW / 2, pY + pH2 / 2 + pFsz * 0.88)
      ctx.globalAlpha = 1
    }
  }
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0

  // ── Franja datos (flotando sobre el degrade) ──────────────────────────────
  // NO hay fillRect sólido — el degrade de arriba ya da el fondo
  // Línea decorativa champagne muy sutil
  ctx.fillStyle = C.acero; ctx.globalAlpha = 0.25
  ctx.fillRect(M, PH + Math.round(STRIP_H * 0.08), W - M * 2, 1)
  ctx.globalAlpha = 1

  const SP   = M
  const SMY  = PH + STRIP_H / 2

  // ── Grilla 4×3 de atributos ───────────────────────────────────────────────
  const atribs: string[] = []
  if (s.superficie)   atribs.push(`${s.superficie} m²`)
  if (s.habitaciones) atribs.push(+s.habitaciones === 1 ? '1 hab.' : `${s.habitaciones} hab.`)
  if (s.banos)        atribs.push(+s.banos === 1 ? '1 baño' : `${s.banos} baños`)
  s.caracts.forEach(c => atribs.push(c))

  const LOGO_ZONE = Math.round(W * 0.27)
  const DATA_W    = W - SP * 2 - LOGO_ZONE
  const COLS      = 3
  const ROWS      = 4
  const cellW     = DATA_W / COLS
  const aFsz      = Math.round(W * 0.020)
  const rowH      = Math.round(STRIP_H * 0.222)
  const gridTop   = PH + (STRIP_H - rowH * ROWS) / 2 + Math.round(aFsz * 0.85)

  atribs.slice(0, COLS * ROWS).forEach((a, i) => {
    const col = i % COLS
    const row = Math.floor(i / COLS)
    ctx.font         = `bold ${aFsz}px WorkSans`
    ctx.fillStyle    = row === 0 ? C.acero : C.crema
    ctx.globalAlpha  = row === 0 ? 1 : 0.85
    ctx.textAlign    = 'left'; ctx.textBaseline = 'alphabetic'
    ctx.fillText(a, SP + col * cellW, gridTop + row * rowH)
    ctx.globalAlpha  = 1
  })

  // ── Logo + firma — columna derecha ────────────────────────────────────────
  const embH  = Math.round(STRIP_H * 0.58)
  const embW  = embImg ? Math.round(embH * embImg.naturalWidth / embImg.naturalHeight) : 0
  const logoX = W - SP - embW
  if (embImg && embImg.complete && embImg.naturalWidth > 0) {
    ctx.drawImage(embImg, logoX, SMY - embH / 2, embW, embH)
  }
  const fFsz = Math.round(W * 0.018)
  const firmX = logoX - 12
  ctx.font = `bold ${fFsz}px WorkSans`
  ctx.fillStyle = C.crema; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic'
  ctx.fillText('GUTLEBER', firmX, SMY - fFsz * 0.15)
  ctx.fillText('& ASOCIADOS', firmX, SMY + fFsz * 1.25)
  ctx.font = `${Math.round(fFsz * 0.72)}px WorkSans`
  ctx.fillStyle = C.acero; ctx.globalAlpha = 0.76
  ctx.fillText('NEGOCIOS INMOBILIARIOS', firmX, SMY + fFsz * 2.55)
  ctx.globalAlpha = 1
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function TarjetaBuilder() {
  const [s, setS] = useState<CardState>({
    formato: '1:1', operacion: 'alquiler', tipo: 'Departamento',
    direccion: '', superficie: '', precio: '', moneda: 'ARS',
    habitaciones: '', banos: '', caracts: new Set(),
    fotos: [], fotoIdx: 0, offsetX: 0, offsetY: 0, zoom: 1,
  })

  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const imgRef      = useRef<HTMLImageElement | null>(null)
  const embRef      = useRef<HTMLImageElement | null>(null)
  const dragging    = useRef(false)
  const dragStart   = useRef({ x: 0, y: 0, ox: 0, oy: 0 })
  const [fontsOk, setFontsOk]     = useState(false)
  const [phase, setPhase]         = useState<1 | 2 | 3>(1)
  const [propNombre, setPropNombre] = useState<string>('')
  const [searchParams] = useSearchParams()

  const CW = CANVAS_W[s.formato]
  const CH = CANVAS_H[s.formato]
  const displayH = Math.round(DISPLAY_W * CH / CW)
  const ratio    = CW / DISPLAY_W

  // Load fonts + emblema once
  useEffect(() => {
    ensureFonts().then(() => setFontsOk(true))
    const e = new Image()
    e.onload = () => { embRef.current = e }
    e.src = '/emblema_oscuro.svg'
  }, [])

  // Pre-fill from property when ?propId is present
  useEffect(() => {
    const propId = searchParams.get('propId')
    if (!propId) return
    api.get(`/propiedades/${propId}`).then(r => {
      const p = r.data
      const operacion: Operacion = p.enAlquiler && p.enVenta ? 'ambas' : p.enAlquiler ? 'alquiler' : 'venta'
      const precio = p.enAlquiler ? (p.alquilerBase ?? '') : (p.valorVenta ?? '')
      // Normalizar URLs: mismo hostname → path relativo (evita CORS en canvas)
      const fotos: string[] = (p.imagenes ?? []).map((img: { url: string }) => {
        try {
          const u = new URL(img.url, window.location.href)
          if (u.hostname === window.location.hostname) return u.pathname + u.search
          return img.url
        } catch { return img.url }
      })
      setPropNombre(p.direccion ?? '')
      setS(prev => ({
        ...prev,
        direccion:    p.direccion ?? prev.direccion,
        tipo:         TIPO_MAP[p.tipo] ?? prev.tipo,
        operacion,
        superficie:   p.superficie != null ? String(p.superficie) : prev.superficie,
        habitaciones: p.dormitorios != null ? String(p.dormitorios) : prev.habitaciones,
        banos:        p.banos != null ? String(p.banos) : prev.banos,
        precio:       precio != null && precio !== '' ? String(precio) : prev.precio,
        fotos,
        fotoIdx: 0, offsetX: 0, offsetY: 0, zoom: 1,
      }))
    }).catch(() => {/* ignore — propId might be invalid */})
  }, [searchParams])

  // Load photo when fotoIdx or fotos changes
  useEffect(() => {
    if (!s.fotos[s.fotoIdx]) { imgRef.current = null; redraw(); return }
    const img = new Image()
    img.onload  = () => { imgRef.current = img; redraw() }
    img.onerror = () => { imgRef.current = null; redraw() }
    img.src = s.fotos[s.fotoIdx]
  }, [s.fotos, s.fotoIdx])

  // Redraw canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    drawCard(ctx, CW, CH, s, imgRef.current, embRef.current)
  }, [s, CW, CH])

  useEffect(() => { if (fontsOk) redraw() }, [s, fontsOk, redraw])

  // Mouse drag handlers
  const toCanvasX = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return (e.clientX - rect.left) * ratio
  }
  const toCanvasY = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return (e.clientY - rect.top) * ratio
  }

  const clampOffset = (ox: number, oy: number, zoom: number) => {
    if (!imgRef.current) return { ox, oy }
    const ia = imgRef.current.naturalWidth / imgRef.current.naturalHeight
    const ca = CW / CH
    let bw: number, bh: number
    if (ia > ca) { bh = CH * zoom; bw = bh * ia } else { bw = CW * zoom; bh = bw / ia }
    const maxX = (bw - CW) / 2, maxY = (bh - CH) / 2
    return {
      ox: Math.max(-maxX, Math.min(maxX, ox)),
      oy: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }

  const onMouseDown = (e: React.MouseEvent) => {
    dragging.current = true
    dragStart.current = { x: toCanvasX(e), y: toCanvasY(e), ox: s.offsetX, oy: s.offsetY }
  }
  const onMouseMove = (e: React.MouseEvent) => {
    if (!dragging.current) return
    const dx = toCanvasX(e) - dragStart.current.x
    const dy = toCanvasY(e) - dragStart.current.y
    const { ox, oy } = clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, s.zoom)
    setS(p => ({ ...p, offsetX: ox, offsetY: oy }))
  }
  const onMouseUp = () => { dragging.current = false }

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const newZoom = Math.max(1, Math.min(4, s.zoom - e.deltaY * 0.001))
    const { ox, oy } = clampOffset(s.offsetX, s.offsetY, newZoom)
    setS(p => ({ ...p, zoom: newZoom, offsetX: ox, offsetY: oy }))
  }

  const resetPosition = () => setS(p => ({ ...p, offsetX: 0, offsetY: 0, zoom: 1 }))

  // Photo upload
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    const urls = files.map(f => URL.createObjectURL(f))
    setS(p => ({ ...p, fotos: [...p.fotos, ...urls], fotoIdx: p.fotos.length, offsetX: 0, offsetY: 0, zoom: 1 }))
    e.target.value = ''
  }

  const removeFoto = (idx: number) => {
    URL.revokeObjectURL(s.fotos[idx])
    setS(p => {
      const fotos = p.fotos.filter((_, i) => i !== idx)
      return { ...p, fotos, fotoIdx: Math.min(p.fotoIdx, fotos.length - 1) }
    })
  }

  // Download
  const download = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.toBlob(blob => {
      if (!blob) return
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `tarjeta-gutleber-${Date.now()}.jpg`
      a.click()
    }, 'image/jpeg', 0.92)
  }

  // Toggle característica
  const toggleCaract = (c: string) => {
    setS(p => {
      const caracts = new Set(p.caracts)
      caracts.has(c) ? caracts.delete(c) : caracts.add(c)
      return { ...p, caracts }
    })
  }

  const up = (k: keyof CardState) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setS(p => ({ ...p, [k]: e.target.value }))

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex flex-col bg-[#111] text-white overflow-hidden">

      {/* Topbar */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10 bg-[#0d0d0d] shrink-0">
        <Layers size={16} className="text-arena" />
        <span className="font-semibold text-sm text-arena">Generador de Placas</span>
        <span className="text-white/50 text-sm">—</span>
        {propNombre ? (
          <span className="flex items-center gap-1.5 text-xs bg-white/8 border border-white/15 rounded-full px-2.5 py-1 text-white/80">
            <Pencil size={10} className="text-arena" />
            {propNombre}
          </span>
        ) : (
          <span className="text-arena/70 text-xs">Gutleber &amp; Asoc.</span>
        )}
        <div className="ml-auto flex gap-2">
          {([1, 2, 3] as const).map(n => (
            <button
              key={n}
              onClick={() => setPhase(n)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                phase === n ? 'bg-arena text-carbon' : 'bg-white/10 text-white/65 hover:bg-white/20 hover:text-white'
              }`}
            >
              <span className="w-4 h-4 rounded-full border border-current flex items-center justify-center text-[10px]">{n}</span>
              {n === 1 ? 'TARJETAS' : n === 2 ? 'UBICACIÓN' : 'DESCRIPCIÓN'}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Panel izquierdo: formulario ── */}
        <div className="w-80 shrink-0 overflow-y-auto bg-[#161616] border-r border-white/15 p-4 space-y-5">

          {/* Formato */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Formato</p>
            <div className="flex gap-2">
              {(['1:1', '9:16'] as Formato[]).map(f => (
                <button
                  key={f}
                  onClick={() => setS(p => ({ ...p, formato: f }))}
                  className={`flex-1 py-2.5 rounded-lg text-xs font-bold border transition-colors ${
                    s.formato === f
                      ? 'bg-arena text-carbon border-arena'
                      : 'border-white/25 text-white/70 hover:border-arena/60'
                  }`}
                >
                  {f === '1:1' ? '⬛ FEED 1:1' : '📱 HISTORIA 9:16'}
                </button>
              ))}
            </div>
          </section>

          {/* Operación */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Operación</p>
            <div className="flex gap-2 flex-wrap">
              {(['alquiler', 'venta', 'ambas'] as Operacion[]).map(op => (
                <button
                  key={op}
                  onClick={() => setS(p => ({ ...p, operacion: op }))}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    s.operacion === op
                      ? 'bg-piedra text-white border-piedra'
                      : 'border-white/25 text-white/70 hover:border-arena/60'
                  }`}
                >
                  {op === 'alquiler' ? 'Alquiler' : op === 'venta' ? 'Venta' : 'Ambas'}
                </button>
              ))}
            </div>
          </section>

          {/* Tipo */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Tipo de propiedad</p>
            <div className="flex gap-1.5 flex-wrap">
              {TIPOS.map(t => (
                <button
                  key={t}
                  onClick={() => setS(p => ({ ...p, tipo: t }))}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    s.tipo === t
                      ? 'bg-carbon text-crema border-piedra'
                      : 'border-white/25 text-white/70 hover:border-arena/60'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          {/* Dirección */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Dirección</p>
            <input
              value={s.direccion}
              onChange={up('direccion')}
              placeholder="Ej: San Martín 1234, Centro"
              className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena"
            />
          </section>

          {/* Superficie + Precio */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Superficie</p>
              <div className="relative">
                <input
                  value={s.superficie}
                  onChange={up('superficie')}
                  placeholder="90"
                  type="number"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena pr-8"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 text-xs">m²</span>
              </div>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Precio</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setS(p => ({ ...p, moneda: p.moneda === 'ARS' ? 'USD' : 'ARS' }))}
                  className="shrink-0 px-2 py-2 bg-white/10 border border-white/20 rounded-lg text-xs font-bold text-arena hover:bg-white/20 transition-colors"
                >
                  {s.moneda}
                </button>
                <input
                  value={s.precio}
                  onChange={up('precio')}
                  placeholder="700.000"
                  type="number"
                  className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena"
                />
              </div>
            </div>
          </section>

          {/* Habitaciones + Baños */}
          <section className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Habitaciones</p>
              <input
                value={s.habitaciones}
                onChange={up('habitaciones')}
                placeholder="2"
                type="number"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena"
              />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Baños</p>
              <input
                value={s.banos}
                onChange={up('banos')}
                placeholder="1"
                type="number"
                className="w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena"
              />
            </div>
          </section>

          {/* Características */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">Características</p>
            <div className="flex flex-wrap gap-1.5">
              {CARACTS.map(c => (
                <button
                  key={c}
                  onClick={() => toggleCaract(c)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                    s.caracts.has(c)
                      ? 'bg-piedra text-white border-piedra'
                      : 'border-white/25 text-white/70 hover:border-arena/60'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>

          {/* Fotos */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">
              Fotos
              {s.fotos.length > 0 && <span className="ml-1 text-arena">({s.fotos.length})</span>}
            </p>
            <label className="flex flex-col items-center gap-2 border border-dashed border-white/20 rounded-xl py-4 cursor-pointer hover:border-arena/60 transition-colors">
              <ImagePlus size={20} className="text-white/50" />
              <span className="text-xs text-white/70">Subir fotos</span>
              <span className="text-[10px] text-white/45">JPG · PNG · WEBP — varias a la vez</span>
              <input type="file" accept="image/*" multiple onChange={onFileChange} className="hidden" />
            </label>
            {s.fotos.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {s.fotos.map((url, i) => (
                  <div key={i} className="relative group">
                    <button
                      onClick={() => setS(p => ({ ...p, fotoIdx: i, offsetX: 0, offsetY: 0, zoom: 1 }))}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                        s.fotoIdx === i ? 'border-arena' : 'border-transparent opacity-60'
                      }`}
                    >
                      <img src={url} className="w-full h-full object-cover" />
                    </button>
                    <button
                      onClick={() => removeFoto(i)}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={8} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── Panel derecho: canvas ── */}
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 overflow-auto">

          {/* Canvas */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              style={{ width: DISPLAY_W, height: displayH, cursor: s.fotos.length ? 'grab' : 'default' }}
              className="rounded-xl shadow-2xl"
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={onMouseUp}
              onWheel={onWheel}
            />
            {/* Navegación de fotos */}
            {s.fotos.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                <button
                  onClick={() => setS(p => ({ ...p, fotoIdx: Math.max(0, p.fotoIdx - 1), offsetX: 0, offsetY: 0, zoom: 1 }))}
                  disabled={s.fotoIdx === 0}
                  className="disabled:opacity-30"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-white/70">{s.fotoIdx + 1} / {s.fotos.length}</span>
                <button
                  onClick={() => setS(p => ({ ...p, fotoIdx: Math.min(p.fotos.length - 1, p.fotoIdx + 1), offsetX: 0, offsetY: 0, zoom: 1 }))}
                  disabled={s.fotoIdx === s.fotos.length - 1}
                  className="disabled:opacity-30"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {/* Controles */}
          <div className="flex items-center gap-3">
            {s.fotos.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-white/60">
                <span>Arrastrar para reposicionar · Scroll para zoom</span>
                <button
                  onClick={resetPosition}
                  className="flex items-center gap-1 text-arena hover:text-white transition-colors ml-1"
                >
                  <RotateCcw size={12} /> Restablecer
                </button>
              </div>
            )}
            <button
              onClick={download}
              className="flex items-center gap-2 bg-arena hover:bg-[#d4c0aa] text-carbon font-bold text-sm px-5 py-2.5 rounded-xl transition-colors ml-auto"
            >
              <Download size={15} /> Descargar tarjeta
            </button>
          </div>

          <p className="text-white/45 text-xs">
            {CW} × {CH} px — JPEG 92%
          </p>
        </div>
      </div>
    </div>
  )
}
