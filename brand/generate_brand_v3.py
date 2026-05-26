from PIL import Image, ImageDraw, ImageFont
import math, os

FONTS  = "/Users/mac/Documents/gutleber & asoc/.claude/skills/canvas-design/canvas-fonts"
OUTPUT = "/Users/mac/Documents/gutleber & asoc/brand"

CARBON = (44,  44,  42)
PIEDRA = (140, 123, 107)
ARENA  = (196, 176, 154)
CREMA  = (240, 232, 220)
WHITE  = (255, 255, 255)
CARBON_TEX = (52, 51, 50)

def F(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def tw(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0]

def cx_text(draw, cx, y, text, font, fill):
    draw.text((cx - tw(draw, text, font)//2, y), text, font=font, fill=fill)

def rr(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# ─────────────────────────────────────────────────────────────────────────────
#  EL EMBLEMA DEFINITIVO
#  Concepto: arco arquitectónico + cuerpo del pin + punta.
#  Un solo trazo, una sola lectura: PROPIEDAD EN UN LUGAR ESPECÍFICO.
#  Sin círculo contenedor en la versión primaria.
#  El arco (doorway) = real estate.  El pin = posición / arraigo.
#  El punto LED en el shackle = tecnología discreta, casi invisible.
# ─────────────────────────────────────────────────────────────────────────────

def arch_pin(draw, cx, cy, R, stroke=3, color=PIEDRA, accent=ARENA, dot=True):
    """
    R = mitad de la altura total del emblema
    El emblema ocupa de (cy-R) a (cy+R) en y, centrado en cx.

    Geometría:
      - Cabeza del pin: círculo centrado en (cx, ph_cy), radio ph_r
      - Arco arquitectónico adentro: semicírculo + jambas verticales
      - Cuerpo del pin: dos líneas desde la base del círculo hasta la punta
      - Punta redondeada
      - LED (opcional): punto sutil en el arco, color accent
    """
    # ── Proporciones ──────────────────────────────────────────────────────
    ph_r   = int(R * 0.59)          # radio de la cabeza del pin
    ph_cy  = cy - int(R * 0.24)    # centro de la cabeza (corrido arriba)

    # Arco interior
    ar     = int(ph_r * 0.50)      # radio del semicírculo del arco
    a_cy   = ph_cy - int(ph_r * 0.02)  # centro del arco ≈ centro del pin

    leg_h  = int(ar * 0.80)        # altura de las jambas (proporcional y aireada)

    # Cola del pin
    tail_base_w = int(ph_r * 0.62) # semi-ancho donde sale la cola
    tail_base_y = ph_cy + int(ph_r * 0.80)  # y donde la cola sale del círculo
    tip_y       = cy + R            # punta del pin

    # ── 1. Cabeza del pin ──────────────────────────────────────────────────
    draw.ellipse(
        [(cx - ph_r, ph_cy - ph_r), (cx + ph_r, ph_cy + ph_r)],
        outline=color, width=stroke
    )

    # ── 2. Cola del pin (dos líneas simétricas a la punta) ─────────────────
    draw.line([(cx - tail_base_w, tail_base_y), (cx, tip_y)],
              fill=color, width=stroke)
    draw.line([(cx + tail_base_w, tail_base_y), (cx, tip_y)],
              fill=color, width=stroke)

    # Punta redondeada (filled dot)
    t_r = max(2, stroke + 1)
    draw.ellipse(
        [(cx - t_r, tip_y - t_r), (cx + t_r, tip_y + t_r)],
        fill=color
    )

    # ── 3. Arco arquitectónico (adentro de la cabeza) ──────────────────────
    # Top arc: en Pillow start=180→360 clockwise = mitad superior del círculo ✓
    draw.arc(
        [(cx - ar, a_cy - ar), (cx + ar, a_cy + ar)],
        start=180, end=360, fill=color, width=stroke
    )

    # Jamba izquierda (vertical, hacia abajo desde el extremo del arco)
    draw.line(
        [(cx - ar, a_cy), (cx - ar, a_cy + leg_h)],
        fill=color, width=stroke
    )
    # Jamba derecha
    draw.line(
        [(cx + ar, a_cy), (cx + ar, a_cy + leg_h)],
        fill=color, width=stroke
    )

    # Umbral sutil (línea horizontal en la base del arco — el piso)
    if dot:
        umb_w = int(ar * 0.50)
        umb_y = a_cy + leg_h
        draw.line(
            [(cx - umb_w, umb_y), (cx + umb_w, umb_y)],
            fill=accent, width=max(1, stroke - 1)
        )

        # Punto LED (sensor electrónico, muy sutil — tecnología que acompaña)
        led_r = max(2, int(R * 0.027))
        led_y = a_cy + int(leg_h * 0.42)
        draw.ellipse(
            [(cx - led_r, led_y - led_r), (cx + led_r, led_y + led_r)],
            fill=accent
        )


def arch_pin_circle(draw, cx, cy, R, stroke=3, color=PIEDRA, accent=ARENA):
    """Versión con círculo contenedor (para avatar / sello)."""
    pad = int(R * 0.18)
    draw.ellipse(
        [(cx - R, cy - R), (cx + R, cy + R)],
        outline=color, width=stroke
    )
    arch_pin(draw, cx, cy, R - pad, stroke=stroke, color=color, accent=accent)


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 1 — Exploración del emblema (fondo oscuro)
# ═══════════════════════════════════════════════════════════════════════════════
def canvas_exploracion():
    W, H = 3200, 2200
    img = Image.new('RGB', (W, H), CARBON)
    d   = ImageDraw.Draw(img)

    # Textura líneas
    for y in range(0, H, 20):
        d.line([(0, y), (W, y)], fill=CARBON_TEX, width=1)

    # ── Encabezado ────────────────────────────────────────────────────────
    d.text((72, 52),
           "GUTLEBER & ASOC.  —  EXPLORACIÓN DEL EMBLEMA",
           font=F("WorkSans-Regular.ttf", 28), fill=ARENA)
    d.line([(72, 100), (W - 72, 100)], fill=PIEDRA, width=1)

    # ── GRAN EMBLEMA CENTRAL (versión principal sin círculo) ──────────────
    main_cx, main_cy = int(W * 0.37), int(H * 0.47)
    main_R = 380
    arch_pin(d, main_cx, main_cy, main_R, stroke=5,
             color=CREMA, accent=ARENA)

    # Wordmark debajo
    f_wm  = F("IBMPlexSerif-Regular.ttf", 58)
    f_sub = F("WorkSans-Regular.ttf",     24)
    wm_y  = main_cy + main_R + 44
    cx_text(d, main_cx, wm_y,      "GUTLEBER & ASOC.",      f_wm,  CREMA)
    cx_text(d, main_cx, wm_y + 74, "INMOBILIARIA BOUTIQUE", f_sub, ARENA)
    cx_text(d, main_cx, wm_y + 110, "POSADAS · MISIONES",   f_sub, PIEDRA)

    # Label
    d.text((main_cx - 240, main_cy - main_R - 52),
           "MARCA PRIMARIA  —  sin círculo contenedor",
           font=F("WorkSans-Regular.ttf", 22), fill=ARENA)

    # ── Panel derecho: variaciones ────────────────────────────────────────
    right_x = int(W * 0.67)
    d.line([(right_x, 110), (right_x, H - 72)], fill=PIEDRA, width=1)

    # Var 1: Con círculo (versión avatar / sello)
    v1_cx, v1_cy = right_x + 380, int(H * 0.27)
    v1_R = 175
    arch_pin_circle(d, v1_cx, v1_cy, v1_R, stroke=3,
                    color=CREMA, accent=ARENA)
    cx_text(d, v1_cx, v1_cy + v1_R + 22,
            "Avatar / Sello", F("WorkSans-Regular.ttf", 22), ARENA)

    # Var 2: Versión en color PIEDRA sobre fondo arena
    v2_cx, v2_cy = right_x + 380, int(H * 0.62)
    v2_R = 175
    # Fondo pill
    rr(d, [v2_cx - v2_R - 48, v2_cy - v2_R - 48,
           v2_cx + v2_R + 48, v2_cy + v2_R + 48],
       radius=28, fill=(54, 53, 52))
    arch_pin(d, v2_cx, v2_cy, v2_R, stroke=3,
             color=PIEDRA, accent=ARENA)
    cx_text(d, v2_cx, v2_cy + v2_R + 22,
            "Sobre fondo neutro", F("WorkSans-Regular.ttf", 22), ARENA)

    # ── Escala de tamaños (fila inferior) ────────────────────────────────
    d.line([(72, H - 310), (right_x - 20, H - 310)], fill=PIEDRA, width=1)
    d.text((72, H - 296), "ESCALA",
           font=F("WorkSans-Bold.ttf", 20), fill=ARENA)

    scales = [(260, "XL"), (180, "L"), (110, "M"), (64, "S"), (36, "XS")]
    sx = 160
    for sc_R, sc_lbl in scales:
        sc_cy = H - 310 + 32 + sc_R + (scales[0][0] - sc_R) // 2
        arch_pin(d, sx, sc_cy, sc_R,
                 stroke=max(2, sc_R // 55),
                 color=CREMA, accent=ARENA, dot=(sc_R > 50))
        cx_text(d, sx, sc_cy + sc_R + 14,
                sc_lbl, F("WorkSans-Regular.ttf", 18), PIEDRA)
        sx += sc_R * 2 + 60

    # ── Footer ────────────────────────────────────────────────────────────
    d.line([(72, H - 60), (W - 72, H - 60)], fill=PIEDRA, width=1)
    d.text((76, H - 44),
           "Concepto: arco arquitectónico + pin de posición — un solo símbolo · Real estate primero",
           font=F("Lora-Italic.ttf", 26), fill=ARENA)

    img.save(os.path.join(OUTPUT, "brand_v3_01_emblema.png"))
    print("✓ Canvas 1 — Exploración emblema")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 2 — Sistema de identidad (fondo claro · refinado)
# ═══════════════════════════════════════════════════════════════════════════════
def canvas_sistema():
    W, H = 3200, 2200
    img = Image.new('RGB', (W, H), CREMA)
    d   = ImageDraw.Draw(img)

    for gx in range(0, W, 72):
        for gy in range(0, H, 72):
            d.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(218, 210, 198))

    # ── Header ────────────────────────────────────────────────────────────
    rr(d, [0, 0, W, 130], radius=0, fill=CARBON)
    d.text((64, 36), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf", 56), fill=CREMA)
    d.text((W - 510, 50), "SISTEMA DE IDENTIDAD",
           font=F("WorkSans-Regular.ttf", 25), fill=ARENA)

    def slbl(d2, x, y, text):
        d2.text((x, y), text, font=F("WorkSans-Bold.ttf", 20), fill=PIEDRA)
        d2.line([(x, y+25),(x + tw(d2,text,F("WorkSans-Bold.ttf",20)), y+25)],
                fill=ARENA, width=1)

    # ══ COL 1 — Paleta ═══════════════════════════════════════════════════
    c1 = 56
    slbl(d, c1, 158, "PALETA DE COLORES")
    palette = [
        (CARBON, "#2C2C2A", "Carbón",  "Textos · Logo · Marcos"),
        (PIEDRA, "#8C7B6B", "Piedra",  "Color principal · Íconos"),
        (ARENA,  "#C4B09A", "Arena",   "Secundario · Subtítulos"),
        (CREMA,  "#F0E8DC", "Crema",   "Fondos · Tarjetas"),
    ]
    sy = 202; sw_w = 494; sw_h = 136; sw_gap = 18
    for col, hex_v, name, use in palette:
        brd = ARENA if col == CREMA else None
        rr(d, [c1, sy, c1+sw_w, sy+sw_h], radius=16,
           fill=col, outline=brd, width=1 if brd else 0)
        tc = CREMA if col in (CARBON, PIEDRA) else CARBON
        d.text((c1+18, sy+18), name, font=F("WorkSans-Bold.ttf",27), fill=tc)
        d.text((c1+18, sy+54), hex_v, font=F("WorkSans-Regular.ttf",21), fill=tc)
        d.text((c1+18, sy+82), use,  font=F("WorkSans-Regular.ttf",18), fill=tc)
        sy += sw_h + sw_gap
    div1 = c1 + sw_w + 52
    d.line([(div1, 148), (div1, H-52)], fill=ARENA, width=1)

    # ══ COL 2 — Tipografía ════════════════════════════════════════════════
    c2 = div1 + 46
    tw2 = 830
    slbl(d, c2, 158, "SISTEMA TIPOGRÁFICO")

    d.text((c2, 202), "Georgia", font=F("Lora-Bold.ttf",88), fill=CARBON)
    d.text((c2, 300), "DISPLAY — WORDMARK · TITULARES",
           font=F("WorkSans-Regular.ttf",19), fill=PIEDRA)
    d.line([(c2, 336), (c2+tw2, 336)], fill=ARENA, width=1)
    d.text((c2, 352), "Patrimonio inmobiliario",
           font=F("Lora-Regular.ttf",52), fill=CARBON)
    d.text((c2, 414), "Inversión · Gestión · Desarrollo",
           font=F("Lora-Italic.ttf",40), fill=PIEDRA)
    d.line([(c2, 472), (c2+tw2, 472)], fill=ARENA, width=1)

    d.text((c2, 486), "Inter / Arial",
           font=F("InstrumentSans-Bold.ttf",50), fill=CARBON)
    d.text((c2, 546), "CUERPO — DIGITAL · COMUNICACIÓN",
           font=F("WorkSans-Regular.ttf",19), fill=PIEDRA)
    d.line([(c2, 582), (c2+tw2, 582)], fill=ARENA, width=1)
    cuerpo = [
        "Administración mensual. El cobro fue procesado el día 3.",
        "Inquilino: Martín García · Depto. 3B · $185.000/mes",
        "Próximo vencimiento: 03/07/2026  ·  Estado: Al día",
    ]
    for i, bl in enumerate(cuerpo):
        d.text((c2, 596+i*40), bl,
               font=F("InstrumentSans-Regular.ttf",27), fill=CARBON)
    d.line([(c2, 722), (c2+tw2, 722)], fill=ARENA, width=1)

    escala = [
        ("Titular de sección",  F("Lora-Bold.ttf",            66), "66"),
        ("Subtítulo de página", F("Lora-Regular.ttf",         44), "44"),
        ("Lead / Descriptor",   F("InstrumentSans-Regular.ttf",30), "30"),
        ("Cuerpo de texto",     F("InstrumentSans-Regular.ttf",22), "22"),
        ("Etiqueta · Detalle",  F("WorkSans-Regular.ttf",      16), "16"),
    ]
    ey = 738
    for label, fn, sz in escala:
        d.text((c2, ey), label, font=fn, fill=CARBON)
        d.text((c2+tw2-50, ey), sz, font=F("WorkSans-Regular.ttf",18), fill=ARENA)
        ey += (d.textbbox((0,0), label, font=fn)[3]) + 14

    div2 = c2 + tw2 + 52
    d.line([(div2, 148), (div2, H-52)], fill=ARENA, width=1)

    # ══ COL 3 — Emblema ══════════════════════════════════════════════════
    c3 = div2 + 48
    c3w = W - c3 - 56
    slbl(d, c3, 158, "EMBLEMA")

    # Emblema grande (claro)
    e_cx = c3 + c3w//2
    e_cy = 530
    e_R  = 220
    arch_pin(d, e_cx, e_cy, e_R, stroke=3, color=CARBON, accent=PIEDRA)
    cx_text(d, e_cx, e_cy+e_R+28,
            "GUTLEBER & ASOC.", F("IBMPlexSerif-Regular.ttf",34), CARBON)
    cx_text(d, e_cx, e_cy+e_R+70,
            "INMOBILIARIA BOUTIQUE", F("WorkSans-Regular.ttf",17), PIEDRA)
    d.text((c3, 780), "Versión clara",
           font=F("WorkSans-Regular.ttf",18), fill=PIEDRA)

    # Versión oscura
    dk_y = 812; dk_h = 248
    rr(d, [c3, dk_y, c3+c3w, dk_y+dk_h], radius=20, fill=CARBON)
    arch_pin(d, c3+c3w//2, dk_y+dk_h//2-14, 78, stroke=2,
             color=CREMA, accent=ARENA)
    cx_text(d, c3+c3w//2, dk_y+dk_h-46,
            "GUTLEBER & ASOC.", F("IBMPlexSerif-Regular.ttf",20), CREMA)
    d.text((c3, dk_y+dk_h+14), "Versión oscura",
           font=F("WorkSans-Regular.ttf",18), fill=PIEDRA)

    # Tokens
    tok_y = dk_y + dk_h + 56
    d.text((c3, tok_y), "TOKENS",
           font=F("WorkSans-Bold.ttf",19), fill=PIEDRA)
    tok_y += 28
    tokens = [
        ("border-radius", "8 · 16 · 24 · 32px"),
        ("spacing base",  "8px"),
        ("sombra",        "0 2px 12px rgba(44,44,42,.09)"),
        ("borde",         "1px solid #C4B09A"),
    ]
    for k, v in tokens:
        rr(d, [c3, tok_y, c3+c3w, tok_y+52], radius=10,
           fill=WHITE, outline=ARENA, width=1)
        d.text((c3+14, tok_y+6),  k, font=F("WorkSans-Regular.ttf",16), fill=PIEDRA)
        d.text((c3+14, tok_y+26), v, font=F("WorkSans-Bold.ttf",18),    fill=CARBON)
        tok_y += 60

    # Footer
    d.line([(56, H-58), (W-56, H-58)], fill=ARENA, width=1)
    d.text((60, H-44), "Arraigo Sereno — Sistema de Identidad · 2026",
           font=F("WorkSans-Regular.ttf",21), fill=PIEDRA)
    d.text((W-452, H-44), "Gutleber & Asoc. · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf",21), fill=PIEDRA)

    img.save(os.path.join(OUTPUT, "brand_v3_02_sistema.png"))
    print("✓ Canvas 2 — Sistema de identidad")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 3 — Aplicaciones digitales (web + tarjeta · todo redondeado)
# ═══════════════════════════════════════════════════════════════════════════════
def canvas_digital():
    W, H = 3200, 2200
    img = Image.new('RGB', (W, H), CREMA)
    d   = ImageDraw.Draw(img)

    for gx in range(0, W, 72):
        for gy in range(0, H, 72):
            d.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(218, 210, 198))

    rr(d, [0, 0, W, 130], radius=0, fill=CARBON)
    d.text((64, 36), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf",56), fill=CREMA)
    d.text((W-538, 50), "DIRECCIÓN DIGITAL",
           font=F("WorkSans-Regular.ttf",25), fill=ARENA)

    def slbl(x, y, text):
        d.text((x, y), text, font=F("WorkSans-Bold.ttf",20), fill=PIEDRA)
        d.line([(x, y+25), (x+tw(d,text,F("WorkSans-Bold.ttf",20)), y+25)],
               fill=ARENA, width=1)

    # ══ IZQUIERDA — Mockup web ════════════════════════════════════════════
    slbl(56, 154, "WEB — NAVBAR + HERO")

    wx, wy = 56, 202
    ww, wh = 1488, 870

    rr(d, [wx+6, wy+6, wx+ww+6, wy+wh+6], radius=22, fill=(210,202,190))
    rr(d, [wx, wy, wx+ww, wy+wh], radius=22, fill=WHITE)

    # Chrome bar
    rr(d, [wx, wy, wx+ww, wy+44], radius=22, fill=(228,220,208))
    d.rectangle([wx, wy+22, wx+ww, wy+44], fill=(228,220,208))
    for bx2, bc in [(wx+16,(220,80,80)),(wx+40,(220,180,60)),(wx+64,(80,180,80))]:
        d.ellipse([(bx2-8,wy+14),(bx2+8,wy+30)], fill=bc)
    rr(d, [wx+90, wy+8, wx+ww-20, wy+36], radius=8, fill=WHITE)
    d.text((wx+106, wy+10), "gutleber.com.ar",
           font=F("WorkSans-Regular.ttf",16), fill=(128,116,104))

    # Navbar
    ny = wy+44; nh = 78
    d.rectangle([wx, ny, wx+ww, ny+nh], fill=CARBON)
    # Logo en navbar
    arch_pin(d, wx+48, ny+nh//2, 24, stroke=2, color=CREMA, accent=ARENA, dot=False)
    d.text((wx+82, ny+24), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf",24), fill=CREMA)
    nav_items = ["Gestión","Inversiones","Desarrollos","Propiedades","Contacto"]
    nix = wx+ww-656
    for item in nav_items:
        d.text((nix, ny+28), item, font=F("WorkSans-Regular.ttf",20), fill=ARENA)
        nix += tw(d, item, F("WorkSans-Regular.ttf",20))+40

    # Hero
    hy2 = ny+nh; hh = 428
    d.rectangle([wx, hy2, wx+ww, hy2+hh], fill=(50,49,48))
    for hl in range(hy2, hy2+hh, 18):
        d.line([(wx,hl),(wx+ww,hl)], fill=(54,53,52), width=1)
    d.text((wx+72, hy2+70), "Patrimonio inmobiliario",
           font=F("Lora-Regular.ttf",68), fill=CREMA)
    d.text((wx+72, hy2+154), "con claridad y tecnología.",
           font=F("Lora-Italic.ttf",56), fill=PIEDRA)
    d.text((wx+72, hy2+240),
           "Posadas, Misiones · Boutique · Gestión en tiempo real",
           font=F("WorkSans-Regular.ttf",26), fill=ARENA)
    rr(d, [wx+72, hy2+316, wx+72+264, hy2+316+52], radius=26, fill=PIEDRA)
    d.text((wx+100, hy2+328), "Ver propiedades",
           font=F("WorkSans-Bold.ttf",24), fill=CREMA)

    # Stats bar
    sty = hy2+hh; sth = 96
    d.rectangle([wx, sty, wx+ww, sty+sth], fill=(230,222,210))
    stats = [("Gestión","Administración mensual"),("Inversiones","Oportunidades activas"),
             ("Desarrollos","Análisis de terrenos"),("Capital","Negocios patrimoniales")]
    sbx = wx+56
    for title, desc in stats:
        d.text((sbx, sty+12), title, font=F("WorkSans-Bold.ttf",24), fill=CARBON)
        d.text((sbx, sty+44), desc,  font=F("WorkSans-Regular.ttf",19), fill=PIEDRA)
        d.line([(sbx+232, sty+14),(sbx+232, sty+82)], fill=ARENA, width=1)
        sbx += 316
    rr(d, [wx, wy, wx+ww, wy+wh], radius=22, outline=ARENA, width=1)

    # ══ DERECHA — Tarjeta de propiedad ═══════════════════════════════════
    card_x = wx+ww+56
    slbl(card_x, 154, "TARJETA DE PROPIEDAD")

    cw = W - card_x - 56; ch = 870; cr = 22; pad = 34
    cy_card = 202

    rr(d, [card_x+6, cy_card+6, card_x+cw+6, cy_card+ch+6],
       radius=cr, fill=(210,202,190))
    rr(d, [card_x, cy_card, card_x+cw, cy_card+ch],
       radius=cr, fill=WHITE, outline=ARENA, width=1)

    # Foto
    img_h = int(ch * 0.46)
    rr(d, [card_x, cy_card, card_x+cw, cy_card+img_h],
       radius=cr, fill=(186,174,160))
    d.rectangle([card_x, cy_card+img_h-cr, card_x+cw, cy_card+img_h],
                fill=(186,174,160))
    for px3 in range(card_x, card_x+cw, 56):
        d.line([(px3,cy_card),(px3,cy_card+img_h)], fill=(176,164,150), width=1)
    for py3 in range(cy_card, cy_card+img_h, 48):
        d.line([(card_x,py3),(card_x+cw,py3)], fill=(176,164,150), width=1)
    cx_text(d, card_x+cw//2, cy_card+img_h//2-16,
            "[ FOTOGRAFÍA ]", F("WorkSans-Regular.ttf",28), (130,118,106))

    # Badges
    by = cy_card+img_h-56
    rr(d, [card_x+pad, by, card_x+pad+194, by+40], radius=20, fill=CARBON)
    d.text((card_x+pad+18, by+8), "EN ALQUILER",
           font=F("WorkSans-Bold.ttf",19), fill=CREMA)
    rr(d, [card_x+pad+208, by, card_x+pad+208+138, by+40], radius=20, fill=PIEDRA)
    d.text((card_x+pad+208+16, by+8), "AL DÍA",
           font=F("WorkSans-Bold.ttf",19), fill=CREMA)

    # Contenido
    cont_y = cy_card+img_h+pad
    d.text((card_x+pad, cont_y), "Departamento 3B · Planta alta",
           font=F("Lora-Regular.ttf",40), fill=CARBON)
    d.text((card_x+pad, cont_y+52), "Av. Costanera 1240 · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf",23), fill=PIEDRA)
    d.line([(card_x+pad, cont_y+96),(card_x+cw-pad, cont_y+96)], fill=ARENA, width=1)

    det_y = cont_y+112
    details = [("Inquilino","Martín García"),("Alquiler","$185.000/mes"),
               ("Vencimiento","03/07/2026"),("Estado","Al día")]
    ddx = card_x+pad
    col_w2 = (cw-pad*2)//4
    for lbl, val in details:
        d.text((ddx, det_y),    lbl, font=F("WorkSans-Regular.ttf",19), fill=PIEDRA)
        d.text((ddx, det_y+26), val, font=F("WorkSans-Bold.ttf",25),    fill=CARBON)
        ddx += col_w2

    # Acciones
    act_y = cy_card+ch-80
    rr(d, [card_x, act_y, card_x+cw, cy_card+ch], radius=cr, fill=CREMA)
    d.rectangle([card_x, act_y, card_x+cw, act_y+cr], fill=CREMA)
    d.line([(card_x+1, act_y),(card_x+cw-1, act_y)], fill=ARENA, width=1)
    acts = ["Ver detalles","Historial","Recibo","Contactar"]
    aax = card_x+pad
    for act in acts:
        d.text((aax, act_y+24), act,
               font=F("WorkSans-Regular.ttf",23), fill=PIEDRA)
        aax += (cw-pad*2)//4

    # ── Footer ────────────────────────────────────────────────────────────
    d.line([(56, H-58),(W-56, H-58)], fill=ARENA, width=1)
    d.text((60, H-44), "Arraigo Sereno — Dirección Digital · 2026",
           font=F("WorkSans-Regular.ttf",21), fill=PIEDRA)
    d.text((W-452, H-44), "Gutleber & Asoc. · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf",21), fill=PIEDRA)

    img.save(os.path.join(OUTPUT, "brand_v3_03_digital.png"))
    print("✓ Canvas 3 — Dirección digital")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 4 — Close-up del emblema con anotaciones (lectura del símbolo)
# ═══════════════════════════════════════════════════════════════════════════════
def canvas_closeup():
    W, H = 3200, 2200
    img = Image.new('RGB', (W, H), CARBON)
    d   = ImageDraw.Draw(img)
    for y in range(0, H, 20):
        d.line([(0,y),(W,y)], fill=CARBON_TEX, width=1)

    rr(d, [0,0,W,130], radius=0, fill=CARBON)
    d.text((64,36), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf",56), fill=CREMA)
    d.text((W-386, 50), "EL SÍMBOLO",
           font=F("WorkSans-Regular.ttf",25), fill=ARENA)
    d.line([(64,130),(W-64,130)], fill=PIEDRA, width=1)

    # Emblema XL centralizado
    big_cx, big_cy = W//2, int(H*0.43)
    big_R = 480
    arch_pin(d, big_cx, big_cy, big_R, stroke=6, color=CREMA, accent=ARENA)

    # ── Anotaciones ───────────────────────────────────────────────────────
    fa  = F("WorkSans-Regular.ttf", 24)
    fab = F("WorkSans-Bold.ttf",    26)
    fi  = F("Lora-Italic.ttf",      26)

    def dot_line(x1, y1, x2, y2):
        """Línea punteada entre dos puntos."""
        dist = math.hypot(x2-x1, y2-y1)
        steps = int(dist / 16)
        for i in range(steps):
            t = i / steps
            px4 = int(x1 + t*(x2-x1)); py4 = int(y1 + t*(y2-y1))
            d.ellipse([(px4-3,py4-3),(px4+3,py4+3)], fill=PIEDRA)

    # 1. Arco arquitectónico → arriba derecha
    arch_ann_x = big_cx + int(big_R * 0.15)
    arch_ann_y = big_cy - int(big_R * 0.72)
    lbl1_x = big_cx + int(big_R * 0.72)
    lbl1_y = big_cy - int(big_R * 1.00)
    d.text((lbl1_x, lbl1_y),      "Arco arquitectónico",   font=fab, fill=CREMA)
    d.text((lbl1_x, lbl1_y + 34), "Propiedad · Acceso",    font=fa,  fill=ARENA)
    d.text((lbl1_x, lbl1_y + 62), "Real estate primero",   font=fi,  fill=PIEDRA)
    dot_line(lbl1_x-8, lbl1_y+20, arch_ann_x, arch_ann_y)

    # 2. Pin de posición → derecha abajo
    pin_ann_x = big_cx + int(big_R * 0.12)
    pin_ann_y = big_cy + int(big_R * 0.72)
    lbl2_x = big_cx + int(big_R * 0.72)
    lbl2_y = big_cy + int(big_R * 0.60)
    d.text((lbl2_x, lbl2_y),      "Pin de posición",       font=fab, fill=CREMA)
    d.text((lbl2_x, lbl2_y + 34), "Arraigo local",         font=fa,  fill=ARENA)
    d.text((lbl2_x, lbl2_y + 62), "Posadas, Misiones",     font=fi,  fill=PIEDRA)
    dot_line(lbl2_x-8, lbl2_y+20, pin_ann_x, pin_ann_y)

    # 3. LED sutil → izquierda
    led_ann_x = big_cx - int(big_R * 0.05)
    led_ann_y = big_cy - int(big_R * 0.07)
    lbl3_x    = big_cx - int(big_R * 1.18)
    lbl3_y    = led_ann_y - 50
    d.text((lbl3_x, lbl3_y),      "Indicador electrónico", font=fab, fill=CREMA)
    d.text((lbl3_x, lbl3_y + 34), "Tecnología discreta",  font=fa,  fill=ARENA)
    d.text((lbl3_x, lbl3_y + 62), "Acompaña, no domina",  font=fi,  fill=PIEDRA)
    dot_line(lbl3_x + tw(d,"Indicador electrónico",fab)+8,
             lbl3_y+20, led_ann_x, led_ann_y)

    # ── Wordmark ──────────────────────────────────────────────────────────
    cx_text(d, big_cx, big_cy+big_R+50,
            "GUTLEBER & ASOC.",
            F("IBMPlexSerif-Regular.ttf",66), CREMA)
    cx_text(d, big_cx, big_cy+big_R+128,
            "INMOBILIARIA BOUTIQUE · POSADAS, MISIONES",
            F("WorkSans-Regular.ttf",28), ARENA)

    # Footer
    d.line([(64, H-60),(W-64, H-60)], fill=PIEDRA, width=1)
    d.text((68, H-44),
           "Un solo símbolo. Una sola lectura. Propiedad en un lugar.",
           font=F("Lora-Italic.ttf",28), fill=ARENA)

    img.save(os.path.join(OUTPUT, "brand_v3_04_closeup.png"))
    print("✓ Canvas 4 — Close-up símbolo")


canvas_exploracion()
canvas_sistema()
canvas_digital()
canvas_closeup()

print("\n✅ Brand system v3 completo →", OUTPUT)
