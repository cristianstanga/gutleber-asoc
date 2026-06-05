"""
Cartel de propiedad — Gutleber & Asoc.
Formato: 40cm x 50cm a 150dpi = 2362 x 2953 px
"""

import math, os, io
from PIL import Image, ImageDraw, ImageFont
import qrcode
import cairosvg

# ── COLORES ──────────────────────────────────────────────────────────────────
CARBON  = (15,  23,  42)   # #0F172A navy
PIEDRA  = (179, 67,  41)   # #B34329 copper-dark (para textos)
ARENA   = (179, 67,  41)   # #B34329 copper
CREMA   = (248, 247, 244)  # #F8F7F4

# ── DIMENSIONES ──────────────────────────────────────────────────────────────
W, H    = 2362, 2953
MARGIN  = 100

# ── DATOS DE EJEMPLO ─────────────────────────────────────────────────────────
DATA = {
    "tipo":     "EN VENTA",
    "direccion":"RIVADAVIA 1450",
    "barrio":   "Centro · Posadas",
    "precio":   "USD 95.000",
    "sup":      "120 m²",
    "dorm":     "3 dorm.",
    "banios":   "2 baños",
    "extras":   "Cochera · Balcón",
    "tel":      "+54 376 400-0000",
    "web":      "gutleber.com.ar",
    "qr_url":   "https://gutleber.com.ar",
}

# ── FUENTES ───────────────────────────────────────────────────────────────────
BASE = "/usr/share/fonts/truetype/dejavu/"
def font(name, size):
    try:    return ImageFont.truetype(BASE + name, size)
    except: return ImageFont.load_default()

F_SERIF_B  = "DejaVuSerif-Bold.ttf"
F_SERIF    = "DejaVuSerif.ttf"
F_SERIF_I  = "DejaVuSerifCondensed-Italic.ttf"
F_SANS     = "DejaVuSans.ttf"
F_SANS_B   = "DejaVuSans-Bold.ttf"

# ── CANVAS ────────────────────────────────────────────────────────────────────
img  = Image.new("RGB", (W, H), CARBON)
draw = ImageDraw.Draw(img, "RGBA")

# ── HEADER (fondo carbón) ─────────────────────────────────────────────────────
HEADER_H = 280
draw.rectangle([0, 0, W, HEADER_H], fill=CARBON)

# Emblema SVG → PNG en memoria, pegado en el header
SVG_PATH = os.path.join(os.path.dirname(__file__), "../logo/gutleber_emblema.svg")
emblem_size = 160
emblem_png = cairosvg.svg2png(url=SVG_PATH, output_width=emblem_size, output_height=emblem_size)
emblem_img = Image.open(io.BytesIO(emblem_png)).convert("RGBA")
# Pegar con transparencia
emblem_y = (HEADER_H - emblem_size) // 2
img.paste(emblem_img, (MARGIN, emblem_y), emblem_img)

# Wordmark junto al emblema
wx = MARGIN + emblem_size + 36
draw.text((wx, 68),  "GUTLEBER & ASOC.",
          font=font(F_SERIF_B, 88), fill=CREMA)
draw.text((wx + 2, 172), "gestión · inversión · patrimonio",
          font=font(F_SERIF_I, 36), fill=ARENA)

# Badge EN VENTA / EN ALQUILER
bw, bh = 300, 68
bx = W - MARGIN - bw
by = (HEADER_H - bh) // 2
draw.rounded_rectangle([bx, by, bx + bw, by + bh], radius=34, fill=PIEDRA)
draw.text((bx + bw // 2, by + bh // 2), DATA["tipo"],
          font=font(F_SANS_B, 32), fill=CREMA, anchor="mm")

# Línea separadora header/foto
draw.line([0, HEADER_H, W, HEADER_H], fill=PIEDRA, width=3)

# ── ZONA FOTO ─────────────────────────────────────────────────────────────────
FOTO_TOP    = HEADER_H
FOTO_BOTTOM = int(H * 0.58)
FOTO_H      = FOTO_BOTTOM - FOTO_TOP

# Fondo placeholder
for band in range(FOTO_H):
    t = band / FOTO_H
    r = int(80 + t * 20)
    g = int(72 + t * 18)
    b = int(64 + t * 16)
    draw.line([(0, FOTO_TOP + band), (W, FOTO_TOP + band)], fill=(r, g, b))

draw.text((W // 2, FOTO_TOP + FOTO_H // 2),
          "— fotografía de la propiedad —",
          font=font(F_SANS, 36), fill=(*ARENA, 90), anchor="mm")

# Línea separadora foto/panel
draw.line([0, FOTO_BOTTOM, W, FOTO_BOTTOM], fill=PIEDRA, width=3)

# ── PANEL INFERIOR ────────────────────────────────────────────────────────────
y = FOTO_BOTTOM + 80

# DIRECCIÓN
draw.text((MARGIN, y), DATA["direccion"],
          font=font(F_SERIF_B, 130), fill=CREMA)
y += 150
draw.text((MARGIN, y), DATA["barrio"],
          font=font(F_SERIF, 52), fill=ARENA)
y += 80

draw.line([MARGIN, y, W - MARGIN, y], fill=(*PIEDRA, 100), width=1)
y += 56

# PRECIO
draw.text((MARGIN, y), DATA["precio"],
          font=font(F_SERIF_B, 112), fill=CREMA)
y += 130

# CARACTERÍSTICAS
carac = f"{DATA['sup']}   ·   {DATA['dorm']}   ·   {DATA['banios']}"
draw.text((MARGIN, y), carac, font=font(F_SANS, 48), fill=ARENA)
y += 66
draw.text((MARGIN, y), DATA["extras"], font=font(F_SANS, 40), fill=PIEDRA)
y += 90

draw.line([MARGIN, y, W - MARGIN, y], fill=(*PIEDRA, 80), width=1)
y += 60

# QR (derecha)
qr_size = 340
qr = qrcode.QRCode(version=2, box_size=9, border=2,
                   error_correction=qrcode.constants.ERROR_CORRECT_M)
qr.add_data(DATA["qr_url"])
qr.make(fit=True)
qr_img = qr.make_image(fill_color=CREMA, back_color=CARBON).convert("RGB")
qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
qr_x = W - MARGIN - qr_size
qr_y = y + 8
img.paste(qr_img, (qr_x, qr_y))
draw.text((qr_x + qr_size // 2, qr_y + qr_size + 32),
          "Escaneá para ver más", font=font(F_SANS, 36), fill=PIEDRA, anchor="mm")

# CONTACTO
draw.text((MARGIN, y + 24),  DATA["tel"], font=font(F_SANS,   44), fill=CREMA)
draw.text((MARGIN, y + 88),  DATA["web"], font=font(F_SANS_B, 44), fill=ARENA)

# PIE
foot_y = H - 56
draw.line([MARGIN, foot_y - 16, W - MARGIN, foot_y - 16], fill=PIEDRA, width=1)
draw.text((MARGIN, foot_y),
          "Gutleber & Asoc.  ·  Corredores Inmobiliarios Matriculados  ·  Posadas, Misiones",
          font=font(F_SANS, 32), fill=(*PIEDRA, 160), anchor="lm")

# ── GUARDAR ───────────────────────────────────────────────────────────────────
out = os.path.join(os.path.dirname(__file__), "cartel_propiedad_preview.png")
img.save(out, "PNG", dpi=(150, 150))
print(f"✓ {out}  ({W}x{H}px — {W/150*2.54:.0f}x{H/150*2.54:.0f} cm @ 150dpi)")
