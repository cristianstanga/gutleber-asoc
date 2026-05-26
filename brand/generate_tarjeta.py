#!/usr/bin/env python3
"""
Generador de tarjeta de propiedad — Gutleber & Asoc.
Filosofía: Presencia Velada
Formato: 1080×1080 px (Instagram / WhatsApp)

Datos sobre imagen full-bleed: header flotante + panel inferior flotante.
"""

import math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os

FONTS_DIR = "/Users/mac/Documents/gutleber & asoc/.claude/skills/canvas-design/canvas-fonts"
OUT_PATH   = "/Users/mac/Documents/gutleber & asoc/brand/tarjeta_preview_nueva.png"

W = H = 1080

# ── Paleta ─────────────────────────────────────────────────────────────────────
CARBON   = (44,  44,  42)
PIEDRA   = (140, 123, 107)
ARENA    = (196, 176, 154)
CREMA    = (240, 232, 220)
WHITE    = (255, 255, 255)

def alpha(rgb, a):
    return rgb + (a,)

# ── Fuentes ────────────────────────────────────────────────────────────────────
def font(name, size):
    path = os.path.join(FONTS_DIR, name)
    return ImageFont.truetype(path, size)

f_firma_bold   = font("WorkSans-Bold.ttf",     22)   # nombre firma (header)
f_serif_xl     = font("Lora-Regular.ttf",     44)   # dirección
f_serif_price  = font("Lora-Regular.ttf",     54)   # precio
f_sans_md      = font("WorkSans-Regular.ttf", 20)   # características
f_sans_sm      = font("WorkSans-Regular.ttf", 15)   # badge tipo, URL
f_sans_badge   = font("WorkSans-Bold.ttf",    13)   # badge modo
f_tagline      = font("WorkSans-Regular.ttf", 11)   # tagline header

# ── Datos de ejemplo ───────────────────────────────────────────────────────────
DATA = {
    "modo":          "EN ALQUILER",
    "tipo":          "DEPARTAMENTO",
    "direccion":     "BOLÍVAR 1250, PISO 3",
    "superficie":    85,
    "habitaciones":  3,
    "banos":         2,
    "precio":        "$ 420.000",
    "sufijo":        "/ mes",
    "url":           "gutleber.com.ar",
}

# ── Helpers ────────────────────────────────────────────────────────────────────

def draw_rounded_rect(img_rgba, x, y, w, h, r, fill_rgba):
    """Dibuja un rectángulo redondeado con transparencia sobre img_rgba."""
    overlay = Image.new("RGBA", img_rgba.size, (0,0,0,0))
    d = ImageDraw.Draw(overlay)
    d.rounded_rectangle([x, y, x+w, y+h], radius=r, fill=fill_rgba)
    return Image.alpha_composite(img_rgba, overlay)

def draw_pill(img_rgba, cx, cy, text, fnt, bg_rgba, text_rgb, pad_h=18, pad_v=10):
    """Dibuja un badge pill centrado en (cx, cy). Devuelve img y ancho del pill."""
    tmp = ImageDraw.Draw(img_rgba)
    bb  = tmp.textbbox((0,0), text, font=fnt)
    tw  = bb[2] - bb[0]
    th  = bb[3] - bb[1]
    pw  = tw + pad_h * 2
    ph  = th + pad_v * 2
    x   = cx - pw // 2
    y   = cy - ph // 2
    img_rgba = draw_rounded_rect(img_rgba, x, y, pw, ph, ph//2, bg_rgba)
    d = ImageDraw.Draw(img_rgba)
    d.text((x + pad_h, y + pad_v), text, font=fnt, fill=text_rgb + (255,))
    return img_rgba, pw, ph

def draw_pill_at(img_rgba, x, y, text, fnt, bg_rgba, text_rgb, pad_h=18, pad_v=10):
    """Pill con esquina superior-izquierda en (x, y)."""
    tmp = ImageDraw.Draw(img_rgba)
    bb  = tmp.textbbox((0,0), text, font=fnt)
    tw  = bb[2] - bb[0]
    th  = bb[3] - bb[1]
    pw  = tw + pad_h * 2
    ph  = th + pad_v * 2
    img_rgba = draw_rounded_rect(img_rgba, x, y, pw, ph, ph//2, bg_rgba)
    d = ImageDraw.Draw(img_rgba)
    d.text((x + pad_h, y + pad_v), text, font=fnt, fill=text_rgb + (255,))
    return img_rgba, pw, ph

def text_w(draw_obj, text, fnt):
    bb = draw_obj.textbbox((0,0), text, font=fnt)
    return bb[2] - bb[0]

def text_h(draw_obj, text, fnt):
    bb = draw_obj.textbbox((0,0), text, font=fnt)
    return bb[3] - bb[1]

def wrap_text(draw_obj, text, fnt, max_w):
    words = text.split()
    lines, line = [], ""
    for w in words:
        test = (line + " " + w).strip()
        if text_w(draw_obj, test, fnt) > max_w:
            if line: lines.append(line)
            line = w
        else:
            line = test
    if line: lines.append(line)
    return lines

# ── Fondo simulado (foto de propiedad) ────────────────────────────────────────

def make_background():
    """
    Simula una foto de interior boutique: gradiente cálido uniforme
    con viñeta perimetral y destello de luz natural muy suave.
    Sin líneas de suelo — el fondo debe ser un canvas limpio y cálido.
    """
    bg = Image.new("RGBA", (W, H))
    d  = ImageDraw.Draw(bg)

    # Capa base: gradiente vertical suave — taupe medio arriba, más oscuro abajo
    for y in range(H):
        t = y / H
        # Centro luminoso (~0.35 del alto) → oscurece hacia arriba y hacia abajo
        lum_t  = abs(t - 0.35) * 1.6
        lum_t  = min(lum_t, 1.0)
        r = int(162 - lum_t * 55)
        g = int(152 - lum_t * 52)
        b = int(138 - lum_t * 48)
        d.line([(0, y), (W, y)], fill=(r, g, b, 255))

    # Variación horizontal: lado derecho ligeramente más claro (ventana imaginaria)
    for x in range(W):
        t = x / W
        # Más claro en la franja central-derecha
        brightness = math.exp(-((t - 0.65) ** 2) / 0.08) * 22
        a = int(brightness)
        if a > 0:
            ovl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            od  = ImageDraw.Draw(ovl)
            od.rectangle([(x, 0), (x, H)], fill=(200, 190, 175, a))
            bg  = Image.alpha_composite(bg, ovl)

    # Viñeta perimetral fuerte (encuadra la foto)
    vignette = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    vd = ImageDraw.Draw(vignette)
    for i in range(260):
        t = i / 260
        a = int(130 * (1 - t) ** 2.0)
        vd.rectangle([(i, i), (W - i, H - i)], outline=(0, 0, 0, a))
    bg = Image.alpha_composite(bg, vignette)

    return bg.convert("RGBA")

# ── Emblema del pin ────────────────────────────────────────────────────────────

def draw_emblema(img_rgba, cx, cy, size=38):
    """
    Dibuja el emblema: círculo exterior + arco arquitectónico interior + punta de pin.
    Líneas finas en crema sobre transparente.
    cx, cy = centro del círculo.
    """
    d   = ImageDraw.Draw(img_rgba)
    lw  = max(1, size // 20)
    col = CREMA + (230,)

    r  = size // 2          # radio del círculo
    # Círculo principal
    d.ellipse([(cx-r, cy-r), (cx+r, cy+r)],
              outline=col, width=lw)

    # Arco arquitectónico interior (puerta/ventana)
    ai = int(r * 0.52)      # radio interior del arco
    ax = cx
    ay = cy - int(r * 0.08) # centro ligeramente arriba
    # Arco superior (semicírculo)
    d.arc([(ax-ai, ay-ai), (ax+ai, ay+ai)],
          start=180, end=0, fill=col, width=lw)
    # Jambas verticales
    jh = int(ai * 0.55)
    d.line([(ax-ai, ay), (ax-ai, ay+jh)], fill=col, width=lw)
    d.line([(ax+ai, ay), (ax+ai, ay+jh)], fill=col, width=lw)
    # Punto interior (cerradura/sensor)
    pd = max(2, lw + 1)
    d.ellipse([(ax-pd, ay+int(ai*0.15)-pd),
               (ax+pd, ay+int(ai*0.15)+pd)],
              fill=col)

    # Punta del pin (triángulo)
    tip_y = cy + r + int(size * 0.55)
    pw    = max(3, size // 6)
    d.polygon([(cx-pw, cy+r-2),
               (cx+pw, cy+r-2),
               (cx,    tip_y)],
              fill=col)

    return img_rgba

# ── Canvas principal ───────────────────────────────────────────────────────────

def generate():
    canvas = make_background()
    PAD = 44
    FLOAT_MARGIN = 36   # margen del borde del canvas a los elementos flotantes

    d_tmp = ImageDraw.Draw(canvas)  # para medir texto

    # ── HEADER FLOTANTE ────────────────────────────────────────────────────────
    HH    = 80                              # altura del header
    HW    = W - FLOAT_MARGIN * 2            # ancho
    HX    = FLOAT_MARGIN                    # x inicio
    HY    = FLOAT_MARGIN                    # y inicio
    H_BG  = CARBON + (218,)                 # 85% opacidad

    canvas = draw_rounded_rect(canvas, HX, HY, HW, HH, 16, H_BG)

    # Emblema del pin
    EMB_CX = HX + 44
    EMB_CY = HY + HH // 2
    canvas = draw_emblema(canvas, EMB_CX, EMB_CY, size=40)

    # Nombre firma
    d = ImageDraw.Draw(canvas)
    firma_x = EMB_CX + 30
    firma_y = HY + 20
    d.text((firma_x, firma_y), "GUTLEBER & ASOC.",
           font=f_firma_bold, fill=CREMA + (245,))
    d.text((firma_x, firma_y + 28), "INMOBILIARIA BOUTIQUE  ·  POSADAS",
           font=f_tagline, fill=ARENA + (160,))

    # Badge modo (derecha del header)
    modo_text = DATA["modo"]
    bb_modo = d.textbbox((0, 0), modo_text, font=f_sans_badge)
    mw = bb_modo[2] - bb_modo[0]
    ph_b = 36
    pw_b = mw + 28
    mx = HX + HW - pw_b - 16
    my = HY + (HH - ph_b) // 2
    # Color del badge según modo
    badge_bg = PIEDRA + (240,) if "ALQUILER" in modo_text else ARENA + (240,)
    canvas = draw_rounded_rect(canvas, mx, my, pw_b, ph_b, ph_b//2, badge_bg)
    d = ImageDraw.Draw(canvas)
    d.text((mx + 14, my + (ph_b - (bb_modo[3]-bb_modo[1])) // 2),
           modo_text, font=f_sans_badge, fill=CARBON + (255,))

    # ── PANEL INFERIOR FLOTANTE ────────────────────────────────────────────────
    PANEL_H  = 295
    PANEL_W  = W - FLOAT_MARGIN * 2
    PANEL_X  = FLOAT_MARGIN
    PANEL_Y  = H - PANEL_H - FLOAT_MARGIN
    PANEL_BG = CARBON + (232,)   # ~91% opacidad

    canvas = draw_rounded_rect(canvas, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 18, PANEL_BG)

    # Separación interna
    IPAD = 28   # padding interior del panel
    cy = PANEL_Y + IPAD

    # Badge tipo de propiedad
    canvas, bw, bh = draw_pill_at(
        canvas, PANEL_X + IPAD, cy,
        DATA["tipo"], f_sans_sm,
        PIEDRA + (230,), CREMA, pad_h=16, pad_v=8
    )
    cy += bh + 16

    # Dirección
    d = ImageDraw.Draw(canvas)
    dir_lines = wrap_text(d, DATA["direccion"], f_serif_xl, PANEL_W - IPAD * 2)
    for line in dir_lines[:2]:
        d.text((PANEL_X + IPAD, cy), line, font=f_serif_xl, fill=WHITE + (255,))
        bb = d.textbbox((0, 0), line, font=f_serif_xl)
        cy += (bb[3] - bb[1]) + 8
    cy += 4

    # Características
    caract_parts = []
    if DATA["superficie"]:   caract_parts.append(f"{DATA['superficie']} m²")
    if DATA["habitaciones"]: caract_parts.append(f"{DATA['habitaciones']} dorm.")
    if DATA["banos"]:        caract_parts.append(f"{DATA['banos']} baños")

    if caract_parts:
        cx_pos = PANEL_X + IPAD
        for i, part in enumerate(caract_parts):
            d.text((cx_pos, cy), part, font=f_sans_md, fill=ARENA + (220,))
            bb = d.textbbox((0, 0), part, font=f_sans_md)
            cx_pos += bb[2] - bb[0]
            if i < len(caract_parts) - 1:
                sep = "  ·  "
                d.text((cx_pos, cy), sep, font=f_sans_md, fill=PIEDRA + (180,))
                bb_s = d.textbbox((0, 0), sep, font=f_sans_md)
                cx_pos += bb_s[2] - bb_s[0]
        bb_c = d.textbbox((0, 0), caract_parts[0], font=f_sans_md)
        cy += (bb_c[3] - bb_c[1]) + 16

    # Línea divisora sutil
    sep_y = cy + 4
    div_ovl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dd = ImageDraw.Draw(div_ovl)
    dd.line([(PANEL_X + IPAD, sep_y), (PANEL_X + PANEL_W - IPAD, sep_y)],
            fill=ARENA + (50,), width=1)
    canvas = Image.alpha_composite(canvas, div_ovl)
    cy = sep_y + 18

    # Precio
    d = ImageDraw.Draw(canvas)
    precio_text = DATA["precio"]
    bb_p = d.textbbox((0, 0), precio_text, font=f_serif_price)
    ph_price = bb_p[3] - bb_p[1]
    d.text((PANEL_X + IPAD, cy), precio_text, font=f_serif_price, fill=WHITE + (255,))
    pw_price = bb_p[2] - bb_p[0]

    # Sufijo del precio
    sufijo_x = PANEL_X + IPAD + pw_price + 12
    sufijo_y = cy + ph_price - 22
    d.text((sufijo_x, sufijo_y), DATA["sufijo"], font=f_sans_md, fill=ARENA + (200,))

    # ── FOOTER (sobre imagen, fuera del panel) ────────────────────────────────
    footer_y = H - FLOAT_MARGIN + 6

    # Línea decorativa arena (izquierda)
    line_ovl = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    ld = ImageDraw.Draw(line_ovl)
    ld.rectangle([(FLOAT_MARGIN, footer_y - 6),
                  (FLOAT_MARGIN + 44, footer_y - 3)],
                 fill=ARENA + (160,))
    canvas = Image.alpha_composite(canvas, line_ovl)

    # URL derecha
    d = ImageDraw.Draw(canvas)
    bb_url = d.textbbox((0, 0), DATA["url"], font=f_sans_sm)
    uw = bb_url[2] - bb_url[0]
    d.text((W - FLOAT_MARGIN - uw, footer_y - 20),
           DATA["url"], font=f_sans_sm, fill=PIEDRA + (200,))

    # ── SEGUNDO PASE: refinamiento ─────────────────────────────────────────────
    # Micro-viñeta adicional sobre todo (refuerza integración)
    vignette2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    v2d = ImageDraw.Draw(vignette2)
    for i in range(80):
        t = i / 80
        a = int(35 * (1 - t) ** 2.2)
        v2d.rectangle([(i, i), (W - i, H - i)], outline=(0, 0, 0, a))
    canvas = Image.alpha_composite(canvas, vignette2)

    # ── Guardar ────────────────────────────────────────────────────────────────
    final = canvas.convert("RGB")
    final.save(OUT_PATH, "PNG", optimize=True)
    print(f"✅ Tarjeta generada: {OUT_PATH}")
    print(f"   Resolución: {final.width}×{final.height} px")

if __name__ == "__main__":
    generate()
