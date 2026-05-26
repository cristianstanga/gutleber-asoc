from PIL import Image, ImageDraw, ImageFont
import math, os

FONTS  = "/Users/mac/Documents/gutleber & asoc/.claude/skills/canvas-design/canvas-fonts"
OUTPUT = "/Users/mac/Documents/gutleber & asoc/brand"

CARBON = (44,  44,  42)
PIEDRA = (140, 123, 107)
ARENA  = (196, 176, 154)
CREMA  = (240, 232, 220)
WHITE  = (255, 255, 255)
CARBON_SOFT = (54, 54, 52)

def F(name, size):
    return ImageFont.truetype(os.path.join(FONTS, name), size)

def tw(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[2] - b[0]

def th(draw, text, font):
    b = draw.textbbox((0, 0), text, font=font)
    return b[3] - b[1]

def cx_text(draw, cx, y, text, font, fill):
    draw.text((cx - tw(draw, text, font) // 2, y), text, font=font, fill=fill)

def rr(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)

# ─────────────────────────────────────────────────────────────────────────────
# EMBLEMA v2: Pin de posición con cerradura electrónica integrada
# Concepto: el pin ES la cerradura — vanguardia y arraigo en un solo símbolo
# ─────────────────────────────────────────────────────────────────────────────
def draw_emblem(draw, cx, cy, R, stroke=3, bg=None):
    """
    - Círculo contenedor fino
    - Pin teardrop desplazado levemente a la derecha
    - Arco de cerradura (shackle) dentro de la cabeza del pin
    - Barra cuerpo del candado con punto LED
    - Arcos de señal electrónica a la izquierda (3 arcos concéntricos)
    """

    # ── Círculo contenedor ────────────────────────────────────────────────
    draw.ellipse([(cx-R, cy-R), (cx+R, cy+R)], outline=PIEDRA, width=stroke)

    # ── Pin de posición ───────────────────────────────────────────────────
    # Cabeza ligeramente derecha y arriba para equilibrar los arcos
    ph_cx = cx + int(R * 0.14)
    ph_cy = cy - int(R * 0.06)
    ph_r  = int(R * 0.37)          # radio de la cabeza

    # Cabeza (círculo exterior del pin)
    draw.ellipse(
        [(ph_cx - ph_r, ph_cy - ph_r), (ph_cx + ph_r, ph_cy + ph_r)],
        outline=PIEDRA, width=stroke
    )

    # Cola del pin: líneas tangentes desde ~220° y ~320° al punto inferior
    a1, a2 = math.radians(222), math.radians(318)
    tx1 = ph_cx + ph_r * math.cos(a1)
    ty1 = ph_cy + ph_r * math.sin(a1)
    tx2 = ph_cx + ph_r * math.cos(a2)
    ty2 = ph_cy + ph_r * math.sin(a2)
    tip_y = cy + int(R * 0.74)

    draw.line([(tx1, ty1), (ph_cx, tip_y)], fill=PIEDRA, width=stroke)
    draw.line([(tx2, ty2), (ph_cx, tip_y)], fill=PIEDRA, width=stroke)

    # Punta redondeada (pequeño arco en el vértice)
    tip_r = stroke + 1
    draw.ellipse(
        [(ph_cx - tip_r, tip_y - tip_r), (ph_cx + tip_r, tip_y + tip_r)],
        fill=PIEDRA
    )

    # ── Cerradura electrónica dentro de la cabeza ─────────────────────────
    lock_r   = int(ph_r * 0.36)   # radio del shackle (arco)
    lock_cx  = ph_cx
    lock_cy  = ph_cy + int(ph_r * 0.08)  # centrado con leve bajada

    # Shackle (arco de candado, semicírculo superior)
    shackle_y_bot = lock_cy - int(ph_r * 0.08)
    draw.arc(
        [(lock_cx - lock_r, shackle_y_bot - lock_r * 2),
         (lock_cx + lock_r, shackle_y_bot)],
        start=180, end=0, fill=PIEDRA, width=stroke
    )

    # Cuerpo del candado (rectángulo redondeado)
    body_w = int(lock_r * 2.2)
    body_h = int(lock_r * 1.1)
    body_x1 = lock_cx - body_w // 2
    body_y1 = shackle_y_bot
    body_x2 = lock_cx + body_w // 2
    body_y2 = shackle_y_bot + body_h
    r_body  = max(3, body_h // 4)
    rr(draw, [body_x1, body_y1, body_x2, body_y2],
       radius=r_body, outline=PIEDRA, width=stroke)

    # Punto LED (indicador electrónico)
    dot_r = max(2, int(lock_r * 0.22))
    dot_cx = lock_cx
    dot_cy = body_y1 + body_h // 2
    draw.ellipse(
        [(dot_cx - dot_r, dot_cy - dot_r), (dot_cx + dot_r, dot_cy + dot_r)],
        fill=ARENA
    )

    # ── Arcos de señal electrónica (izquierda) ────────────────────────────
    # Origen: punto fijo a la izquierda del centro del círculo
    arc_ox = cx - int(R * 0.60)
    arc_oy = cy + int(R * 0.04)

    # Punto de origen
    o_r = max(2, stroke - 1)
    draw.ellipse(
        [(arc_ox - o_r, arc_oy - o_r), (arc_ox + o_r, arc_oy + o_r)],
        fill=ARENA
    )

    # 3 arcos concéntricos apuntando a la derecha (0°=derecha, ±45°)
    for i, arc_r in enumerate([int(R * 0.15), int(R * 0.26), int(R * 0.37)]):
        alpha = 1.0 - i * 0.28
        col = ARENA if i < 2 else (196, 176, 154)
        draw.arc(
            [(arc_ox - arc_r, arc_oy - arc_r),
             (arc_ox + arc_r, arc_oy + arc_r)],
            start=315, end=45, fill=col, width=stroke
        )


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 1 — Filosofía · Portada oscura
# ═══════════════════════════════════════════════════════════════════════════════
W, H = 3200, 2200

def make_canvas_1():
    img = Image.new('RGB', (W, H), CARBON)
    d   = ImageDraw.Draw(img)

    # Textura de fondo: líneas horizontales muy sutiles
    for y in range(0, H, 20):
        d.line([(0, y), (W, y)], fill=CARBON_SOFT, width=1)

    # Panel derecho levemente más claro
    for x in range(int(W * 0.62), W):
        d.line([(x, 0), (x, H)], fill=(50, 49, 48), width=1)

    div_x = int(W * 0.62)

    # ── Nombre del movimiento ─────────────────────────────────────────────
    d.text((96, 56),  "ARRAIGO", font=F("IBMPlexSerif-Bold.ttf", 208), fill=CREMA)
    d.text((96, 268), "SERENO",  font=F("IBMPlexSerif-Bold.ttf", 208), fill=PIEDRA)

    d.text((104, 508),
           "Filosofía visual · Gutleber & Asoc. · Posadas, Misiones · 2026",
           font=F("WorkSans-Regular.ttf", 26), fill=ARENA)

    d.line([(96, 560), (div_x - 80, 560)], fill=PIEDRA, width=1)

    # ── Manifiesto ────────────────────────────────────────────────────────
    manifiesto = [
        ("La identidad no nace del mármol importado ni del acero frío.", False),
        ("Emerge del suelo propio: la piedra caliza de Misiones,",       False),
        ("la madera que envejece con dignidad.",                         False),
        ("",                                                              False),
        ("La claridad es el lujo. La cerradura electrónica dice:",       False),
        ("estamos acá, la puerta está controlada, el propietario sabe.", False),
        ("El pin de posición dice: esto tiene un lugar en el mundo.",    False),
        ("",                                                              False),
        ("Tecnología que trabaja en silencio.",                          False),
        ("Como las raíces que sostienen lo visible.",                    False),
        ("",                                                              False),
        ("El estilo visual de quien sabe exactamente",                   True),
        ("qué hace, dónde está y por qué.",                              True),
    ]
    y_m = 588
    for text, italic in manifiesto:
        if text:
            fn = F("Lora-Italic.ttf", 36) if italic else F("Lora-Regular.ttf", 36)
            col = ARENA if italic else CREMA
            d.text((100, y_m), text, font=fn, fill=col)
        y_m += 50

    # ── Emblema ───────────────────────────────────────────────────────────
    emb_cx = div_x + (W - div_x) // 2
    emb_cy = int(H * 0.40)
    emb_R  = 295
    draw_emblem(d, emb_cx, emb_cy, emb_R, stroke=4)

    # Wordmark
    f_wm = F("IBMPlexSerif-Regular.ttf", 52)
    f_sb = F("WorkSans-Regular.ttf", 24)
    wm_y = emb_cy + emb_R + 42
    cx_text(d, emb_cx, wm_y,      "GUTLEBER & ASOC.",    f_wm, CREMA)
    cx_text(d, emb_cx, wm_y + 68, "INMOBILIARIA BOUTIQUE", f_sb, ARENA)

    # ── Footer ────────────────────────────────────────────────────────────
    d.line([(96, H - 88), (div_x - 80, H - 88)], fill=PIEDRA, width=1)
    d.text((100, H - 70),
           "El propietario siempre sabe qué pasa con su propiedad.  Nada queda en el aire.",
           font=F("Lora-Italic.ttf", 27), fill=ARENA)

    img.save(os.path.join(OUTPUT, "brand_canvas_01_filosofia.png"))
    print("✓ Canvas 1 — Filosofía")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 2 — Sistema de identidad (fondo claro · todo redondeado)
# ═══════════════════════════════════════════════════════════════════════════════
def make_canvas_2():
    img = Image.new('RGB', (W, H), CREMA)
    d   = ImageDraw.Draw(img)

    # Grilla de puntos sutiles
    for gx in range(0, W, 72):
        for gy in range(0, H, 72):
            d.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(218, 210, 198))

    # ── Header ────────────────────────────────────────────────────────────
    rr(d, [0, 0, W, 128], radius=0, fill=CARBON)
    d.text((60, 34), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf", 56), fill=CREMA)
    d.text((W - 510, 48), "SISTEMA DE IDENTIDAD",
           font=F("WorkSans-Regular.ttf", 25), fill=ARENA)

    def section_lbl(x, y, text):
        d.text((x, y), text, font=F("WorkSans-Bold.ttf", 21), fill=PIEDRA)
        lw = tw(d, text, F("WorkSans-Bold.ttf", 21))
        d.line([(x, y + 26), (x + lw, y + 26)], fill=ARENA, width=1)

    # ══ COL 1: Paleta ════════════════════════════════════════════════════
    col1_x = 56
    section_lbl(col1_x, 158, "PALETA DE COLORES")

    palette = [
        (CARBON,  "#2C2C2A", "Carbón",  "Textos · Logo · Marcos"),
        (PIEDRA,  "#8C7B6B", "Piedra",  "Color principal · Íconos"),
        (ARENA,   "#C4B09A", "Arena",   "Secundario · Subtítulos"),
        (CREMA,   "#F0E8DC", "Crema",   "Fondos · Tarjetas"),
    ]
    sw_y  = 204
    sw_h  = 138
    sw_gap = 20
    sw_w  = 500

    for color, hex_v, name, use in palette:
        border = ARENA if color == CREMA else None
        rr(d, [col1_x, sw_y, col1_x + sw_w, sw_y + sw_h],
           radius=16, fill=color,
           outline=border, width=1 if border else 0)
        tc = CREMA if color in (CARBON, PIEDRA) else CARBON
        d.text((col1_x + 20, sw_y + 20), name,
               font=F("WorkSans-Bold.ttf", 28), fill=tc)
        d.text((col1_x + 20, sw_y + 58), hex_v,
               font=F("WorkSans-Regular.ttf", 22), fill=tc)
        d.text((col1_x + 20, sw_y + 90), use,
               font=F("WorkSans-Regular.ttf", 18), fill=tc)
        sw_y += sw_h + sw_gap

    div1_x = col1_x + sw_w + 52
    d.line([(div1_x, 148), (div1_x, H - 52)], fill=ARENA, width=1)

    # ══ COL 2: Tipografía ════════════════════════════════════════════════
    typ_x = div1_x + 48
    typ_w = 820
    section_lbl(typ_x, 158, "SISTEMA TIPOGRÁFICO")

    # Display heading
    d.text((typ_x, 204), "Georgia",
           font=F("Lora-Bold.ttf", 88), fill=CARBON)
    d.text((typ_x, 302), "DISPLAY — WORDMARK · TITULARES",
           font=F("WorkSans-Regular.ttf", 19), fill=PIEDRA)
    d.line([(typ_x, 338), (typ_x + typ_w, 338)], fill=ARENA, width=1)

    d.text((typ_x, 354), "Patrimonio inmobiliario",
           font=F("Lora-Regular.ttf", 54), fill=CARBON)
    d.text((typ_x, 418), "Inversión · Gestión · Desarrollo",
           font=F("Lora-Italic.ttf", 40), fill=PIEDRA)
    d.line([(typ_x, 480), (typ_x + typ_w, 480)], fill=ARENA, width=1)

    # Body heading
    d.text((typ_x, 494), "Inter / Arial",
           font=F("InstrumentSans-Bold.ttf", 50), fill=CARBON)
    d.text((typ_x, 556), "CUERPO — DIGITAL · COMUNICACIÓN",
           font=F("WorkSans-Regular.ttf", 19), fill=PIEDRA)
    d.line([(typ_x, 592), (typ_x + typ_w, 592)], fill=ARENA, width=1)

    body_lines = [
        "Su propiedad está administrada. El cobro fue procesado.",
        "Inquilino: Martín García · Depto. 3B · $185.000/mes",
        "Próximo vencimiento: 03/07/2026  ·  Estado: Al día",
    ]
    for i, bl in enumerate(body_lines):
        d.text((typ_x, 606 + i * 40), bl,
               font=F("InstrumentSans-Regular.ttf", 27), fill=CARBON)

    d.line([(typ_x, 738), (typ_x + typ_w, 738)], fill=ARENA, width=1)

    # Escala tipográfica
    scale = [
        ("Titular de sección",   F("Lora-Bold.ttf",             68), "68"),
        ("Subtítulo de página",  F("Lora-Regular.ttf",          46), "46"),
        ("Lead / Descriptor",    F("InstrumentSans-Regular.ttf",30), "30"),
        ("Cuerpo de texto",      F("InstrumentSans-Regular.ttf",22), "22"),
        ("Etiqueta · Detalle",   F("WorkSans-Regular.ttf",       16), "16"),
    ]
    sy = 754
    for label, fn, sz in scale:
        d.text((typ_x, sy), label, font=fn, fill=CARBON)
        d.text((typ_x + typ_w - 52, sy), sz,
               font=F("WorkSans-Regular.ttf", 18), fill=ARENA)
        sy += th(d, label, fn) + 16

    div2_x = typ_x + typ_w + 52
    d.line([(div2_x, 148), (div2_x, H - 52)], fill=ARENA, width=1)

    # ══ COL 3: Emblema + versiones ═══════════════════════════════════════
    col3_x = div2_x + 48
    col3_w = W - col3_x - 56
    section_lbl(col3_x, 158, "EMBLEMA & VERSIONES")

    # Versión clara
    emb_cx = col3_x + col3_w // 2
    emb_cy = 500
    emb_R  = 210
    draw_emblem(d, emb_cx, emb_cy, emb_R, stroke=3)

    cx_text(d, emb_cx, emb_cy + emb_R + 22,
            "GUTLEBER & ASOC.",
            F("IBMPlexSerif-Regular.ttf", 34), CARBON)
    cx_text(d, emb_cx, emb_cy + emb_R + 64,
            "INMOBILIARIA BOUTIQUE",
            F("WorkSans-Regular.ttf", 17), PIEDRA)

    d.text((col3_x, 798), "Versión clara",
           font=F("WorkSans-Regular.ttf", 18), fill=PIEDRA)

    # Versión oscura (pill redondeado)
    dark_y = 830
    dark_h = 250
    rr(d, [col3_x, dark_y, col3_x + col3_w, dark_y + dark_h],
       radius=20, fill=CARBON)

    mini_cx = col3_x + col3_w // 2
    mini_cy = dark_y + dark_h // 2 - 16
    mini_R  = 72
    draw_emblem(d, mini_cx, mini_cy, mini_R, stroke=2)
    cx_text(d, mini_cx, dark_y + dark_h - 48,
            "GUTLEBER & ASOC.",
            F("IBMPlexSerif-Regular.ttf", 20), CREMA)

    d.text((col3_x, dark_y + dark_h + 14), "Versión oscura",
           font=F("WorkSans-Regular.ttf", 18), fill=PIEDRA)

    # Tokens de diseño
    tok_y = dark_y + dark_h + 56
    d.text((col3_x, tok_y), "TOKENS",
           font=F("WorkSans-Bold.ttf", 19), fill=PIEDRA)
    tok_y += 28
    tokens = [
        ("border-radius", "8 · 12 · 20 · 32px"),
        ("spacing",       "base 8px"),
        ("shadow",        "0 2px 12px rgba(44,44,42,.10)"),
        ("border",        "1px solid #C4B09A"),
    ]
    for k, v in tokens:
        rr(d, [col3_x, tok_y, col3_x + col3_w, tok_y + 52],
           radius=10, fill=WHITE, outline=ARENA, width=1)
        d.text((col3_x + 14, tok_y + 6),  k,
               font=F("WorkSans-Regular.ttf", 16), fill=PIEDRA)
        d.text((col3_x + 14, tok_y + 26), v,
               font=F("WorkSans-Bold.ttf",    18), fill=CARBON)
        tok_y += 60

    # ── Footer ────────────────────────────────────────────────────────────
    d.line([(56, H - 58), (W - 56, H - 58)], fill=ARENA, width=1)
    d.text((60, H - 44), "Arraigo Sereno — Sistema de Identidad Visual · 2026",
           font=F("WorkSans-Regular.ttf", 21), fill=PIEDRA)
    d.text((W - 460, H - 44), "Gutleber & Asoc. · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf", 21), fill=PIEDRA)

    img.save(os.path.join(OUTPUT, "brand_canvas_02_sistema.png"))
    print("✓ Canvas 2 — Sistema")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 3 — Dirección digital: web + tarjeta de propiedad (todo redondeado)
# ═══════════════════════════════════════════════════════════════════════════════
def make_canvas_3():
    img = Image.new('RGB', (W, H), CREMA)
    d   = ImageDraw.Draw(img)

    for gx in range(0, W, 72):
        for gy in range(0, H, 72):
            d.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(218, 210, 198))

    # ── Header ────────────────────────────────────────────────────────────
    rr(d, [0, 0, W, 128], radius=0, fill=CARBON)
    d.text((60, 34), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf", 56), fill=CREMA)
    d.text((W - 560, 48), "DIRECCIÓN DIGITAL",
           font=F("WorkSans-Regular.ttf", 25), fill=ARENA)

    def section_lbl(x, y, text):
        d.text((x, y), text, font=F("WorkSans-Bold.ttf", 21), fill=PIEDRA)
        lw = tw(d, text, F("WorkSans-Bold.ttf", 21))
        d.line([(x, y + 26), (x + lw, y + 26)], fill=ARENA, width=1)

    # ══ IZQUIERDA: Mockup web ════════════════════════════════════════════
    section_lbl(56, 156, "WEB — NAVBAR + HERO")

    win_x, win_y = 56, 204
    win_w, win_h = 1480, 860

    # Sombra
    rr(d, [win_x+6, win_y+6, win_x+win_w+6, win_y+win_h+6],
       radius=20, fill=(212, 204, 192))
    # Window card
    rr(d, [win_x, win_y, win_x+win_w, win_y+win_h],
       radius=20, fill=WHITE)

    # Browser chrome
    rr(d, [win_x, win_y, win_x+win_w, win_y+44],
       radius=20, fill=(230, 222, 210))
    # Traffic lights
    for bx, bc in [(win_x+16, (220,80,80)), (win_x+40,(220,180,60)), (win_x+64,(80,180,80))]:
        d.ellipse([(bx-8, win_y+14), (bx+8, win_y+30)], fill=bc)
    # URL bar
    rr(d, [win_x+90, win_y+8, win_x+win_w-20, win_y+36],
       radius=8, fill=WHITE)
    d.text((win_x+104, win_y+10), "gutleber.com.ar",
           font=F("WorkSans-Regular.ttf", 16), fill=(130, 118, 106))

    # ─ Navbar ────────────────────────────────────────────────────────────
    nav_y = win_y + 44
    nav_h = 76
    rr(d, [win_x, nav_y, win_x+win_w, nav_y+nav_h],
       radius=0, fill=CARBON)

    # Logo en navbar
    emb_n_cx = win_x + 52
    emb_n_cy = nav_y + nav_h // 2
    draw_emblem(d, emb_n_cx, emb_n_cy, 24, stroke=2)
    d.text((win_x + 84, nav_y + 22), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf", 24), fill=CREMA)

    # Nav items
    nav_items = ["Gestión", "Inversiones", "Desarrollos", "Propiedades", "Contacto"]
    n_ix = win_x + win_w - 660
    for item in nav_items:
        d.text((n_ix, nav_y + 26), item,
               font=F("WorkSans-Regular.ttf", 20), fill=ARENA)
        n_ix += tw(d, item, F("WorkSans-Regular.ttf", 20)) + 42

    # ─ Hero ──────────────────────────────────────────────────────────────
    hero_y = nav_y + nav_h
    hero_h = 420
    rr(d, [win_x, hero_y, win_x+win_w, hero_y+hero_h], radius=0, fill=(50, 49, 48))
    for hy in range(hero_y, hero_y+hero_h, 18):
        d.line([(win_x, hy), (win_x+win_w, hy)], fill=(54, 53, 52), width=1)

    d.text((win_x+72, hero_y+72), "Patrimonio inmobiliario",
           font=F("Lora-Regular.ttf", 70), fill=CREMA)
    d.text((win_x+72, hero_y+158), "con claridad y tecnología.",
           font=F("Lora-Italic.ttf", 58), fill=PIEDRA)
    d.text((win_x+72, hero_y+246),
           "Posadas, Misiones · Boutique · Gestión en tiempo real",
           font=F("WorkSans-Regular.ttf", 26), fill=ARENA)

    # CTA button redondeado
    btn_x, btn_y = win_x+72, hero_y+318
    rr(d, [btn_x, btn_y, btn_x+268, btn_y+52], radius=26, fill=PIEDRA)
    d.text((btn_x+28, btn_y+11), "Ver propiedades",
           font=F("WorkSans-Bold.ttf", 24), fill=CREMA)

    # ─ Stats bar ─────────────────────────────────────────────────────────
    stats_y = hero_y + hero_h
    stats_h = 96
    rr(d, [win_x, stats_y, win_x+win_w, stats_y+stats_h],
       radius=0, fill=(232, 224, 212))
    stats = [
        ("Gestión",     "Administración mensual"),
        ("Inversiones", "Oportunidades activas"),
        ("Desarrollos", "Análisis de terrenos"),
        ("Capital",     "Negocios patrimoniales"),
    ]
    sx = win_x + 56
    for title, desc in stats:
        d.text((sx, stats_y+12), title,
               font=F("WorkSans-Bold.ttf", 24), fill=CARBON)
        d.text((sx, stats_y+44), desc,
               font=F("WorkSans-Regular.ttf", 19), fill=PIEDRA)
        d.line([(sx+232, stats_y+14), (sx+232, stats_y+82)], fill=ARENA, width=1)
        sx += 316

    # Borde window
    rr(d, [win_x, win_y, win_x+win_w, win_y+win_h], radius=20, outline=ARENA, width=1)

    # ══ DERECHA: Tarjeta de propiedad ════════════════════════════════════
    card_x = win_x + win_w + 56
    section_lbl(card_x, 156, "TARJETA DE PROPIEDAD")

    card_y  = 204
    card_w  = W - card_x - 56
    card_h  = 860
    card_r  = 20
    pad     = 36

    # Sombra
    rr(d, [card_x+6, card_y+6, card_x+card_w+6, card_y+card_h+6],
       radius=card_r, fill=(212, 204, 192))
    # Card fondo
    rr(d, [card_x, card_y, card_x+card_w, card_y+card_h],
       radius=card_r, fill=WHITE, outline=ARENA, width=1)

    # Imagen placeholder (parte superior, bordes redondeados arriba)
    img_h = int(card_h * 0.46)
    rr(d, [card_x, card_y, card_x+card_w, card_y+img_h],
       radius=card_r, fill=(188, 176, 162))
    # Tapa bordes inferiores de la imagen (para que no sea doble redondeo)
    d.rectangle([card_x, card_y+img_h-card_r, card_x+card_w, card_y+img_h],
                fill=(188, 176, 162))

    # Grilla en la foto
    for px2 in range(card_x, card_x+card_w, 56):
        d.line([(px2, card_y), (px2, card_y+img_h)], fill=(178, 166, 152), width=1)
    for py2 in range(card_y, card_y+img_h, 48):
        d.line([(card_x, py2), (card_x+card_w, py2)], fill=(178, 166, 152), width=1)
    cx_text(d, card_x+card_w//2, card_y+img_h//2-18,
            "[ FOTOGRAFÍA DE PROPIEDAD ]",
            F("WorkSans-Regular.ttf", 28), (132, 120, 108))

    # Badges sobre foto (esquina inferior izquierda)
    badge_y = card_y + img_h - 56
    rr(d, [card_x+pad, badge_y, card_x+pad+194, badge_y+40],
       radius=20, fill=CARBON)
    d.text((card_x+pad+18, badge_y+8), "EN ALQUILER",
           font=F("WorkSans-Bold.ttf", 19), fill=CREMA)

    rr(d, [card_x+pad+206, badge_y, card_x+pad+206+142, badge_y+40],
       radius=20, fill=PIEDRA)
    d.text((card_x+pad+206+16, badge_y+8), "AL DÍA",
           font=F("WorkSans-Bold.ttf", 19), fill=CREMA)

    # Contenido
    cont_y = card_y + img_h + pad
    d.text((card_x+pad, cont_y),
           "Departamento 3B · Planta alta",
           font=F("Lora-Regular.ttf", 42), fill=CARBON)
    d.text((card_x+pad, cont_y+54),
           "Av. Costanera 1240 · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf", 24), fill=PIEDRA)

    d.line([(card_x+pad, cont_y+98), (card_x+card_w-pad, cont_y+98)], fill=ARENA, width=1)

    # Detalles en columnas
    det_y = cont_y + 114
    details = [
        ("Inquilino",   "Martín García"),
        ("Alquiler",    "$185.000 / mes"),
        ("Vencimiento", "03/07/2026"),
        ("Estado",      "Al día"),
    ]
    dx = card_x + pad
    col_w = (card_w - pad * 2) // len(details)
    for label, val in details:
        d.text((dx, det_y),    label, font=F("WorkSans-Regular.ttf", 20), fill=PIEDRA)
        d.text((dx, det_y+28), val,   font=F("WorkSans-Bold.ttf",    26), fill=CARBON)
        dx += col_w

    # Barra de acciones (fondo Arena claro, redondeada abajo)
    act_y = card_y + card_h - 80
    rr(d, [card_x, act_y, card_x+card_w, card_y+card_h],
       radius=card_r, fill=CREMA)
    # Cubre bordes superiores del rr
    d.rectangle([card_x, act_y, card_x+card_w, act_y+card_r], fill=CREMA)
    d.line([(card_x+1, act_y), (card_x+card_w-1, act_y)], fill=ARENA, width=1)

    actions = ["Ver detalles", "Historial", "Recibo", "Contactar"]
    ax = card_x + pad
    for act in actions:
        d.text((ax, act_y+24), act, font=F("WorkSans-Regular.ttf", 24), fill=PIEDRA)
        ax += (card_w - pad * 2) // len(actions)

    # ── Footer ────────────────────────────────────────────────────────────
    d.line([(56, H-58), (W-56, H-58)], fill=ARENA, width=1)
    d.text((60, H-44), "Arraigo Sereno — Dirección Digital · 2026",
           font=F("WorkSans-Regular.ttf", 21), fill=PIEDRA)
    d.text((W-460, H-44), "Gutleber & Asoc. · Posadas, Misiones",
           font=F("WorkSans-Regular.ttf", 21), fill=PIEDRA)

    img.save(os.path.join(OUTPUT, "brand_canvas_03_digital.png"))
    print("✓ Canvas 3 — Digital")


# ═══════════════════════════════════════════════════════════════════════════════
#  CANVAS 4 — Emblema close-up + variaciones (showcase del símbolo)
# ═══════════════════════════════════════════════════════════════════════════════
def make_canvas_4():
    img = Image.new('RGB', (W, H), CREMA)
    d   = ImageDraw.Draw(img)

    for gx in range(0, W, 72):
        for gy in range(0, H, 72):
            d.ellipse([(gx-1, gy-1), (gx+1, gy+1)], fill=(218, 210, 198))

    rr(d, [0, 0, W, 128], radius=0, fill=CARBON)
    d.text((60, 34), "GUTLEBER & ASOC.",
           font=F("IBMPlexSerif-Regular.ttf", 56), fill=CREMA)
    d.text((W-380, 48), "EL EMBLEMA",
           font=F("WorkSans-Regular.ttf", 25), fill=ARENA)

    # ── Emblema grande central ────────────────────────────────────────────
    big_cx, big_cy = W // 2, int(H * 0.44)
    big_R = 440
    draw_emblem(d, big_cx, big_cy, big_R, stroke=5)

    # ── Anotaciones del emblema ───────────────────────────────────────────
    fn_ann  = F("WorkSans-Regular.ttf", 22)
    fn_ann_b = F("WorkSans-Bold.ttf", 24)

    # Arcos de señal → texto izquierdo
    ann_arc_x = big_cx - big_R - 200
    ann_arc_y = big_cy - 40
    d.text((ann_arc_x - 320, ann_arc_y - 20), "Señal electrónica",  font=fn_ann_b, fill=CARBON)
    d.text((ann_arc_x - 320, ann_arc_y + 10), "Información en tiempo real", font=fn_ann, fill=PIEDRA)
    d.text((ann_arc_x - 320, ann_arc_y + 38), "Conexión permanente",        font=fn_ann, fill=PIEDRA)
    # Línea punteada hacia el arco
    for lx in range(ann_arc_x - 8, ann_arc_x - 308, -14):
        d.ellipse([(lx, ann_arc_y+10), (lx+6, ann_arc_y+16)], fill=ARENA)

    # Cerradura → texto arriba derecha
    ann_lock_x = big_cx + int(big_R * 0.18)
    ann_lock_y = big_cy - big_R + 60
    lock_lbl_x = ann_lock_x + 220
    lock_lbl_y = ann_lock_y - 120
    d.text((lock_lbl_x, lock_lbl_y),      "Cerradura electrónica", font=fn_ann_b, fill=CARBON)
    d.text((lock_lbl_x, lock_lbl_y + 30), "Acceso digital",        font=fn_ann,   fill=PIEDRA)
    d.text((lock_lbl_x, lock_lbl_y + 58), "Tecnología discreta",   font=fn_ann,   fill=PIEDRA)
    for ly in range(lock_lbl_y + 60, ann_lock_y + 20, 14):
        d.ellipse([(lock_lbl_x - 6, ly), (lock_lbl_x, ly+6)], fill=ARENA)

    # Pin → texto abajo derecha
    pin_tip_y = big_cy + int(big_R * 0.74)
    pin_lbl_x = big_cx + int(big_R * 0.24) + 80
    pin_lbl_y = pin_tip_y - 60
    d.text((pin_lbl_x, pin_lbl_y),      "Pin de posición",       font=fn_ann_b, fill=CARBON)
    d.text((pin_lbl_x, pin_lbl_y + 30), "Arraigo local",         font=fn_ann,   fill=PIEDRA)
    d.text((pin_lbl_x, pin_lbl_y + 58), "Posadas, Misiones",     font=fn_ann,   fill=PIEDRA)
    for lx2 in range(pin_lbl_x - 8, big_cx + int(big_R * 0.24) + 8, -14):
        d.ellipse([(lx2, pin_lbl_y + 26), (lx2+6, pin_lbl_y+32)], fill=ARENA)

    # ── Wordmark ──────────────────────────────────────────────────────────
    cx_text(d, big_cx, big_cy + big_R + 48,
            "GUTLEBER & ASOC.",
            F("IBMPlexSerif-Regular.ttf", 64), CARBON)
    cx_text(d, big_cx, big_cy + big_R + 122,
            "INMOBILIARIA BOUTIQUE · POSADAS, MISIONES",
            F("WorkSans-Regular.ttf", 26), PIEDRA)

    # ── Variaciones en fila abajo ─────────────────────────────────────────
    var_y  = big_cy + big_R + 178
    var_rs = [48, 36, 28, 20]
    var_labels = ["Grande", "Mediano", "Pequeño", "Mínimo"]
    var_gap = (W - 2 * 56) // len(var_rs)
    for i, (vr, lbl) in enumerate(zip(var_rs, var_labels)):
        vx = 56 + var_gap * i + var_gap // 2
        vy = var_y + 60
        draw_emblem(d, vx, vy, vr, stroke=max(1, vr // 20))
        cx_text(d, vx, vy + vr + 14, lbl,
                F("WorkSans-Regular.ttf", 18), PIEDRA)

    # Footer
    d.line([(56, H-58), (W-56, H-58)], fill=ARENA, width=1)
    d.text((60, H-44), "Arraigo Sereno — Showcase del Emblema · 2026",
           font=F("WorkSans-Regular.ttf", 21), fill=PIEDRA)

    img.save(os.path.join(OUTPUT, "brand_canvas_04_emblema.png"))
    print("✓ Canvas 4 — Emblema showcase")


# ── Ejecutar todos ────────────────────────────────────────────────────────────
make_canvas_1()
make_canvas_2()
make_canvas_3()
make_canvas_4()

print("\n✅ Brand system v2 completo →", OUTPUT)
