"""
Manual de Identidad Visual — Gutleber & Asociados
PDF generado con reportlab. Formato A4 vertical.
Marca vigente (2026-07): pin cerrado + casa sólida, petróleo/champagne,
descriptor "Negocios Inmobiliarios". Ver brand/brand.config.json.
"""

import io, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, white
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader, simpleSplit
from PIL import Image as PILImage
import cairosvg

W, H = A4   # 595.27 x 841.89 pt

# ── COLORES (paleta definitiva) ───────────────────────────────────────────────
PETROLEO  = HexColor("#0F2233")
CHAMPAGNE = HexColor("#C8A96B")
CREMA     = HexColor("#F5EFE3")
CARBON    = HexColor("#1A1A18")
BLANCO    = white

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE    = os.path.dirname(__file__)
LOGO_D  = os.path.join(BASE, "../logo")
CARTEL_D = os.path.join(BASE, "../cartel")
OUT     = os.path.join(BASE, "Gutleber_Manual_Identidad_Visual.pdf")

def load_svg_png(path, w_px):
    png = cairosvg.svg2png(url=path, output_width=w_px)
    return io.BytesIO(png)

def set_font(c, style, size):
    fonts = {
        'serif':        'Times-Roman',
        'serif-bold':   'Times-Bold',
        'serif-italic': 'Times-Italic',
        'sans':         'Helvetica',
        'sans-bold':    'Helvetica-Bold',
    }
    c.setFont(fonts.get(style, 'Helvetica'), size)

def draw_rule(c, x, y, w, color=None, thickness=0.5):
    c.setStrokeColor(color or CHAMPAGNE)
    c.setLineWidth(thickness)
    c.line(x, y, x + w, y)

def page_footer(c, page_num):
    draw_rule(c, 20*mm, 16*mm, W - 40*mm, CHAMPAGNE, 0.4)
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawString(20*mm, 10*mm, "GUTLEBER & ASOCIADOS  ·  MANUAL DE IDENTIDAD VISUAL  ·  2026")
    c.drawRightString(W - 20*mm, 10*mm, str(page_num))

def section_header(c, number, title, y, on_dark=False):
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawString(20*mm, y, f"0{number}")
    set_font(c, 'serif-bold', 22)
    c.setFillColor(CREMA if on_dark else PETROLEO)
    c.drawString(20*mm, y - 14, title)
    draw_rule(c, 20*mm, y - 20, W - 40*mm, CHAMPAGNE, 0.6)
    return y - 30

# ═══════════════════════════════════════════════════════════════════════════════
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Manual de Identidad Visual — Gutleber & Asociados")
c.setAuthor("Gutleber & Asociados")
c.setSubject("Brand Guidelines 2026")

# ══════════════════════════════════════════════════════
# PÁG 1 — PORTADA
# ══════════════════════════════════════════════════════
c.setFillColor(PETROLEO)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(CHAMPAGNE)
c.rect(0, 0, 8*mm, H, fill=1, stroke=0)

emb_w = 130
emb_png = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema_oscuro.svg"), emb_w * 3)
c.drawImage(ImageReader(emb_png), (W - emb_w) / 2, H * 0.53,
            width=emb_w, height=emb_w * 1.2, mask='auto')

set_font(c, 'serif-bold', 38)
c.setFillColor(CREMA)
c.drawCentredString(W / 2, H * 0.46, "GUTLEBER & ASOCIADOS")

set_font(c, 'serif-italic', 13)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, H * 0.42, "NEGOCIOS INMOBILIARIOS")

draw_rule(c, 30*mm, H * 0.39, W - 60*mm, CHAMPAGNE, 0.8)

set_font(c, 'sans', 10)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, H * 0.35, "MANUAL DE IDENTIDAD VISUAL")
set_font(c, 'sans', 8)
c.drawCentredString(W / 2, H * 0.32, "Posadas, Misiones  ·  2026")

set_font(c, 'sans', 7)
c.drawCentredString(W / 2, 18*mm, "Uso exclusivo interno y para proveedores autorizados")
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 2 — ÍNDICE
# ══════════════════════════════════════════════════════
c.setFillColor(CREMA)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(PETROLEO)
c.rect(0, H - 28*mm, W, 28*mm, fill=1, stroke=0)

set_font(c, 'serif-bold', 18)
c.setFillColor(CREMA)
c.drawString(20*mm, H - 18*mm, "ÍNDICE")

items = [
    ("01", "La Firma",                    "03"),
    ("02", "Pilares y Valores",           "04"),
    ("03", "Paleta de Colores",           "05"),
    ("04", "Tipografía",                  "06"),
    ("05", "El Emblema",                  "07"),
    ("06", "Variaciones del Ícono",       "08"),
    ("07", "El Wordmark",                 "09"),
    ("08", "Uso Correcto e Incorrecto",   "10"),
    ("09", "Aplicaciones",                "11"),
]

y = H - 50*mm
for num, title, pg in items:
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawString(20*mm, y, num)
    set_font(c, 'serif', 13)
    c.setFillColor(PETROLEO)
    c.drawString(32*mm, y, title)
    set_font(c, 'sans', 9)
    c.setFillColor(CHAMPAGNE)
    c.drawRightString(W - 20*mm, y, pg)
    draw_rule(c, 20*mm, y - 5, W - 40*mm, CHAMPAGNE, 0.3)
    y -= 22

page_footer(c, 2)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 3 — LA FIRMA
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 1, "La Firma", y)
y -= 10

set_font(c, 'serif', 11)
c.setFillColor(PETROLEO)
texto = (
    "Gutleber & Asociados es una firma de negocios inmobiliarios con base en Posadas, Misiones. "
    "Fundada por Cintia Gutleber —corredora matriculada con trayectoria en el rubro— y su socio, "
    "quien aporta visión tecnológica y apertura comercial. Arranca con tres unidades de negocio: "
    "Compra-Venta, Alquileres y Administración."
)
lines = simpleSplit(texto, 'Times-Roman', 11, W - 40*mm)
for line in lines:
    c.drawString(20*mm, y, line)
    y -= 15
y -= 8

col_w = (W - 44*mm) / 2
col1_x = 20*mm
col2_x = col1_x + col_w + 4*mm

for col_x, header, items_list in [
    (col1_x, "LA FIRMA ES", [
        "Ágil · moderna · profesional",
        "Orientada a gestión y transparencia",
        "Tecnológica con atención humana",
        "Clara y directa en cada contacto",
        "Con arraigo local en Posadas",
    ]),
    (col2_x, "LA FIRMA NO ES", [
        "Inmobiliaria tradicional o familiar",
        "Vendedor agresivo o de alto volumen",
        "Lujo exagerado o estética recargada",
        "Empresa fría o impersonal",
        "Operación improvisada",
    ]),
]:
    c.setFillColor(PETROLEO if header == "LA FIRMA ES" else CREMA)
    c.rect(col_x, y - 6, col_w, 22, fill=1, stroke=0)
    set_font(c, 'sans-bold', 8)
    c.setFillColor(CREMA if header == "LA FIRMA ES" else PETROLEO)
    c.drawString(col_x + 6, y + 2, header)

    ty = y - 20
    for item in items_list:
        set_font(c, 'serif', 9.5)
        c.setFillColor(PETROLEO)
        c.drawString(col_x + 10, ty, f"— {item}")
        ty -= 16

y -= 130
draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.5)
y -= 20
set_font(c, 'serif-italic', 12)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, y, '"El propietario siempre sabe qué pasa con su propiedad."')
y -= 14
set_font(c, 'sans', 8)
c.setFillColor(PETROLEO)
c.drawCentredString(W / 2, y, "Diferencial central de la firma")

page_footer(c, 3)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 4 — PILARES Y VALORES
# ══════════════════════════════════════════════════════
c.setFillColor(PETROLEO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 2, "Pilares y Valores", y, on_dark=True)
y -= 10

set_font(c, 'serif-bold', 13)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "Pilares de negocio — guían decisiones de diseño y producto")
y -= 22

pilares = [
    ("Gestión",       "Administración cercana y ordenada de cada propiedad."),
    ("Velocidad",     "Respuesta rápida, sin fricción, en cada contacto."),
    ("Transparencia", "El propietario siempre sabe qué pasa con su propiedad."),
]
for title, body in pilares:
    c.setFillColor(CHAMPAGNE)
    c.rect(20*mm, y - 2, 3, 30, fill=1, stroke=0)
    set_font(c, 'serif-bold', 11)
    c.setFillColor(CREMA)
    c.drawString(28*mm, y + 16, title)
    lines = simpleSplit(body, 'Times-Roman', 10, W - 48*mm)
    ly = y + 2
    for line in lines:
        set_font(c, 'serif', 10)
        c.setFillColor(CHAMPAGNE)
        c.drawString(28*mm, ly, line)
        ly -= 13
    y -= 46

y -= 20
draw_rule(c, 20*mm, y, W - 40*mm, HexColor("#3A4A57"), 0.5)
y -= 26

set_font(c, 'serif-bold', 13)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "Valores de marca — de cara al cliente")
y -= 22

valores = [
    ("Ubicación", "Estamos donde vos nos necesités."),
    ("Hogar",     "Conectamos personas con su lugar."),
    ("Confianza", "Trayectoria, compromiso y transparencia."),
    ("Moderno",   "Diseño simple, actual y memorable."),
]
for title, body in valores:
    c.setFillColor(CHAMPAGNE)
    c.rect(20*mm, y - 2, 3, 30, fill=1, stroke=0)
    set_font(c, 'serif-bold', 11)
    c.setFillColor(CREMA)
    c.drawString(28*mm, y + 16, title)
    lines = simpleSplit(body, 'Times-Roman', 10, W - 48*mm)
    ly = y + 2
    for line in lines:
        set_font(c, 'serif', 10)
        c.setFillColor(CHAMPAGNE)
        c.drawString(28*mm, ly, line)
        ly -= 13
    y -= 46

page_footer(c, 4)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 5 — PALETA DE COLORES
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 3, "Paleta de Colores", y)
y -= 20

colores = [
    ("#0F2233", "Petróleo",  "Color primario. Fondos, textos sobre claro, wordmark."),
    ("#C8A96B", "Champagne", "Color de acento. Emblema, detalles, descriptores."),
    ("#F5EFE3", "Crema",     "Fondo claro. Documentos, tarjetas, espacio en blanco."),
    ("#1A1A18", "Carbón",    "Fondo oscuro alternativo. Redes, stories."),
]

swatch_w = (W - 40*mm) / 4 - 4
sx = 20*mm
for hex_c, name, desc in colores:
    c.setFillColor(HexColor(hex_c))
    c.roundRect(sx, y - 80, swatch_w, 80, 4, fill=1, stroke=0)
    if hex_c == "#F5EFE3":
        c.setStrokeColor(CHAMPAGNE)
        c.setLineWidth(0.5)
        c.roundRect(sx, y - 80, swatch_w, 80, 4, fill=0, stroke=1)
    set_font(c, 'serif-bold', 12)
    c.setFillColor(PETROLEO)
    c.drawString(sx, y - 96, name)
    set_font(c, 'sans', 8)
    c.setFillColor(CHAMPAGNE)
    c.drawString(sx, y - 108, hex_c)
    lines = simpleSplit(desc, 'Helvetica', 8, swatch_w)
    dy = y - 120
    for line in lines:
        c.setFillColor(PETROLEO)
        c.drawString(sx, dy, line)
        dy -= 11
    sx += swatch_w + 5

y -= 160
draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 16
set_font(c, 'sans', 8)
c.setFillColor(PETROLEO)
nota = ("No usar la paleta anterior (navy/cobre, ni la paleta tierra carbón/piedra/arena/crema "
        "del brief original) — ambas descartadas. La paleta debe mantenerse cerrada a estos 4 colores.")
for line in simpleSplit(nota, 'Helvetica', 8, W - 40*mm):
    c.drawString(20*mm, y, line)
    y -= 12

y -= 20
set_font(c, 'serif-bold', 13)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Combinaciones principales")
draw_rule(c, 20*mm, y - 6, W - 40*mm, CHAMPAGNE, 0.3)
y -= 24

combos = [
    (PETROLEO, CREMA,     "Petróleo sobre Crema", "Documentos, presentaciones"),
    (PETROLEO, BLANCO,    "Petróleo sobre Blanco", "Uso digital general"),
    (CREMA,    PETROLEO,  "Crema sobre Petróleo",  "Redes sociales, fondo oscuro"),
    (CHAMPAGNE, PETROLEO, "Champagne sobre Petróleo", "Descriptores en modo oscuro"),
]
bx = 20*mm
bw = (W - 40*mm) / 4 - 4
for bg, fg, label, uso in combos:
    c.setFillColor(bg)
    c.roundRect(bx, y - 32, bw, 32, 3, fill=1, stroke=0)
    set_font(c, 'serif-bold', 9)
    c.setFillColor(fg)
    c.drawCentredString(bx + bw / 2, y - 16, "Aa")
    set_font(c, 'sans', 7)
    c.setFillColor(PETROLEO)
    c.drawString(bx, y - 44, label)
    c.setFillColor(CHAMPAGNE)
    c.drawString(bx, y - 54, uso)
    bx += bw + 5

page_footer(c, 5)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 6 — TIPOGRAFÍA
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 4, "Tipografía", y)
y -= 20

c.setFillColor(CREMA)
c.rect(20*mm, y - 10, W - 40*mm, 10, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(CHAMPAGNE)
c.drawString(21*mm, y - 5, "DISPLAY — MARCA Y TITULARES")

y -= 24
set_font(c, 'serif-bold', 48)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Georgia")
y -= 16
set_font(c, 'serif-italic', 14)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "Negocios Inmobiliarios · Gestión · Velocidad · Transparencia")
y -= 20
set_font(c, 'serif', 10)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Uso: nombre de la firma, titulares de documentos, descriptor, momentos patrimoniales.")
y -= 24

escalas = [(28, "Titular principal"), (20, "Subtítulo de sección"), (14, "Lead / Descriptor"), (11, "Cuerpo de texto")]
for size, label in escalas:
    set_font(c, 'serif', size)
    c.setFillColor(PETROLEO)
    c.drawString(20*mm, y, f"Gutleber & Asociados  —  {size}pt")
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawRightString(W - 20*mm, y, label)
    y -= size * 1.4 + 4

y -= 10
draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 20

c.setFillColor(CREMA)
c.rect(20*mm, y - 10, W - 40*mm, 10, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(CHAMPAGNE)
c.drawString(21*mm, y - 5, "CUERPO — DIGITAL Y COMUNICACIÓN")

y -= 24
set_font(c, 'sans-bold', 48)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Inter / Arial")
y -= 16
set_font(c, 'sans', 12)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "Administración mensual. El cobro fue procesado el día 3.")
y -= 14
c.drawString(20*mm, y, "Inquilino: Martín García · Depto. 3B · $185.000/mes")
y -= 20
set_font(c, 'sans', 10)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Uso: textos corridos, redes sociales, presentaciones, PDF, comunicación digital.")

page_footer(c, 6)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 7 — EL EMBLEMA
# ══════════════════════════════════════════════════════
c.setFillColor(PETROLEO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
set_font(c, 'sans', 7)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "05")
set_font(c, 'serif-bold', 22)
c.setFillColor(CREMA)
c.drawString(20*mm, y - 14, "El Emblema")
draw_rule(c, 20*mm, y - 20, W - 40*mm, CHAMPAGNE, 0.6)
y -= 48

emb_big = 170
emb_png = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema_oscuro.svg"), emb_big * 3)
c.drawImage(ImageReader(emb_png), (W - emb_big) / 2, y - emb_big * 1.2,
            width=emb_big, height=emb_big * 1.2, mask='auto')

y -= emb_big * 1.2 + 20
set_font(c, 'sans', 7)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, y, "Emblema principal — sobre fondo petróleo")
y -= 30

set_font(c, 'serif-italic', 11)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, y, "Pin de ubicación cerrado + casa sólida — arraigo y ubicación primero")
y -= 30

elementos = [
    ("Pin de ubicación", "Forma contenedora, completamente cerrada. Ubica la propiedad en el territorio."),
    ("Casa sólida",      "Silueta de techo + paredes, opaca y autocontenida — no depende del fondo."),
    ("Dos versiones",    "Clara (pin petróleo / casa champagne) y oscura (pin champagne / casa petróleo)."),
]

for title, body in elementos:
    c.setFillColor(CHAMPAGNE)
    c.circle(20*mm + 3, y + 4, 3, fill=1, stroke=0)
    set_font(c, 'serif-bold', 10)
    c.setFillColor(CREMA)
    c.drawString(28*mm, y, title)
    set_font(c, 'serif', 10)
    c.setFillColor(CHAMPAGNE)
    c.drawString(28*mm, y - 13, body)
    y -= 36

y -= 10
draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 18

escalas_emb = [80, 48, 32, 20, 14]
ex = 20*mm
for sz in escalas_emb:
    ep = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema_oscuro.svg"), sz * 3)
    c.drawImage(ImageReader(ep), ex, y - sz * 1.2, width=sz, height=sz * 1.2, mask='auto')
    set_font(c, 'sans', 6)
    c.setFillColor(CHAMPAGNE)
    c.drawCentredString(ex + sz / 2, y - sz * 1.2 - 10, f"{sz}px")
    ex += sz + 20

set_font(c, 'sans', 7)
c.setFillColor(CREMA)
c.drawString(20*mm, y - max(escalas_emb) * 1.2 - 22,
             "El emblema opera correctamente desde 14px. Bajo ese tamaño, usar solo la versión oscura o clara, nunca monocromo.")

page_footer(c, 7)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 8 — VARIACIONES DEL ÍCONO
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 6, "Variaciones del Ícono", y)
y -= 10

set_font(c, 'serif', 10.5)
c.setFillColor(PETROLEO)
texto2 = ("Cuatro variaciones cubren todos los fondos y soportes: Principal, Negativo, "
          "Sobre fondo y Monocromo. Nomenclatura validada junto con Cintia.")
for line in simpleSplit(texto2, 'Times-Roman', 10.5, W - 40*mm):
    c.drawString(20*mm, y, line)
    y -= 14
y -= 16

strip_path = os.path.join(LOGO_D, "variaciones_icono_strip.png")
if os.path.exists(strip_path):
    pil = PILImage.open(strip_path)
    pw, ph = pil.size
    max_w = W - 40*mm
    max_h = 220
    scale = min(max_w/pw, max_h/ph)
    rw, rh = pw*scale, ph*scale
    rx = (W - rw)/2
    c.drawImage(strip_path, rx, y - rh, width=rw, height=rh, mask='auto')
    y -= rh + 24

draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 20

usos = [
    ("Principal",     "Pin champagne + casa petróleo. Uso general sobre fondos claros o fotografía."),
    ("Negativo",      "Pin petróleo + casa champagne. Uso sobre fondo champagne o crema saturado."),
    ("Sobre fondo",   "Squircle petróleo sólido con ícono crema adentro. Avatares, íconos de app."),
    ("Monocromo",      "Solo trazo, un color. Sellos, bordados, grabado, fax/impresión limitada."),
]
for title, body in usos:
    set_font(c, 'serif-bold', 10)
    c.setFillColor(PETROLEO)
    c.drawString(20*mm, y, title)
    set_font(c, 'serif', 10)
    c.setFillColor(CHAMPAGNE)
    c.drawString(60*mm, y, body)
    y -= 20

page_footer(c, 8)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 9 — WORDMARK
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 7, "El Wordmark", y)
y -= 20

set_font(c, 'serif-bold', 40)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "GUTLEBER & Asociados")
y -= 18
set_font(c, 'serif-italic', 14)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "NEGOCIOS INMOBILIARIOS")
y -= 30

draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 24

reglas = [
    ("GUTLEBER en mayúsculas",     "El apellido va siempre en caja alta, Georgia bold."),
    ("El & no se elimina",         "'& Asociados' es parte del nombre. No se reemplaza por 'Y' ni se omite."),
    ("Tracking generoso",          "Letter-spacing amplio. El nombre respira. No condensar."),
    ("Descriptor fijo",            "'NEGOCIOS INMOBILIARIOS' — no usar 'Inmobiliaria Boutique' (descartado)."),
    ("Jerarquía fija",             "Nombre → Descriptor → Ubicación. No alterar el orden."),
]

for title, body in reglas:
    set_font(c, 'serif-bold', 10)
    c.setFillColor(PETROLEO)
    c.drawString(20*mm, y, title)
    set_font(c, 'serif', 10)
    c.setFillColor(CHAMPAGNE)
    c.drawString(20*mm, y - 13, body)
    draw_rule(c, 20*mm, y - 20, W - 40*mm, HexColor("#E8DDC8"), 0.3)
    y -= 34

page_footer(c, 9)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 10 — USO CORRECTO E INCORRECTO
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 8, "Uso Correcto e Incorrecto", y)
y -= 20

correcto = [
    "Usar las versiones provistas (clara/oscura/monocromo). No recrear el emblema.",
    "Respetar los colores de marca en todos los usos.",
    "Mantener el espacio mínimo equivalente a la altura del pin.",
    "Sobre fondos oscuros, usar la versión oscura (pin champagne).",
    "Sobre fondos claros, usar la versión clara (pin petróleo).",
]
incorrecto = [
    "No deformar, rotar ni inclinar el emblema.",
    "No cambiar los colores. Sin degradados, sin sombras artificiales.",
    "No separar el emblema del wordmark en usos principales.",
    "No usar tipografías no autorizadas en combinación con el logo.",
    "No agregar efectos: brillo, relieve, contorno.",
    "No usar 'Inmobiliaria Boutique' como descriptor en ningún soporte.",
]

col_w2 = (W - 44*mm) / 2

c.setFillColor(HexColor("#EDF3EE"))
c.roundRect(20*mm, y - len(correcto) * 24 - 30, col_w2, len(correcto) * 24 + 30, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 8)
c.setFillColor(HexColor("#3E6B4C"))
c.drawString(22*mm, y - 8, "✓  USO CORRECTO")
cy = y - 26
for item in correcto:
    set_font(c, 'serif', 9)
    c.setFillColor(PETROLEO)
    lines = simpleSplit(item, 'Times-Roman', 9, col_w2 - 14)
    for line in lines:
        c.drawString(24*mm, cy, line)
        cy -= 13
    cy -= 4

ix = 20*mm + col_w2 + 4*mm
c.setFillColor(HexColor("#F5EDED"))
c.roundRect(ix, y - len(incorrecto) * 22 - 30, col_w2, len(incorrecto) * 22 + 30, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 8)
c.setFillColor(HexColor("#8B3A3A"))
c.drawString(ix + 2*mm, y - 8, "✗  USO INCORRECTO")
iy = y - 26
for item in incorrecto:
    set_font(c, 'serif', 9)
    c.setFillColor(PETROLEO)
    lines = simpleSplit(item, 'Times-Roman', 9, col_w2 - 14)
    for line in lines:
        c.drawString(ix + 4*mm, iy, line)
        iy -= 13
    iy -= 3

y -= max(len(correcto) * 24, len(incorrecto) * 22) + 50

draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 18
set_font(c, 'serif-bold', 11)
c.setFillColor(PETROLEO)
c.drawString(20*mm, y, "Área de protección mínima")
y -= 16
set_font(c, 'serif', 10)
c.setFillColor(CHAMPAGNE)
c.drawString(20*mm, y, "El espacio libre alrededor del emblema debe ser como mínimo igual al")
y -= 14
c.drawString(20*mm, y, "ancho del pin, en cualquier escala de uso.")

page_footer(c, 10)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 11 — APLICACIONES
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 9, "Aplicaciones", y)
y -= 16

cartel_path = os.path.join(CARTEL_D, "cartel_venta_preview.png")
tarjeta_path = os.path.join(BASE, "tarjeta_preview.png")

max_h = 210
if os.path.exists(cartel_path):
    pil = PILImage.open(cartel_path)
    pw, ph = pil.size
    scale = min((W/2 - 30*mm) / pw, max_h / ph)
    rw, rh = pw * scale, ph * scale
    rx = 20*mm
    c.drawImage(cartel_path, rx, y - rh, width=rw, height=rh)
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawString(rx, y - rh - 14, "Cartel de propiedad — foto flotante, sin marquesina")

if os.path.exists(tarjeta_path):
    pil = PILImage.open(tarjeta_path)
    pw, ph = pil.size
    scale = min((W/2 - 30*mm) / pw, max_h / ph)
    rw, rh = pw * scale, ph * scale
    rx2 = W/2 + 10*mm
    c.drawImage(tarjeta_path, rx2, y - rh, width=rw, height=rh)
    set_font(c, 'sans', 7)
    c.setFillColor(CHAMPAGNE)
    c.drawString(rx2, y - rh - 14, "Tarjeta personal")

y -= max_h + 40
draw_rule(c, 20*mm, y, W - 40*mm, CHAMPAGNE, 0.4)
y -= 20

dig = ["Avatar Instagram (1:1)", "Portada Instagram (4:5)", "Perfil WhatsApp Business", "Firma de email", "Ícono de app / favicon"]
fis = ["Tarjeta personal (90 × 55 mm)", "Cartel de propiedad (40 × 50 cm)", "Vinilo en puerta de vidrio", "Hoja membretada A4"]

c.setFillColor(CREMA)
c.roundRect(20*mm, y - len(dig)*18 - 20, (W - 44*mm)/2, len(dig)*18 + 20, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(CHAMPAGNE)
c.drawString(22*mm, y - 8, "DIGITALES")
dy = y - 22
for item in dig:
    set_font(c, 'serif', 9)
    c.setFillColor(PETROLEO)
    c.drawString(24*mm, dy, f"— {item}")
    dy -= 16

ix2 = 20*mm + (W - 44*mm)/2 + 4*mm
c.setFillColor(CREMA)
c.roundRect(ix2, y - len(fis)*18 - 20, (W - 44*mm)/2, len(fis)*18 + 20, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(CHAMPAGNE)
c.drawString(ix2 + 2*mm, y - 8, "IMPRESOS / FÍSICOS")
fy = y - 22
for item in fis:
    set_font(c, 'serif', 9)
    c.setFillColor(PETROLEO)
    c.drawString(ix2 + 4*mm, fy, f"— {item}")
    fy -= 16

page_footer(c, 11)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 12 — CONTRATAPA
# ══════════════════════════════════════════════════════
c.setFillColor(PETROLEO)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(CHAMPAGNE)
c.rect(W - 8*mm, 0, 8*mm, H, fill=1, stroke=0)

emb_c = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema_oscuro.svg"), 80 * 3)
c.drawImage(ImageReader(emb_c), (W - 80) / 2, H * 0.5, width=80, height=80*1.2, mask='auto')

set_font(c, 'serif', 11)
c.setFillColor(CHAMPAGNE)
c.drawCentredString(W / 2, H * 0.44, "Este manual es un documento vivo.")
set_font(c, 'serif-italic', 11)
c.drawCentredString(W / 2, H * 0.41, "Cada decisión aquí tiene una razón.")

draw_rule(c, 40*mm, H * 0.38, W - 80*mm, CHAMPAGNE, 0.5)

set_font(c, 'sans', 8)
c.drawCentredString(W / 2, H * 0.34, "@gutleberasociados  ·  Posadas, Misiones  ·  2026")

c.showPage()
c.save()
print(f"✓ PDF generado: {OUT}")
