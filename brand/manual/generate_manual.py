"""
Manual de Identidad Visual — Gutleber & Asoc.
PDF generado con reportlab. Formato A4 vertical.
"""

import io, os
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from PIL import Image as PILImage
import cairosvg

W, H = A4   # 595.27 x 841.89 pt

# ── COLORES ──────────────────────────────────────────────────────────────────
CARBON  = HexColor("#0F172A")
PIEDRA  = HexColor("#B45309")
ARENA   = HexColor("#B45309")
CREMA   = HexColor("#F8F7F4")
BLANCO  = white

# ── PATHS ─────────────────────────────────────────────────────────────────────
BASE   = os.path.dirname(__file__)
LOGO_D = os.path.join(BASE, "../logo")
OUT    = os.path.join(BASE, "Gutleber_Manual_Identidad_Visual.pdf")

# Cargar emblema como PNG en memoria (cairosvg)
def load_svg_png(path, w_px):
    png = cairosvg.svg2png(url=path, output_width=w_px)
    return io.BytesIO(png)

# ── HELPERS ──────────────────────────────────────────────────────────────────
def set_font(c, style, size):
    """style: 'serif' | 'serif-bold' | 'serif-italic' | 'sans' | 'sans-bold'"""
    fonts = {
        'serif':        'Times-Roman',
        'serif-bold':   'Times-Bold',
        'serif-italic': 'Times-Italic',
        'sans':         'Helvetica',
        'sans-bold':    'Helvetica-Bold',
    }
    c.setFont(fonts.get(style, 'Helvetica'), size)

def draw_rule(c, x, y, w, color=None, thickness=0.5):
    c.setStrokeColor(color or PIEDRA)
    c.setLineWidth(thickness)
    c.line(x, y, x + w, y)

def draw_label(c, text, x, y, color=None):
    set_font(c, 'sans', 7)
    c.setFillColor(color or ARENA)
    c.drawString(x, y, text.upper())

def page_footer(c, page_num):
    draw_rule(c, 20*mm, 16*mm, W - 40*mm, PIEDRA, 0.4)
    set_font(c, 'sans', 7)
    c.setFillColor(PIEDRA)
    c.drawString(20*mm, 10*mm, "GUTLEBER & ASOCIADOS  ·  MANUAL DE IDENTIDAD VISUAL  ·  2026")
    c.drawRightString(W - 20*mm, 10*mm, str(page_num))

def section_header(c, number, title, y):
    set_font(c, 'sans', 7)
    c.setFillColor(ARENA)
    c.drawString(20*mm, y, f"0{number}")
    set_font(c, 'serif-bold', 22)
    c.setFillColor(CARBON)
    c.drawString(20*mm, y - 14, title)
    draw_rule(c, 20*mm, y - 20, W - 40*mm, PIEDRA, 0.6)
    return y - 30

# ═══════════════════════════════════════════════════════════════════════════════
# DOCUMENTO
# ═══════════════════════════════════════════════════════════════════════════════
c = canvas.Canvas(OUT, pagesize=A4)
c.setTitle("Manual de Identidad Visual — Gutleber & Asoc.")
c.setAuthor("Gutleber & Asoc.")
c.setSubject("Brand Guidelines 2026")

# ══════════════════════════════════════════════════════
# PÁG 1 — PORTADA
# ══════════════════════════════════════════════════════
c.setFillColor(CARBON)
c.rect(0, 0, W, H, fill=1, stroke=0)

# Franja lateral izquierda
c.setFillColor(PIEDRA)
c.rect(0, 0, 8*mm, H, fill=1, stroke=0)

# Emblema centrado grande
emb_w = 140
emb_png = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema.svg"), emb_w * 3)
c.drawImage(ImageReader(emb_png),
            (W - emb_w) / 2, H * 0.52, width=emb_w, height=emb_w,
            mask='auto')

# Nombre firma
set_font(c, 'serif-bold', 38)
c.setFillColor(CREMA)
c.drawCentredString(W / 2, H * 0.46, "GUTLEBER & ASOCIADOS")

# Descriptor
set_font(c, 'serif-italic', 13)
c.setFillColor(ARENA)
c.drawCentredString(W / 2, H * 0.42, "INMOBILIARIA BOUTIQUE")

# Línea decorativa
draw_rule(c, 30*mm, H * 0.39, W - 60*mm, PIEDRA, 0.8)

# Título del documento
set_font(c, 'sans', 10)
c.setFillColor(ARENA)
c.drawCentredString(W / 2, H * 0.35, "MANUAL DE IDENTIDAD VISUAL")

set_font(c, 'sans', 8)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, H * 0.32, "Posadas, Misiones  ·  2026")

# Pie portada
set_font(c, 'sans', 7)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, 18*mm, "Uso exclusivo interno y para proveedores autorizados")

c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 2 — ÍNDICE
# ══════════════════════════════════════════════════════
c.setFillColor(CREMA)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(CARBON)
c.rect(0, H - 28*mm, W, 28*mm, fill=1, stroke=0)

set_font(c, 'serif-bold', 18)
c.setFillColor(CREMA)
c.drawString(20*mm, H - 18*mm, "ÍNDICE")

items = [
    ("01", "La Firma",                    "03"),
    ("02", "Filosofía Visual",            "04"),
    ("03", "Paleta de Colores",           "05"),
    ("04", "Tipografía",                  "06"),
    ("05", "El Emblema",                  "07"),
    ("06", "El Wordmark",                 "08"),
    ("07", "Versiones del Logo",          "09"),
    ("08", "Uso Correcto e Incorrecto",   "10"),
    ("09", "Aplicaciones",               "11"),
]

y = H - 50*mm
for num, title, pg in items:
    set_font(c, 'sans', 7)
    c.setFillColor(ARENA)
    c.drawString(20*mm, y, num)
    set_font(c, 'serif', 13)
    c.setFillColor(CARBON)
    c.drawString(32*mm, y, title)
    set_font(c, 'sans', 9)
    c.setFillColor(PIEDRA)
    c.drawRightString(W - 20*mm, y, pg)
    draw_rule(c, 20*mm, y - 5, W - 40*mm, HexColor("#B45309"), 0.3)
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
c.setFillColor(CARBON)
texto = (
    "Gutleber & Asoc. es una firma inmobiliaria boutique con base en Posadas, Misiones. "
    "Fundada por Cintia Gutleber —corredora matriculada con trayectoria en el rubro— y su socio, "
    "quien aporta visión tecnológica y apertura comercial."
)
# Text wrapping manual
from reportlab.lib.utils import simpleSplit
lines = simpleSplit(texto, 'Times-Roman', 11, W - 40*mm)
for line in lines:
    c.drawString(20*mm, y, line)
    y -= 15
y -= 8

# Tabla LA FIRMA ES / NO ES
col_w = (W - 44*mm) / 2
col1_x = 20*mm
col2_x = col1_x + col_w + 4*mm

for col_x, header, items_list in [
    (col1_x, "LA FIRMA ES", [
        "Boutique · moderna · profesional",
        "Orientada a patrimonio e inversión",
        "Tecnológica con atención humana",
        "Discreta · clara · confiable",
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
    # Header columna
    c.setFillColor(CARBON if header == "LA FIRMA ES" else CREMA)
    c.rect(col_x, y - 6, col_w, 22, fill=1, stroke=0)
    set_font(c, 'sans-bold', 8)
    c.setFillColor(CREMA if header == "LA FIRMA ES" else CARBON)
    c.drawString(col_x + 6, y + 2, header)

    ty = y - 20
    for item in items_list:
        set_font(c, 'serif', 9.5)
        c.setFillColor(CARBON)
        c.drawString(col_x + 10, ty, f"— {item}")
        ty -= 16

y -= 130

# Diferencial
draw_rule(c, 20*mm, y, W - 40*mm, PIEDRA, 0.5)
y -= 20
set_font(c, 'serif-italic', 12)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, y,
    '"El propietario siempre sabe qué pasa con su propiedad."')
y -= 14
set_font(c, 'sans', 8)
c.setFillColor(ARENA)
c.drawCentredString(W / 2, y, "Diferencial central de la firma")

page_footer(c, 3)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 4 — FILOSOFÍA VISUAL
# ══════════════════════════════════════════════════════
c.setFillColor(CARBON)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
# Header en oscuro
set_font(c, 'sans', 7)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "02")
set_font(c, 'serif-bold', 22)
c.setFillColor(CREMA)
c.drawString(20*mm, y - 14, "Filosofía Visual")
draw_rule(c, 20*mm, y - 20, W - 40*mm, PIEDRA, 0.6)
y -= 40

set_font(c, 'serif-bold', 28)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "Arraigo Sereno")
y -= 18
set_font(c, 'serif-italic', 12)
c.setFillColor(PIEDRA)
c.drawString(20*mm, y, "Una filosofía visual para la firma inmobiliaria boutique del presente")
y -= 30

pilares = [
    ("Espacio y Forma",
     "El espacio vacío no es ausencia: es confianza. Las composiciones respiran. "
     "Las formas son geométricas y precisas, pero nunca frías."),
    ("Color y Materia",
     "La paleta proviene del territorio. Sin dorado exagerado, sin azul corporativo, "
     "sin blanco frío. Cuatro colores cerrados, calibrados, definitivos."),
    ("Tipografía y Ritmo",
     "Georgia para los momentos patrimoniales. Inter / Arial para la comunicación digital. "
     "La escala comunica importancia. El peso comunica urgencia."),
    ("Voz Visual",
     "La marca habla como la firma trabaja: discreta, clara, presente. No grita. "
     "No adorna. No improvisa. Proyecta competencia sin alardear."),
]

for title, body in pilares:
    c.setFillColor(PIEDRA)
    c.rect(20*mm, y - 2, 3, 36, fill=1, stroke=0)
    set_font(c, 'serif-bold', 11)
    c.setFillColor(CREMA)
    c.drawString(28*mm, y + 20, title)
    lines = simpleSplit(body, 'Times-Roman', 10, W - 48*mm)
    ly = y + 6
    for line in lines:
        set_font(c, 'serif', 10)
        c.setFillColor(ARENA)
        c.drawString(28*mm, ly, line)
        ly -= 13
    y -= 70

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
    ("#2C2C2A", "Carbón",  "Color principal. Textos, logo, marcos. Reemplaza al negro puro."),
    ("#8C7B6B", "Piedra",  "Color central de marca. Íconos, detalles, emblema."),
    ("#C4B09A", "Arena",   "Color secundario. Subtítulos, señal, acentos."),
    ("#F0E8DC", "Crema",   "Fondos cálidos. Secciones, tarjetas, espacio en blanco."),
]

swatch_w = (W - 40*mm) / 4 - 4
sx = 20*mm
for hex_c, name, desc in colores:
    # Swatch grande
    c.setFillColor(HexColor(hex_c))
    c.roundRect(sx, y - 80, swatch_w, 80, 4, fill=1, stroke=0)
    # Borde si es crema
    if hex_c == "#F0E8DC":
        c.setStrokeColor(ARENA)
        c.setLineWidth(0.5)
        c.roundRect(sx, y - 80, swatch_w, 80, 4, fill=0, stroke=1)
    # Nombre
    set_font(c, 'serif-bold', 12)
    c.setFillColor(CARBON)
    c.drawString(sx, y - 96, name)
    # Hex
    set_font(c, 'sans', 8)
    c.setFillColor(PIEDRA)
    c.drawString(sx, y - 108, hex_c)
    # Desc
    lines = simpleSplit(desc, 'Helvetica', 8, swatch_w)
    dy = y - 120
    for line in lines:
        c.drawString(sx, dy, line)
        dy -= 11
    sx += swatch_w + 5

y -= 160

# Nota
draw_rule(c, 20*mm, y, W - 40*mm, ARENA, 0.4)
y -= 16
set_font(c, 'sans', 8)
c.setFillColor(PIEDRA)
nota = ("El blanco puro (#FFFFFF) puede usarse como fondo neutro cuando sea necesario. "
        "No agregar colores adicionales. La paleta debe mantenerse cerrada.")
for line in simpleSplit(nota, 'Helvetica', 8, W - 40*mm):
    c.drawString(20*mm, y, line)
    y -= 12

# Uso combinado
y -= 20
set_font(c, 'serif-bold', 13)
c.setFillColor(CARBON)
c.drawString(20*mm, y, "Combinaciones principales")
draw_rule(c, 20*mm, y - 6, W - 40*mm, ARENA, 0.3)
y -= 24

combos = [
    (CARBON,  CREMA,  "Carbón sobre Crema",   "Documentos, presentaciones"),
    (CARBON,  BLANCO, "Carbón sobre Blanco",   "Uso digital general"),
    (CREMA,   CARBON, "Crema sobre Carbón",    "Redes sociales, fondo oscuro"),
    (ARENA,   CARBON, "Arena sobre Carbón",    "Descriptores en modo oscuro"),
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
    c.setFillColor(CARBON)
    c.drawString(bx, y - 44, label)
    c.setFillColor(PIEDRA)
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

# GEORGIA
c.setFillColor(CREMA)
c.rect(20*mm, y - 10, W - 40*mm, 10, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(PIEDRA)
c.drawString(21*mm, y - 5, "DISPLAY — MARCA Y TITULARES")

y -= 24
set_font(c, 'serif-bold', 48)
c.setFillColor(CARBON)
c.drawString(20*mm, y, "Georgia")
y -= 16
set_font(c, 'serif-italic', 14)
c.setFillColor(PIEDRA)
c.drawString(20*mm, y, "Patrimonio inmobiliario · Inversión · Gestión · Desarrollo")
y -= 20
set_font(c, 'serif', 10)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "Uso: nombre de la firma, titulares de documentos, descriptor, momentos patrimoniales.")
y -= 24

# Escala tipográfica Georgia
escalas = [(28, "Titular principal"), (20, "Subtítulo de sección"), (14, "Lead / Descriptor"), (11, "Cuerpo de texto")]
for size, label in escalas:
    set_font(c, 'serif', size)
    c.setFillColor(CARBON)
    c.drawString(20*mm, y, f"Gutleber & Asoc.  —  {size}pt")
    set_font(c, 'sans', 7)
    c.setFillColor(ARENA)
    c.drawRightString(W - 20*mm, y, label)
    y -= size * 1.4 + 4

y -= 10
draw_rule(c, 20*mm, y, W - 40*mm, ARENA, 0.4)
y -= 20

# ARIAL / INTER
c.setFillColor(CREMA)
c.rect(20*mm, y - 10, W - 40*mm, 10, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(PIEDRA)
c.drawString(21*mm, y - 5, "CUERPO — DIGITAL Y COMUNICACIÓN")

y -= 24
set_font(c, 'sans-bold', 48)
c.setFillColor(CARBON)
c.drawString(20*mm, y, "Inter / Arial")
y -= 16
set_font(c, 'sans', 12)
c.setFillColor(PIEDRA)
c.drawString(20*mm, y, "Administración mensual. El cobro fue procesado el día 3.")
y -= 14
c.drawString(20*mm, y, "Inquilino: Martín García · Depto. 3B · $185.000/mes")
y -= 20
set_font(c, 'sans', 10)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "Uso: textos corridos, redes sociales, presentaciones, PDF, comunicación digital.")

page_footer(c, 6)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 7 — EL EMBLEMA
# ══════════════════════════════════════════════════════
c.setFillColor(CARBON)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
set_font(c, 'sans', 7)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "05")
set_font(c, 'serif-bold', 22)
c.setFillColor(CREMA)
c.drawString(20*mm, y - 14, "El Emblema")
draw_rule(c, 20*mm, y - 20, W - 40*mm, PIEDRA, 0.6)
y -= 48

# Emblema grande centrado
emb_big = 200
emb_png = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema.svg"), emb_big * 3)
c.drawImage(ImageReader(emb_png),
            (W - emb_big) / 2, y - emb_big,
            width=emb_big, height=emb_big, mask='auto')

y -= emb_big + 20

set_font(c, 'sans', 7)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, y, "Emblema principal — sobre fondo carbón")
y -= 30

# Concepto
set_font(c, 'serif-italic', 11)
c.setFillColor(ARENA)
c.drawCentredString(W / 2, y,
    "Arco arquitectónico + PIN de posición GPS — Real estate primero")
y -= 30

# Descripción elementos
elementos = [
    ("Arco / Portal",  "Forma arquitectónica dentro del pin. Representa acceso, propiedad, refugio."),
    ("PIN GPS",        "Forma contenedora. Ubica la propiedad en el territorio. Identidad local."),
    ("Punto central",  "LED / punto de acceso. Tecnología presente, discreta, funcional."),
]

for title, body in elementos:
    c.setFillColor(PIEDRA)
    c.circle(20*mm + 3, y + 4, 3, fill=1, stroke=0)
    set_font(c, 'serif-bold', 10)
    c.setFillColor(CREMA)
    c.drawString(28*mm, y, title)
    set_font(c, 'serif', 10)
    c.setFillColor(ARENA)
    c.drawString(28*mm, y - 13, body)
    y -= 36

y -= 10
draw_rule(c, 20*mm, y, W - 40*mm, PIEDRA, 0.4)
y -= 18

# Escala
escalas_emb = [80, 48, 32, 20, 14]
ex = 20*mm
for sz in escalas_emb:
    ep = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema.svg"), sz * 3)
    c.drawImage(ImageReader(ep), ex, y - sz,
                width=sz, height=sz, mask='auto')
    set_font(c, 'sans', 6)
    c.setFillColor(PIEDRA)
    c.drawCentredString(ex + sz / 2, y - sz - 10, f"{sz}px")
    ex += sz + 20

set_font(c, 'sans', 7)
c.setFillColor(ARENA)
c.drawString(20*mm, y - max(escalas_emb) - 22, "El emblema opera correctamente desde 14px. Bajo ese tamaño, usar solo en positivo.")

page_footer(c, 7)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 8 — WORDMARK
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 6, "El Wordmark", y)
y -= 20

set_font(c, 'serif-bold', 44)
c.setFillColor(CARBON)
c.drawString(20*mm, y, "GUTLEBER & ASOCIADOS")
y -= 18
set_font(c, 'serif-italic', 14)
c.setFillColor(ARENA)
c.drawString(20*mm, y, "INMOBILIARIA BOUTIQUE")
y -= 30

draw_rule(c, 20*mm, y, W - 40*mm, ARENA, 0.4)
y -= 24

reglas = [
    ("Siempre en mayúsculas",      "GUTLEBER & ASOCIADOS — el nombre principal va siempre en caja alta."),
    ("El & no se elimina",         "Es parte del nombre legal. No se reemplaza por 'y', '/', ni se omite."),
    ("Tracking generoso",          "Letter-spacing amplio. El nombre respira. No condensar."),
    ("Descriptor en minúsculas",   "INMOBILIARIA BOUTIQUE — Georgia, cursiva, color Arena."),
    ("Jerarquía fija",             "Nombre → Descriptor → Ubicación. No alterar el orden."),
]

for title, body in reglas:
    set_font(c, 'serif-bold', 10)
    c.setFillColor(CARBON)
    c.drawString(20*mm, y, title)
    set_font(c, 'serif', 10)
    c.setFillColor(PIEDRA)
    c.drawString(20*mm, y - 13, body)
    draw_rule(c, 20*mm, y - 20, W - 40*mm, HexColor("#E8DDD0"), 0.3)
    y -= 34

page_footer(c, 8)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 9 — VERSIONES DEL LOGO
# ══════════════════════════════════════════════════════
c.setFillColor(BLANCO)
c.rect(0, 0, W, H, fill=1, stroke=0)

y = H - 28*mm
y = section_header(c, 7, "Versiones del Logo", y)
y -= 20

versiones = [
    ("gutleber_logo_horizontal_2x.png", "Logo Horizontal — clara",  BLANCO,  "Documentos, presentaciones, PDF"),
    ("gutleber_logo_oscuro_2x.png",     "Logo Horizontal — oscura", CARBON,  "Redes sociales, stories, fondos oscuros"),
    ("gutleber_logo_vertical_2x.png",   "Logo Vertical",            BLANCO,  "Tarjetas, carteles, señalética"),
    ("gutleber_logo_monocromo_2x.png",  "Logo Monocromo",           BLANCO,  "Bordados, sellos, usos especiales"),
]

vw = (W - 44*mm) / 2
vx_start = 20*mm
row = 0
for i, (fname, label, bg, uso) in enumerate(versiones):
    col = i % 2
    vx = vx_start + col * (vw + 4*mm)
    vy = y - (row * 130)

    # Fondo del preview
    c.setFillColor(bg)
    c.roundRect(vx, vy - 80, vw, 80, 4, fill=1, stroke=0)
    if bg == BLANCO:
        c.setStrokeColor(ARENA)
        c.setLineWidth(0.4)
        c.roundRect(vx, vy - 80, vw, 80, 4, fill=0, stroke=1)

    # Imagen logo
    img_path = os.path.join(LOGO_D, fname)
    if os.path.exists(img_path):
        pil = PILImage.open(img_path)
        pw, ph = pil.size
        scale = min((vw - 20) / pw, 60 / ph)
        rw, rh = pw * scale, ph * scale
        rx = vx + (vw - rw) / 2
        ry = vy - 80 + (80 - rh) / 2
        c.drawImage(img_path, rx, ry, width=rw, height=rh, mask='auto')

    set_font(c, 'serif-bold', 8.5)
    c.setFillColor(CARBON)
    c.drawString(vx, vy - 94, label)
    set_font(c, 'sans', 7.5)
    c.setFillColor(PIEDRA)
    c.drawString(vx, vy - 106, uso)

    if col == 1:
        row += 1

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
    "Usar las versiones provistas. No recrear el logo.",
    "Respetar los colores de marca en todos los usos.",
    "Mantener el espacio mínimo: equivalente a la altura de la 'G' del wordmark.",
    "Sobre fondos oscuros, usar la versión crema/arena.",
    "Sobre fondos claros, usar la versión carbón.",
]
incorrecto = [
    "No deformar, rotar ni inclinar el emblema.",
    "No cambiar los colores. Sin degradados, sin sombras.",
    "No separar el emblema del wordmark en usos principales.",
    "No usar tipografías no autorizadas en combinación con el logo.",
    "No agregar efectos: brillo, relieve, contorno.",
    "No usar el logo sobre fondos fotográficos complejos.",
]

col_w2 = (W - 44*mm) / 2

# Correcto
c.setFillColor(HexColor("#F0F5F0"))
c.roundRect(20*mm, y - len(correcto) * 24 - 30, col_w2, len(correcto) * 24 + 30, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 8)
c.setFillColor(HexColor("#4A7C59"))
c.drawString(22*mm, y - 8, "✓  USO CORRECTO")
cy = y - 26
for item in correcto:
    set_font(c, 'serif', 9)
    c.setFillColor(CARBON)
    lines = simpleSplit(item, 'Times-Roman', 9, col_w2 - 14)
    for line in lines:
        c.drawString(24*mm, cy, line)
        cy -= 13
    cy -= 4

# Incorrecto
ix = 20*mm + col_w2 + 4*mm
c.setFillColor(HexColor("#F5F0F0"))
c.roundRect(ix, y - len(incorrecto) * 22 - 30, col_w2, len(incorrecto) * 22 + 30, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 8)
c.setFillColor(HexColor("#8B3A3A"))
c.drawString(ix + 2*mm, y - 8, "✗  USO INCORRECTO")
iy = y - 26
for item in incorrecto:
    set_font(c, 'serif', 9)
    c.setFillColor(CARBON)
    lines = simpleSplit(item, 'Times-Roman', 9, col_w2 - 14)
    for line in lines:
        c.drawString(ix + 4*mm, iy, line)
        iy -= 13
    iy -= 3

y -= max(len(correcto) * 24, len(incorrecto) * 22) + 50

# Área de protección
draw_rule(c, 20*mm, y, W - 40*mm, ARENA, 0.4)
y -= 18
set_font(c, 'serif-bold', 11)
c.setFillColor(CARBON)
c.drawString(20*mm, y, "Área de protección mínima")
y -= 16
set_font(c, 'serif', 10)
c.setFillColor(PIEDRA)
c.drawString(20*mm, y, "El espacio libre alrededor del logo debe ser como mínimo igual a la altura")
y -= 14
c.drawString(20*mm, y, "de la letra 'G' del wordmark en cualquier escala de uso.")

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

# Mostrar preview del cartel
cartel_path = os.path.join(BASE, "../cartel/cartel_propiedad_preview.png")
if os.path.exists(cartel_path):
    pil = PILImage.open(cartel_path)
    pw, ph = pil.size
    max_h = 200
    max_w = W - 60*mm
    scale = min(max_w / pw, max_h / ph)
    rw, rh = pw * scale, ph * scale
    rx = (W - rw) / 2
    c.drawImage(cartel_path, rx, y - rh, width=rw, height=rh)
    draw_label(c, "Cartel de propiedad — 40 × 50 cm", rx, y - rh - 14, PIEDRA)
    y -= rh + 30

draw_rule(c, 20*mm, y, W - 40*mm, ARENA, 0.4)
y -= 20

# Lista aplicaciones digitales / físicas
dig = ["Avatar Instagram (1:1)", "Portada Instagram (4:5)", "Firma WhatsApp (banner)", "Firma de email", "Google Business Profile"]
fis = ["Tarjeta personal (90 × 55 mm)", "Hoja membretada A4", "Cartel de propiedad", "Presentación PDF propietarios"]

c.setFillColor(CREMA)
c.roundRect(20*mm, y - len(dig)*18 - 20, (W - 44*mm)/2, len(dig)*18 + 20, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(PIEDRA)
c.drawString(22*mm, y - 8, "DIGITALES")
dy = y - 22
for item in dig:
    set_font(c, 'serif', 9)
    c.setFillColor(CARBON)
    c.drawString(24*mm, dy, f"— {item}")
    dy -= 16

ix2 = 20*mm + (W - 44*mm)/2 + 4*mm
c.setFillColor(CREMA)
c.roundRect(ix2, y - len(fis)*18 - 20, (W - 44*mm)/2, len(fis)*18 + 20, 4, fill=1, stroke=0)
set_font(c, 'sans-bold', 7)
c.setFillColor(PIEDRA)
c.drawString(ix2 + 2*mm, y - 8, "IMPRESOS / FÍSICOS")
fy = y - 22
for item in fis:
    set_font(c, 'serif', 9)
    c.setFillColor(CARBON)
    c.drawString(ix2 + 4*mm, fy, f"— {item}")
    fy -= 16

page_footer(c, 11)
c.showPage()

# ══════════════════════════════════════════════════════
# PÁG 12 — CONTRATAPA
# ══════════════════════════════════════════════════════
c.setFillColor(CARBON)
c.rect(0, 0, W, H, fill=1, stroke=0)
c.setFillColor(PIEDRA)
c.rect(W - 8*mm, 0, 8*mm, H, fill=1, stroke=0)

emb_c = load_svg_png(os.path.join(LOGO_D, "gutleber_emblema.svg"), 80 * 3)
c.drawImage(ImageReader(emb_c),
            (W - 80) / 2, H * 0.5, width=80, height=80, mask='auto')

set_font(c, 'serif', 11)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, H * 0.46,
    "Este manual es un documento vivo.")
set_font(c, 'serif-italic', 11)
c.setFillColor(ARENA)
c.drawCentredString(W / 2, H * 0.43,
    "Cada decisión aquí tiene una razón.")

draw_rule(c, 40*mm, H * 0.40, W - 80*mm, PIEDRA, 0.5)

set_font(c, 'sans', 8)
c.setFillColor(PIEDRA)
c.drawCentredString(W / 2, H * 0.36, "gutleber.com.ar  ·  Posadas, Misiones  ·  2026")

c.showPage()

# ── GUARDAR ───────────────────────────────────────────────────────────────────
c.save()
print(f"✓ PDF generado: {OUT}")
