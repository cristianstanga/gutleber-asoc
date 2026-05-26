from PIL import Image, ImageDraw, ImageFont
import math, os

FONTS = "/Users/mac/Documents/gutleber & asoc/.claude/skills/canvas-design/canvas-fonts"
OUTPUT = "/Users/mac/Documents/gutleber & asoc/brand"

# Brand colors
CARBON  = (44,  44,  42)
PIEDRA  = (140, 123, 107)
ARENA   = (196, 176, 154)
CREMA   = (240, 232, 220)
WHITE   = (255, 255, 255)
CARBON2 = (54,  54,  52)   # slightly lighter for texture lines

def F(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def text_w(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[2] - bbox[0]

def text_h(draw, text, font):
    bbox = draw.textbbox((0, 0), text, font=font)
    return bbox[3] - bbox[1]

def centered_text(draw, cx, y, text, font, fill):
    w = text_w(draw, text, font)
    draw.text((cx - w // 2, y), text, font=font, fill=fill)

def draw_emblem(draw, cx, cy, R, stroke=3):
    """Draw the three-element emblem inside a thin circle."""
    # Outer circle
    draw.ellipse([(cx-R, cy-R), (cx+R, cy+R)], outline=PIEDRA, width=stroke)

    # ── 1. DOOR READER (left) ──────────────────────────────────────
    dr_cx = cx - int(R * 0.52)
    dr_cy = cy
    pw = int(R * 0.22)   # plate width
    ph = int(R * 0.52)   # plate height
    px1 = dr_cx - pw // 2
    py1 = dr_cy - ph // 2
    px2 = dr_cx + pw // 2
    py2 = dr_cy + ph // 2

    # Plate (rounded rect approximation with rectangle)
    draw.rectangle([(px1, py1), (px2, py2)], outline=PIEDRA, width=stroke)

    # LED dot
    led_r = int(pw * 0.22)
    led_cx = dr_cx
    led_cy = py1 + int(ph * 0.16)
    draw.ellipse([(led_cx - led_r, led_cy - led_r), (led_cx + led_r, led_cy + led_r)], fill=PIEDRA)

    # Keypad lines
    kp_y1 = py1 + int(ph * 0.40)
    kp_y2 = py1 + int(ph * 0.56)
    kp_margin = int(pw * 0.18)
    draw.line([(px1 + kp_margin, kp_y1), (px2 - kp_margin, kp_y1)], fill=ARENA, width=max(1, stroke - 1))
    draw.line([(px1 + kp_margin * 2, kp_y2), (px2 - kp_margin * 2, kp_y2)], fill=ARENA, width=max(1, stroke - 1))

    # Handle (C-shape, opens right)
    handle_x = px2
    handle_y = dr_cy - int(ph * 0.12)
    handle_r = int(pw * 0.55)
    draw.arc(
        [(handle_x, handle_y - handle_r), (handle_x + handle_r * 2, handle_y + handle_r)],
        start=90, end=270, fill=PIEDRA, width=stroke
    )

    # ── 2. SIGNAL ARCS (center) ───────────────────────────────────
    s_cx = cx
    s_cy = cy + int(R * 0.15)
    for arc_r, alpha_factor in [(int(R * 0.19), 1.0), (int(R * 0.32), 0.55)]:
        col = ARENA if alpha_factor == 1.0 else (196, 176, 154)
        draw.arc(
            [(s_cx - arc_r, s_cy - arc_r), (s_cx + arc_r, s_cy + arc_r)],
            start=210, end=330, fill=col, width=stroke
        )
    # Center dot
    dot_r = max(2, int(R * 0.04))
    dot_y = s_cy + int(R * 0.36)
    draw.ellipse([(s_cx - dot_r, dot_y - dot_r), (s_cx + dot_r, dot_y + dot_r)], fill=ARENA)

    # ── 3. LOCATION PIN (right) ───────────────────────────────────
    p_cx = cx + int(R * 0.52)
    p_cy = cy - int(R * 0.08)
    p_w  = int(R * 0.22)
    p_h  = int(R * 0.36)

    # Oval top
    draw.ellipse(
        [(p_cx - p_w // 2, p_cy - p_h // 2), (p_cx + p_w // 2, p_cy + p_h // 4)],
        outline=PIEDRA, width=stroke
    )
    # Converging lines to point
    point_y = p_cy + int(p_h * 0.9)
    draw.line([(p_cx - p_w // 2 + stroke, p_cy + p_h // 5), (p_cx, point_y)], fill=PIEDRA, width=stroke)
    draw.line([(p_cx + p_w // 2 - stroke, p_cy + p_h // 5), (p_cx, point_y)], fill=PIEDRA, width=stroke)
    # Stem
    stem_end_y = point_y + int(R * 0.12)
    draw.line([(p_cx, point_y), (p_cx, stem_end_y)], fill=PIEDRA, width=stroke)


# ═══════════════════════════════════════════════════════════════════════
#  CANVAS 1 — Filosofía / Portada oscura
# ═══════════════════════════════════════════════════════════════════════
W1, H1 = 3200, 2200

img1 = Image.new('RGB', (W1, H1), CARBON)
d1   = ImageDraw.Draw(img1)

# Subtle horizontal texture
for y in range(0, H1, 22):
    d1.line([(0, y), (W1, y)], fill=CARBON2, width=1)

# Vertical divider (right 38% is accent panel)
panel_x = int(W1 * 0.62)
for x in range(panel_x, W1):
    # gradient-ish: slightly lighter
    d1.line([(x, 0), (x, H1)], fill=(48, 47, 46), width=1)

# ── Movement name ──────────────────────────────────────────────
f_xl     = F("IBMPlexSerif-Bold.ttf", 210)
f_xl_r   = F("IBMPlexSerif-Regular.ttf", 52)
f_lora   = F("Lora-Regular.ttf", 38)
f_lora_i = F("Lora-Italic.ttf", 38)
f_ws     = F("WorkSans-Regular.ttf", 26)
f_ws_b   = F("WorkSans-Bold.ttf", 30)
f_ws_sm  = F("WorkSans-Regular.ttf", 22)

d1.text((100, 60),  "ARRAIGO",  font=f_xl, fill=CREMA)
d1.text((100, 275), "SERENO",   font=f_xl, fill=PIEDRA)

d1.text((108, 514), "Filosofía visual · Gutleber & Asoc. · Posadas, Misiones · 2026",
        font=f_ws, fill=ARENA)

# Thin rule
d1.line([(100, 570), (int(W1 * 0.58), 570)], fill=PIEDRA, width=1)

# ── Manifesto ─────────────────────────────────────────────────
manifesto = [
    ("La identidad de Gutleber & Asoc. no nace del mármol importado", False),
    ("ni del acero frío. Emerge del suelo propio: la piedra caliza",   False),
    ("de Misiones, la madera que envejece con dignidad.", False),
    ("", False),
    ("La claridad es el lujo. La información en tiempo real,", False),
    ("el diferencial. La tecnología no se exhibe: trabaja en silencio,", False),
    ("como las raíces que sostienen lo visible.", False),
    ("", False),
    ("El espacio vacío no es ausencia: es confianza.", False),
    ("Las composiciones respiran. Los márgenes son generosos.", False),
    ("Cada elemento es preciso. Nada queda en el aire.", False),
    ("", False),
    ("Este es el estilo visual de quien sabe exactamente", True),
    ("qué hace y por qué.", True),
]

y_m = 604
for line, italic in manifesto:
    if line:
        font_m = F("Lora-Italic.ttf", 37) if italic else f_lora
        color_m = ARENA if italic else CREMA
        d1.text((104, y_m), line, font=font_m, fill=color_m)
    y_m += 52

# ── Emblem ────────────────────────────────────────────────────
emb_cx = panel_x + int((W1 - panel_x) * 0.5)
emb_cy = int(H1 * 0.42)
emb_R  = 290
draw_emblem(d1, emb_cx, emb_cy, emb_R, stroke=4)

# Wordmark below emblem
f_wm  = F("IBMPlexSerif-Regular.ttf", 54)
f_sub = F("WorkSans-Regular.ttf", 26)
wm_text = "GUTLEBER & ASOC."
wm_y    = emb_cy + emb_R + 40
centered_text(d1, emb_cx, wm_y,       wm_text,                 f_wm,  CREMA)
centered_text(d1, emb_cx, wm_y + 72,  "INMOBILIARIA BOUTIQUE", f_sub, ARENA)

# ── Bottom tagline ────────────────────────────────────────────
d1.line([(100, H1 - 90), (panel_x - 100, H1 - 90)], fill=PIEDRA, width=1)
d1.text((104, H1 - 72),
        "El propietario siempre sabe qué pasa con su propiedad.  Nada queda en el aire.",
        font=F("Lora-Italic.ttf", 28), fill=ARENA)

img1.save(os.path.join(OUTPUT, "brand_canvas_01_filosofia.png"))
print("✓ Canvas 1 guardado")


# ═══════════════════════════════════════════════════════════════════════
#  CANVAS 2 — Sistema de identidad (fondo claro)
# ═══════════════════════════════════════════════════════════════════════
W2, H2 = 3200, 2200

img2 = Image.new('RGB', (W2, H2), CREMA)
d2   = ImageDraw.Draw(img2)

# Very subtle grid dots
dot_spacing = 80
for gx in range(0, W2, dot_spacing):
    for gy in range(0, H2, dot_spacing):
        d2.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(220, 212, 200))

# ── Header bar ───────────────────────────────────────────────
d2.rectangle([(0, 0), (W2, 130)], fill=CARBON)
d2.text((60, 36), "GUTLEBER & ASOC.", font=F("IBMPlexSerif-Regular.ttf", 58), fill=CREMA)
d2.text((W2 - 520, 50), "SISTEMA DE IDENTIDAD", font=F("WorkSans-Regular.ttf", 26), fill=ARENA)
d2.line([(W2 - 540, 130), (W2 - 540, 0)], fill=PIEDRA, width=1)

# ── Section labels helper ──────────────────────────────────
def section_label(d, x, y, text):
    d.text((x, y), text, font=F("WorkSans-Bold.ttf", 22), fill=PIEDRA)
    lw = text_w(d, text, F("WorkSans-Bold.ttf", 22))
    d.line([(x, y + 28), (x + lw, y + 28)], fill=ARENA, width=1)

# ── LEFT COLUMN: Paleta de colores ────────────────────────
col_x = 60
section_label(d2, col_x, 165, "PALETA DE COLORES")

palette = [
    (CARBON,  "#2C2C2A", "Carbón",  "Textos · Logo · Marcos"),
    (PIEDRA,  "#8C7B6B", "Piedra",  "Color principal · Íconos"),
    (ARENA,   "#C4B09A", "Arena",   "Secundario · Subtítulos"),
    (CREMA,   "#F0E8DC", "Crema",   "Fondos · Tarjetas"),
]
swatch_y = 220
swatch_h = 140
swatch_gap = 26
swatch_w = 520

for color, hex_val, name, usage in palette:
    # Color block
    d2.rectangle([(col_x, swatch_y), (col_x + swatch_w, swatch_y + swatch_h)], fill=color)
    # If crema swatch, add border
    if color == CREMA:
        d2.rectangle([(col_x, swatch_y), (col_x + swatch_w, swatch_y + swatch_h)],
                     outline=ARENA, width=1)
    # Labels on right of swatch
    text_col = CREMA if color in (CARBON, PIEDRA) else CARBON
    d2.text((col_x + 20, swatch_y + 22), name,
            font=F("WorkSans-Bold.ttf", 30), fill=text_col)
    d2.text((col_x + 20, swatch_y + 62), hex_val,
            font=F("WorkSans-Regular.ttf", 24), fill=text_col)
    d2.text((col_x + 20, swatch_y + 96), usage,
            font=F("WorkSans-Regular.ttf", 20), fill=text_col)
    swatch_y += swatch_h + swatch_gap

# Divider
d2.line([(col_x + swatch_w + 60, 155), (col_x + swatch_w + 60, H2 - 60)], fill=ARENA, width=1)

# ── CENTER COLUMN: Tipografía ──────────────────────────────
typ_x = col_x + swatch_w + 100
typ_w = 840
section_label(d2, typ_x, 165, "SISTEMA TIPOGRÁFICO")

# Display
d2.text((typ_x, 220), "Georgia", font=F("Lora-Bold.ttf", 90), fill=CARBON)
d2.text((typ_x, 322), "DISPLAY — WORDMARK · TITULARES PATRIMONIALES",
        font=F("WorkSans-Regular.ttf", 20), fill=PIEDRA)
d2.line([(typ_x, 362), (typ_x + typ_w, 362)], fill=ARENA, width=1)

# Specimen - titulares
d2.text((typ_x, 384), "Patrimonio inmobiliario",
        font=F("Lora-Regular.ttf", 56), fill=CARBON)
d2.text((typ_x, 448), "Inversión · Gestión · Desarrollo",
        font=F("Lora-Italic.ttf", 42), fill=PIEDRA)
d2.line([(typ_x, 514), (typ_x + typ_w, 514)], fill=ARENA, width=1)

# Body
d2.text((typ_x, 538), "Inter / Arial", font=F("InstrumentSans-Bold.ttf", 52), fill=CARBON)
d2.text((typ_x, 600), "CUERPO — DIGITAL · COMUNICACIÓN · SISTEMA",
        font=F("WorkSans-Regular.ttf", 20), fill=PIEDRA)
d2.line([(typ_x, 640), (typ_x + typ_w, 640)], fill=ARENA, width=1)

# Body specimen
body_lines = [
    "Su propiedad está administrada. El cobro fue procesado el día 3.",
    "Inquilino: Martín García · Depto. 3B · Alquiler: $185.000",
    "Próximo vencimiento: 03/07/2026  ·  Estado: Al día",
]
for i, bl in enumerate(body_lines):
    d2.text((typ_x, 662 + i * 42), bl,
            font=F("InstrumentSans-Regular.ttf", 28), fill=CARBON)

d2.line([(typ_x, 800), (typ_x + typ_w, 800)], fill=ARENA, width=1)

# Scale
scale_items = [
    ("72", "Titular de sección", F("Lora-Bold.ttf", 72)),
    ("48", "Subtítulo de página", F("Lora-Regular.ttf", 48)),
    ("32", "Lead / Descriptor",   F("InstrumentSans-Regular.ttf", 32)),
    ("22", "Cuerpo de texto",     F("InstrumentSans-Regular.ttf", 22)),
    ("16", "Etiqueta · Detalle",  F("WorkSans-Regular.ttf", 16)),
]
sy = 820
for size_label, desc, fn in scale_items:
    d2.text((typ_x, sy), desc, font=fn, fill=CARBON)
    d2.text((typ_x + typ_w - 60, sy), size_label, font=F("WorkSans-Regular.ttf", 20), fill=ARENA)
    sy += text_h(d2, desc, fn) + 18

# Divider
d2.line([(typ_x + typ_w + 60, 155), (typ_x + typ_w + 60, H2 - 60)], fill=ARENA, width=1)

# ── RIGHT COLUMN: Emblema + aplicaciones ──────────────────
right_x = typ_x + typ_w + 100
right_w = W2 - right_x - 60
section_label(d2, right_x, 165, "EMBLEMA & APLICACIONES")

# Emblem (light version: Carbón/Piedra on Crema)
emb2_cx = right_x + right_w // 2
emb2_cy = 530
emb2_R  = 220
draw_emblem(d2, emb2_cx, emb2_cy, emb2_R, stroke=3)
centered_text(d2, emb2_cx, emb2_cy + emb2_R + 24,
              "GUTLEBER & ASOC.", F("IBMPlexSerif-Regular.ttf", 36), CARBON)
centered_text(d2, emb2_cx, emb2_cy + emb2_R + 68,
              "INMOBILIARIA BOUTIQUE", F("WorkSans-Regular.ttf", 18), PIEDRA)

# Emblem dark version (mini)
d2.line([(right_x, 840), (right_x + right_w, 840)], fill=ARENA, width=1)
d2.text((right_x, 856), "Versión oscura", font=F("WorkSans-Regular.ttf", 20), fill=PIEDRA)

mini_bg_x  = right_x
mini_bg_y  = 890
mini_bg_w  = right_w
mini_bg_h  = 220
d2.rectangle([(mini_bg_x, mini_bg_y), (mini_bg_x + mini_bg_w, mini_bg_y + mini_bg_h)], fill=CARBON)

mini_cx = mini_bg_x + mini_bg_w // 2
mini_cy = mini_bg_y + mini_bg_h // 2 - 14
mini_R  = 78

# Emblem on dark bg (recolored: outline Piedra, accents Arena/Crema)
d2.ellipse([(mini_cx-mini_R, mini_cy-mini_R), (mini_cx+mini_R, mini_cy+mini_R)], outline=PIEDRA, width=2)

# Simplified mini elements
# Door
dm_x = mini_cx - int(mini_R * 0.52)
dm_y = mini_cy
dpw = int(mini_R * 0.22); dph = int(mini_R * 0.52)
d2.rectangle([(dm_x-dpw//2, dm_y-dph//2), (dm_x+dpw//2, dm_y+dph//2)], outline=PIEDRA, width=2)
d2.ellipse([(dm_x-4, dm_y-dph//2+6), (dm_x+4, dm_y-dph//2+14)], fill=PIEDRA)
d2.arc([(dm_x+dpw//2, dm_y-8), (dm_x+dpw//2+20, dm_y+12)], start=90, end=270, fill=PIEDRA, width=2)
# Signal
for arc_r2 in [int(mini_R*0.19), int(mini_R*0.32)]:
    d2.arc([(mini_cx-arc_r2, mini_cy+10-arc_r2), (mini_cx+arc_r2, mini_cy+10+arc_r2)],
           start=210, end=330, fill=ARENA, width=2)
d2.ellipse([(mini_cx-3, mini_cy+int(mini_R*0.48)), (mini_cx+3, mini_cy+int(mini_R*0.54))], fill=ARENA)
# Pin
ppw = int(mini_R*0.22); pph = int(mini_R*0.36)
pm_cx = mini_cx + int(mini_R*0.52)
pm_cy = mini_cy - int(mini_R*0.08)
d2.ellipse([(pm_cx-ppw//2, pm_cy-pph//2), (pm_cx+ppw//2, pm_cy+pph//4)], outline=PIEDRA, width=2)
d2.line([(pm_cx-ppw//2+2, pm_cy+pph//5), (pm_cx, pm_cy+int(pph*0.9))], fill=PIEDRA, width=2)
d2.line([(pm_cx+ppw//2-2, pm_cy+pph//5), (pm_cx, pm_cy+int(pph*0.9))], fill=PIEDRA, width=2)
# Wordmark on dark
centered_text(d2, mini_cx, mini_bg_y + mini_bg_h - 44,
              "GUTLEBER & ASOC.", F("IBMPlexSerif-Regular.ttf", 22), CREMA)

# ── Footer ────────────────────────────────────────────────────
d2.line([(60, H2 - 64), (W2 - 60, H2 - 64)], fill=ARENA, width=1)
d2.text((64, H2 - 50), "Arraigo Sereno — Sistema de Identidad Visual · 2026",
        font=F("WorkSans-Regular.ttf", 22), fill=PIEDRA)
d2.text((W2 - 500, H2 - 50), "Gutleber & Asoc. · Posadas, Misiones",
        font=F("WorkSans-Regular.ttf", 22), fill=PIEDRA)

img2.save(os.path.join(OUTPUT, "brand_canvas_02_sistema.png"))
print("✓ Canvas 2 guardado")


# ═══════════════════════════════════════════════════════════════════════
#  CANVAS 3 — Dirección digital: web + tarjeta de propiedad
# ═══════════════════════════════════════════════════════════════════════
W3, H3 = 3200, 2200

img3 = Image.new('RGB', (W3, H3), CREMA)
d3   = ImageDraw.Draw(img3)

# Background subtle dots
for gx in range(0, W3, dot_spacing):
    for gy in range(0, H3, dot_spacing):
        d3.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(220, 212, 200))

# ── Header ────────────────────────────────────────────────────
d3.rectangle([(0, 0), (W3, 130)], fill=CARBON)
d3.text((60, 36), "GUTLEBER & ASOC.", font=F("IBMPlexSerif-Regular.ttf", 58), fill=CREMA)
d3.text((W3 - 580, 50), "DIRECCIÓN DIGITAL", font=F("WorkSans-Regular.ttf", 26), fill=ARENA)
d3.line([(W3 - 600, 130), (W3 - 600, 0)], fill=PIEDRA, width=1)

# ── LEFT: WEB HEADER MOCKUP ───────────────────────────────────
section_label(d3, 60, 165, "WEB — HEADER / NAVBAR")

# Web window frame
win_x, win_y = 60, 215
win_w, win_h = 1440, 840

# Browser chrome
d3.rectangle([(win_x, win_y), (win_x + win_w, win_y + 40)], fill=(226, 218, 206))
for bx, bc in [(win_x+14, (220, 80, 80)), (win_x+36, (220, 180, 60)), (win_x+58, (80, 180, 80))]:
    d3.ellipse([(bx-7, win_y+13), (bx+7, win_y+27)], fill=bc)
d3.rectangle([(win_x+88, win_y+8), (win_x+win_w-20, win_y+32)], fill=WHITE)
d3.text((win_x+100, win_y+10), "gutleber.com.ar",
        font=F("WorkSans-Regular.ttf", 16), fill=(120, 110, 100))

# Navbar
nav_h = 80
d3.rectangle([(win_x, win_y+40), (win_x+win_w, win_y+40+nav_h)], fill=CARBON)
# Logo area
emb_mini_R = 24
emb_mini_cx = win_x + 56
emb_mini_cy = win_y + 40 + nav_h//2
draw_emblem(d3, emb_mini_cx, emb_mini_cy, emb_mini_R, stroke=2)
d3.text((win_x + 88, win_y + 40 + 22), "GUTLEBER & ASOC.",
        font=F("IBMPlexSerif-Regular.ttf", 26), fill=CREMA)
# Nav items
nav_items = ["Gestión", "Inversiones", "Desarrollos", "Propiedades", "Contacto"]
nav_ix = win_x + win_w - 700
for item in nav_items:
    d3.text((nav_ix, win_y + 40 + 26), item,
            font=F("WorkSans-Regular.ttf", 22), fill=ARENA)
    nav_ix += text_w(d3, item, F("WorkSans-Regular.ttf", 22)) + 44

# Hero section
hero_y = win_y + 40 + nav_h
hero_h = 400
d3.rectangle([(win_x, hero_y), (win_x+win_w, hero_y+hero_h)], fill=(52, 52, 50))
# Subtle pattern on hero
for hy in range(hero_y, hero_y+hero_h, 18):
    d3.line([(win_x, hy), (win_x+win_w, hy)], fill=(56, 56, 54), width=1)
# Hero text
d3.text((win_x+80, hero_y+80), "Patrimonio inmobiliario",
        font=F("Lora-Regular.ttf", 72), fill=CREMA)
d3.text((win_x+80, hero_y+168), "con claridad y tecnología.",
        font=F("Lora-Italic.ttf", 60), fill=PIEDRA)
d3.text((win_x+80, hero_y+256), "Posadas, Misiones · Boutique · Gestión en tiempo real",
        font=F("WorkSans-Regular.ttf", 28), fill=ARENA)
# CTA button
btn_x, btn_y = win_x+80, hero_y+320
btn_w2, btn_h2 = 280, 52
d3.rectangle([(btn_x, btn_y), (btn_x+btn_w2, btn_y+btn_h2)], fill=PIEDRA)
d3.text((btn_x+30, btn_y+11), "Ver propiedades", font=F("WorkSans-Bold.ttf", 26), fill=CREMA)

# Content stripe (stats bar)
stats_y = hero_y + hero_h
stats_h = 100
d3.rectangle([(win_x, stats_y), (win_x+win_w, stats_y+stats_h)], fill=(230, 222, 210))
stats = [("Gestión", "Administración mensual"), ("Inversiones", "Oportunidades activas"),
         ("Desarrollos", "Análisis de terrenos"), ("Capital", "Negocios patrimoniales")]
sx = win_x + 60
for title, desc in stats:
    d3.text((sx, stats_y+12), title, font=F("WorkSans-Bold.ttf", 26), fill=CARBON)
    d3.text((sx, stats_y+46), desc,  font=F("WorkSans-Regular.ttf", 20), fill=PIEDRA)
    d3.line([(sx + 240, stats_y+16), (sx + 240, stats_y+84)], fill=ARENA, width=1)
    sx += 320

d3.rectangle([(win_x, win_y), (win_x+win_w, win_y+40+nav_h+hero_h+stats_h)],
             outline=ARENA, width=1)

# ── RIGHT: PROPERTY CARD ──────────────────────────────────────
card_section_x = 60 + 1440 + 60
section_label(d3, card_section_x, 165, "TARJETA DE PROPIEDAD")

card_x, card_y = card_section_x, 215
card_w, card_h = 1480, 840
card_padding = 40

# Card shadow
d3.rectangle([(card_x+6, card_y+6), (card_x+card_w+6, card_y+card_h+6)],
             fill=(210, 202, 192))
# Card body
d3.rectangle([(card_x, card_y), (card_x+card_w, card_y+card_h)], fill=WHITE)

# Image placeholder (top 52% of card)
img_h = int(card_h * 0.52)
d3.rectangle([(card_x, card_y), (card_x+card_w, card_y+img_h)], fill=(186, 174, 160))
# Grid pattern on photo placeholder
for px2 in range(card_x, card_x+card_w, 60):
    d3.line([(px2, card_y), (px2, card_y+img_h)], fill=(176, 164, 150), width=1)
for py2 in range(card_y, card_y+img_h, 50):
    d3.line([(card_x, py2), (card_x+card_w, py2)], fill=(176, 164, 150), width=1)
# Photo label
centered_text(d3, card_x+card_w//2, card_y+img_h//2 - 25,
              "[ FOTOGRAFÍA DE PROPIEDAD ]", F("WorkSans-Regular.ttf", 32), (130, 118, 106))

# Tag overlay (type badge)
tag_x = card_x + card_padding
tag_y = card_y + img_h - 60
d3.rectangle([(tag_x, tag_y), (tag_x+180, tag_y+42)], fill=CARBON)
d3.text((tag_x+16, tag_y+10), "EN ALQUILER", font=F("WorkSans-Bold.ttf", 20), fill=CREMA)

# Status badge
sb_x = tag_x + 200
d3.rectangle([(sb_x, tag_y), (sb_x+140, tag_y+42)], fill=PIEDRA)
d3.text((sb_x+14, tag_y+10), "AL DÍA", font=F("WorkSans-Bold.ttf", 20), fill=CREMA)

# Card content area
content_y = card_y + img_h + card_padding
d3.text((card_x+card_padding, content_y),
        "Departamento 3B · Planta alta",
        font=F("Lora-Regular.ttf", 46), fill=CARBON)
d3.text((card_x+card_padding, content_y+58),
        "Av. Costanera 1240 · Posadas, Misiones",
        font=F("WorkSans-Regular.ttf", 28), fill=PIEDRA)

# Divider
d3.line([(card_x+card_padding, content_y+106),
         (card_x+card_w-card_padding, content_y+106)], fill=ARENA, width=1)

# Property details in columns
details_y = content_y + 120
details = [
    ("Inquilino",   "Martín García"),
    ("Alquiler",    "$185.000 / mes"),
    ("Vencimiento", "03/07/2026"),
    ("Estado",      "Al día"),
]
dx = card_x + card_padding
for label, value in details:
    d3.text((dx, details_y),    label, font=F("WorkSans-Regular.ttf", 22), fill=PIEDRA)
    d3.text((dx, details_y+28), value, font=F("WorkSans-Bold.ttf", 28),    fill=CARBON)
    dx += (card_w - card_padding * 2) // len(details)

# Bottom action bar
action_y = card_y + card_h - 80
d3.rectangle([(card_x, action_y), (card_x+card_w, card_y+card_h)], fill=(240, 232, 220))
d3.line([(card_x, action_y), (card_x+card_w, action_y)], fill=ARENA, width=1)
# Actions
actions = ["Ver detalles", "Historial", "Recibo", "Contactar"]
ax = card_x + card_padding
for act in actions:
    d3.text((ax, action_y+26), act, font=F("WorkSans-Regular.ttf", 26), fill=PIEDRA)
    ax += 340

d3.rectangle([(card_x, card_y), (card_x+card_w, card_y+card_h)], outline=ARENA, width=1)

# ── Bottom section: design tokens ────────────────────────
tok_y = 215 + 840 + 60
section_label(d3, 60, tok_y, "TOKENS DE DISEÑO")

tokens = [
    ("border-radius", "8px · 12px · 16px"),
    ("spacing unit",  "8px base"),
    ("shadow",        "0 2px 8px rgba(44,44,42,0.10)"),
    ("border",        "1px solid #C4B09A"),
    ("transition",    "200ms ease"),
]
tok_x = 60
for key, val in tokens:
    d3.rectangle([(tok_x, tok_y+36), (tok_x+380, tok_y+84)], fill=WHITE, outline=ARENA, width=1)
    d3.text((tok_x+16, tok_y+38), key, font=F("WorkSans-Regular.ttf", 18), fill=PIEDRA)
    d3.text((tok_x+16, tok_y+58), val, font=F("WorkSans-Bold.ttf", 20),    fill=CARBON)
    tok_x += 400

# Footer
d3.line([(60, H3-64), (W3-60, H3-64)], fill=ARENA, width=1)
d3.text((64, H3-50), "Arraigo Sereno — Dirección Digital · 2026",
        font=F("WorkSans-Regular.ttf", 22), fill=PIEDRA)
d3.text((W3-500, H3-50), "Gutleber & Asoc. · Posadas, Misiones",
        font=F("WorkSans-Regular.ttf", 22), fill=PIEDRA)

img3.save(os.path.join(OUTPUT, "brand_canvas_03_digital.png"))
print("✓ Canvas 3 guardado")

print("\n✅ Todos los canvases guardados en:", OUTPUT)
