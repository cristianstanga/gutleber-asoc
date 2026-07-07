"""
Cartel de propiedad v2 — Gutleber & Asociados
Foto a pantalla completa, SIN marquesina superior.
Panel de datos flotante alineado al costado (derecha) de la foto.
Formato: 40cm x 50cm a 150dpi = 2362 x 2953 px
"""

import os, io
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import qrcode
import cairosvg

PETROLEO  = (13, 59, 78)
CHAMPAGNE = (127, 161, 187)
CREMA     = (247, 247, 245)
CARBON    = (231, 235, 238)

WHATSAPP_NUMBER  = "+54 9 3765 41-0765"
WHATSAPP_WA_ME   = "5493765410765"
INSTAGRAM_HANDLE = "@gutleberasociados"

W, H = 2362, 2953

BASE_SERIF = "/usr/share/fonts/truetype/liberation2/"
BASE_SANS  = "/usr/share/fonts/truetype/dejavu/"
def font(base, name, size):
    try:    return ImageFont.truetype(base + name, size)
    except: return ImageFont.load_default()

F_SERIF_B = lambda s: font(BASE_SERIF, "LiberationSerif-Bold.ttf", s)
F_SERIF   = lambda s: font(BASE_SERIF, "LiberationSerif-Regular.ttf", s)
F_SERIF_I = lambda s: font(BASE_SERIF, "LiberationSerif-Italic.ttf", s)
F_SANS    = lambda s: font(BASE_SANS, "DejaVuSans.ttf", s)
F_SANS_B  = lambda s: font(BASE_SANS, "DejaVuSans-Bold.ttf", s)

GPIN = os.path.join(os.path.dirname(__file__), "../logo/")
EMBLEM_OSCURO = GPIN + "gutleber_emblema_oscuro.svg"


def placeholder_photo(w, h):
    """Foto ilustrativa de referencia (no real) — fachada estilizada al atardecer,
    a reemplazar por la foto real de cada propiedad."""
    img = Image.new("RGB", (w, h), (60, 70, 78))
    draw = ImageDraw.Draw(img)
    sky_h = int(h * 0.62)
    for y in range(sky_h):
        t = y / sky_h
        r = int(150 - t*90); g = int(120 - t*60); b = int(120 - t*40)
        draw.line([(0,y),(w,y)], fill=(max(r,40), max(g,50), max(b,60)))
    draw.rectangle([0, sky_h, w, h], fill=(40, 42, 40))
    for y in range(sky_h, h):
        t = (y - sky_h) / (h - sky_h)
        r = int(40 + t*10); g = int(42+t*8); b = int(40+t*8)
        draw.line([(0,y),(w,y)], fill=(r,g,b))
    fx0, fx1 = int(w*0.10), int(w*0.62)
    fy0, fy1 = int(h*0.34), sky_h + int(h*0.05)
    draw.rectangle([fx0, fy0, fx1, fy1], fill=(30, 32, 33))
    draw.polygon([(fx0-30, fy0), (fx1+30, fy0), (fx1-40, fy0-90), (fx0+40, fy0-90)], fill=(24,26,26))
    win_w, win_h = int((fx1-fx0)*0.14), int((fy1-fy0)*0.22)
    for i in range(3):
        wx = fx0 + int((fx1-fx0)*0.15) + i*int((fx1-fx0)*0.28)
        wy = fy0 + int((fy1-fy0)*0.30)
        draw.rectangle([wx, wy, wx+win_w, wy+win_h], fill=CHAMPAGNE)
    for i in range(6):
        tx = int(w*0.68) + i*70
        ty = sky_h - 10
        draw.ellipse([tx-35, ty-140, tx+35, ty-30], fill=(20,45,32))
        draw.rectangle([tx-6, ty-40, tx+6, ty+20], fill=(35,28,20))

    blur = img.filter(ImageFilter.GaussianBlur(1))
    img = Image.blend(img, blur, 0.3)

    dwm = ImageDraw.Draw(img, "RGBA")
    dwm.text((w//2, int(h*0.94)), "— fotografía de referencia · reemplazar por foto real —",
              font=F_SANS(30), fill=(255,255,255,130), anchor="mm")
    return img


def wrap_text(text, fnt, max_w, draw):
    words = text.split()
    lines, cur = [], ""
    for w in words:
        trial = (cur + " " + w).strip()
        if draw.textbbox((0,0), trial, font=fnt)[2] <= max_w:
            cur = trial
        else:
            if cur: lines.append(cur)
            cur = w
    if cur: lines.append(cur)
    return lines


def build_panel_content(panel_w, data, pad=70):
    """Dibuja el contenido del panel sobre un lienzo alto de sobra,
    devuelve la imagen recortada a la altura realmente usada."""
    tall_h = 2200
    panel = Image.new("RGBA", (panel_w, tall_h), (*PETROLEO, 246))
    draw = ImageDraw.Draw(panel, "RGBA")
    inner_w = panel_w - pad*2
    x = pad
    y = 60

    # emblema + wordmark
    emblem_size = 96
    emblem_png = cairosvg.svg2png(url=EMBLEM_OSCURO, output_width=emblem_size*2, output_height=int(emblem_size*1.2*2))
    emblem_img = Image.open(io.BytesIO(emblem_png)).convert("RGBA")
    emblem_img = emblem_img.resize((emblem_size, int(emblem_size*1.2)))
    panel.paste(emblem_img, (x, y), emblem_img)
    tx = x + emblem_img.width + 26
    draw.text((tx, y-6), "GUTLEBER", font=F_SERIF_B(52), fill=CREMA)
    bbox = draw.textbbox((tx, y-6), "GUTLEBER", font=F_SERIF_B(52))
    draw.text((tx, bbox[3]+4), "& Asociados", font=F_SERIF_I(30), fill=CHAMPAGNE)
    draw.text((tx, bbox[3]+42), "NEGOCIOS INMOBILIARIOS", font=F_SANS(14), fill=(*CREMA,190))
    y = max(y + emblem_img.height, bbox[3]+42) + 56

    # badge
    bw, bh = 300, 62
    draw.rounded_rectangle([x, y, x+bw, y+bh], radius=31, fill=CHAMPAGNE)
    draw.text((x+bw//2, y+bh//2), data["tipo"], font=F_SANS_B(28), fill=PETROLEO, anchor="mm")
    y += bh + 46

    draw.line([x, y, x+inner_w, y], fill=(*CHAMPAGNE, 140), width=1)
    y += 40

    for line in wrap_text(data["direccion"], F_SERIF_B(58), inner_w, draw):
        draw.text((x, y), line, font=F_SERIF_B(58), fill=CREMA)
        y += 64
    y += 6
    draw.text((x, y), data["barrio"], font=F_SERIF_I(30), fill=(*CHAMPAGNE,220))
    y += 56

    draw.line([x, y, x+inner_w, y], fill=(*CHAMPAGNE, 90), width=1)
    y += 40

    draw.text((x, y), data["precio"], font=F_SERIF_B(66), fill=CHAMPAGNE)
    y += 84

    draw.text((x, y), f"{data['sup']}  ·  {data['dorm']}  ·  {data['banios']}", font=F_SANS(30), fill=CREMA)
    y += 42
    draw.text((x, y), data["extras"], font=F_SANS(24), fill=(*CREMA,170))
    y += 56

    draw.line([x, y, x+inner_w, y], fill=(*CHAMPAGNE, 90), width=1)
    y += 44

    draw.text((x, y), "WhatsApp", font=F_SANS_B(22), fill=(*CHAMPAGNE,220))
    y += 34
    draw.text((x, y), WHATSAPP_NUMBER, font=F_SERIF_B(36), fill=CREMA)
    y += 56
    draw.text((x, y), "Instagram", font=F_SANS_B(22), fill=(*CHAMPAGNE,220))
    y += 34
    draw.text((x, y), INSTAGRAM_HANDLE, font=F_SERIF_B(36), fill=CREMA)
    y += 60

    qr_size = 240
    qr = qrcode.QRCode(version=3, box_size=8, border=1, error_correction=qrcode.constants.ERROR_CORRECT_M)
    mensaje = f"Hola, quiero mas informacion sobre {data['direccion']}"
    qr.add_data(f"https://wa.me/{WHATSAPP_WA_ME}?text={mensaje}")
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_img = qr_img.resize((qr_size, qr_size), Image.LANCZOS)
    qr_bg_pad = 16
    draw.rounded_rectangle([x, y, x+qr_size+qr_bg_pad*2, y+qr_size+qr_bg_pad*2], radius=14, fill=CREMA)
    panel.paste(qr_img, (x+qr_bg_pad, y+qr_bg_pad))
    draw.text((x+qr_size+qr_bg_pad*2+22, y+qr_size//2 - 20), "Escaneá y", font=F_SANS(24), fill=CREMA)
    draw.text((x+qr_size+qr_bg_pad*2+22, y+qr_size//2 + 10), "escribinos", font=F_SANS(24), fill=CREMA)
    y += qr_size + qr_bg_pad*2 + 50

    draw.line([x, y, x+inner_w, y], fill=(*CHAMPAGNE, 90), width=1)
    y += 30
    draw.text((x, y), "Corredores Inmobiliarios Matriculados", font=F_SANS(18), fill=(*CREMA,160))
    y += 26
    draw.text((x, y), "Posadas, Misiones", font=F_SANS(18), fill=(*CREMA,160))
    y += 50

    return panel.crop((0, 0, panel_w, y))


def rounded_mask(w, h, radius):
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle([0, 0, w-1, h-1], radius=radius, fill=255)
    return mask


def generar_cartel_v2(data, out_name, photo_path=None):
    canvas = Image.new("RGB", (W, H), CREMA)

    # ── FOTO A PANTALLA COMPLETA (sin marquesina) ─────────────────────────────
    if photo_path and os.path.exists(photo_path):
        photo = Image.open(photo_path).convert("RGB")
        scale = max(W/photo.width, H/photo.height)
        photo = photo.resize((int(photo.width*scale), int(photo.height*scale)), Image.LANCZOS)
        cx = (photo.width - W)//2
        cy = (photo.height - H)//2
        photo = photo.crop((cx, cy, cx+W, cy+H))
    else:
        photo = placeholder_photo(W, H)
    canvas.paste(photo, (0, 0))

    # viñeta para que el panel flotante resalte sobre la foto
    vign = Image.new("L", (W, H), 0)
    vd = ImageDraw.Draw(vign)
    vd.rectangle([int(W*0.52), 0, W, H], fill=110)
    vign = vign.filter(ImageFilter.GaussianBlur(160))
    dark = Image.new("RGB", (W, H), (0,0,0))
    canvas = Image.composite(dark, canvas, vign.point(lambda p: int(p*0.55)))

    # ── PANEL FLOTANTE, ALINEADO AL COSTADO DERECHO DE LA FOTO ────────────────
    margin = 110
    panel_w = int(W * 0.40)
    radius = 36

    panel_rgba = build_panel_content(panel_w, data)
    panel_h = panel_rgba.height
    mask = rounded_mask(panel_w, panel_h, radius)
    panel_rgba.putalpha(Image.composite(panel_rgba.split()[3], Image.new("L", (panel_w, panel_h), 0), mask))

    panel_x0 = W - margin - panel_w
    avail_h = H - margin*2
    panel_y0 = margin + max(0, (avail_h - panel_h)//2)

    # sombra
    canvas_rgba = canvas.convert("RGBA")
    shadow = Image.new("RGBA", (W, H), (0,0,0,0))
    sd = ImageDraw.Draw(shadow)
    sd.rounded_rectangle([panel_x0+16, panel_y0+24, panel_x0+panel_w+16, panel_y0+panel_h+24],
                          radius=radius, fill=(0,0,0,130))
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))
    canvas_rgba = Image.alpha_composite(canvas_rgba, shadow)
    canvas_rgba.paste(panel_rgba, (panel_x0, panel_y0), panel_rgba)

    draw = ImageDraw.Draw(canvas_rgba, "RGBA")
    draw.rounded_rectangle([panel_x0, panel_y0, panel_x0+panel_w, panel_y0+panel_h],
                            radius=radius, outline=(*CHAMPAGNE, 210), width=2)

    canvas = canvas_rgba.convert("RGB")

    out = os.path.join(os.path.dirname(__file__), out_name)
    canvas.save(out, "PNG", dpi=(150,150))
    print(f"✓ {out}  panel_h={panel_h}")


DATA_VENTA = {
    "tipo": "EN VENTA",
    "direccion": "RIVADAVIA 1450",
    "barrio": "Centro · Posadas",
    "precio": "USD 95.000",
    "sup": "120 m²", "dorm": "3 dorm.", "banios": "2 baños",
    "extras": "Cochera · Balcón",
}

DATA_ALQUILER = {
    "tipo": "EN ALQUILER",
    "direccion": "SAN LORENZO 780",
    "barrio": "Villa Sarita · Posadas",
    "precio": "$ 380.000 /mes",
    "sup": "85 m²", "dorm": "2 dorm.", "banios": "1 baño",
    "extras": "Patio · Sin expensas",
}

if __name__ == "__main__":
    generar_cartel_v2(DATA_VENTA, "cartel_venta_preview.png")
    generar_cartel_v2(DATA_ALQUILER, "cartel_alquiler_preview.png")
