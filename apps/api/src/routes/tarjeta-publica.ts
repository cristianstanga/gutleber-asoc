/**
 * Rutas públicas (sin auth) para tarjetas de propiedades.
 *
 * GET /api/public/tarjeta/:id              → JPEG primera imagen (compat.)
 * GET /api/public/tarjeta/:id/imagen/:n    → JPEG imagen N (0-based)
 * GET /api/public/tarjeta/:id/preview      → HTML carrusel con todas las imágenes
 */

import { Router } from 'express'
import { prisma } from '../index'
import { generarTarjeta, DatosTarjeta } from '../services/tarjeta'

const router = Router()

// ── Helper: datos comunes de la propiedad ─────────────────────────────────────

async function getPropConImagenes(id: string) {
  return prisma.propiedad.findUnique({
    where: { id },
    include: { imagenes: { orderBy: { orden: 'asc' } } },
  })
}

function datosTarjeta(prop: any, imagenUrl: string): DatosTarjeta {
  return {
    imagenUrl,
    tipo:         prop.tipo,
    direccion:    prop.direccion,
    superficie:   prop.superficie,
    enAlquiler:   prop.enAlquiler,
    enVenta:      prop.enVenta,
    alquilerBase: prop.alquilerBase,
    valorVenta:   prop.valorVenta,
    descripcion:  prop.descripcion,
    habitaciones: prop.dormitorios ?? null,
    banos:        prop.banos ?? null,
  }
}

// ── JPEG imagen N (0-based) ───────────────────────────────────────────────────

router.get('/tarjeta/:id/imagen/:n', async (req, res) => {
  const n    = parseInt(req.params.n, 10)
  const prop = await getPropConImagenes(req.params.id)
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (!prop.imagenes.length) return res.status(400).json({ error: 'Sin imágenes' })

  const idx = Math.min(Math.max(n, 0), prop.imagenes.length - 1)
  try {
    const buffer = await generarTarjeta(datosTarjeta(prop, prop.imagenes[idx].url))
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' })
  }
})

// ── JPEG primera imagen (compatibilidad con código existente) ─────────────────

router.get('/tarjeta/:id', async (req, res) => {
  const prop = await getPropConImagenes(req.params.id)
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (!prop.imagenes.length) return res.status(400).json({ error: 'Sin imágenes' })

  try {
    const buffer = await generarTarjeta(datosTarjeta(prop, prop.imagenes[0].url))
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error' })
  }
})

// ── Página pública de propiedad para compartir con leads ─────────────────────

router.get('/propiedad/:id', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: {
      imagenes: { orderBy: { orden: 'asc' } },
      videos:   { orderBy: { orden: 'asc' } },
    },
  })
  if (!prop) return res.status(404).send('Propiedad no encontrada')

  const waNum = process.env.WABA_DISPLAY_NUMBER || process.env.CATALOGO_WA_NUMERO || ''
  const waText = encodeURIComponent(`Hola! Vi la propiedad en ${prop.direccion} y quiero más información.`)
  const waLink = waNum ? `https://wa.me/${waNum}?text=${waText}` : `https://wa.me/?text=${waText}`

  const tipoLabel: Record<string, string> = {
    CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local',
    TERRENO: 'Terreno', OFICINA: 'Oficina',
  }
  const formatPeso = (n: number) =>
    n.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 })

  // Mezcla fotos + videos ordenados
  type MediaItem = { type: 'img'; url: string } | { type: 'vid'; url: string; titulo?: string }
  const media: MediaItem[] = [
    ...prop.imagenes.map(i => ({ type: 'img' as const, url: i.url })),
    ...prop.videos.map(v => ({ type: 'vid' as const, url: v.url, titulo: v.titulo ?? undefined })),
  ]

  const slides = media.map((m, i) => `
    <div class="slide" id="s${i}">
      ${m.type === 'img'
        ? `<img src="${m.url}" alt="Foto ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}" />`
        : `<video src="${m.url}" controls playsinline preload="metadata" style="width:100%;height:100%;object-fit:cover;display:block;"></video>`
      }
      ${m.type === 'vid' && m.titulo ? `<div class="vid-title">${m.titulo}</div>` : ''}
    </div>`).join('')

  const dots = media.map((m, i) =>
    `<button class="dot" id="dot${i}" onclick="goTo(${i})" aria-label="${i + 1}">${m.type === 'vid' ? '▶' : ''}</button>`
  ).join('')

  const ogImage = prop.imagenes[0]?.url ?? ''

  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta property="og:title" content="${tipoLabel[prop.tipo] || prop.tipo} en ${prop.direccion}">
  <meta property="og:description" content="${prop.descripcion ? prop.descripcion.slice(0, 160) : 'Propiedad en Posadas, Misiones — Gutleber & Asociados'}">
  ${ogImage ? `<meta property="og:image" content="${ogImage}">` : ''}
  <meta property="og:type" content="website">
  <title>${prop.direccion} — Gutleber & Asociados</title>
  <style>
    *,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#F7F7F5;color:#0D3B4E;-webkit-tap-highlight-color:transparent;padding-bottom:calc(88px + env(safe-area-inset-bottom))}

    /* ── Galería ── */
    .gallery{position:relative;background:#091E2E;width:100%;aspect-ratio:1;overflow:hidden;max-height:92vw}
    .slides{display:flex;height:100%;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;-webkit-overflow-scrolling:touch;scrollbar-width:none}
    .slides::-webkit-scrollbar{display:none}
    .slide{flex:0 0 100%;scroll-snap-align:start;height:100%;position:relative}
    .slide img{width:100%;height:100%;object-fit:cover;display:block}
    .vid-title{position:absolute;bottom:0;left:0;right:0;padding:8px 12px;font-size:12px;color:#fff;background:linear-gradient(transparent,rgba(13,59,78,.7))}
    .counter{position:absolute;top:12px;right:12px;background:rgba(9,30,46,.75);color:#fff;font-size:11px;font-weight:700;padding:3px 10px;border-radius:20px;pointer-events:none}
    .dots-wrap{display:flex;justify-content:center;align-items:center;gap:5px;padding:8px 0;background:#091E2E}
    .dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.25);border:none;cursor:pointer;padding:0;transition:.2s;font-size:7px;line-height:7px;color:rgba(255,255,255,.4)}
    .dot.active{background:#7FA1BB;width:20px;border-radius:4px}

    /* ── Encabezado marca ── */
    .brand-bar{display:flex;align-items:center;justify-content:center;gap:10px;padding:16px 16px 0}
    .brand-name{font-family:Georgia,serif;font-size:13px;font-weight:700;color:#0D3B4E;letter-spacing:.04em}
    .brand-sep{color:#7FA1BB;font-size:10px}
    .brand-desc{font-size:10px;color:#7FA1BB;letter-spacing:.1em;text-transform:uppercase}

    /* ── Info ── */
    .info{padding:12px 16px 0}
    .tipo-tag{font-size:10px;color:#7FA1BB;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:4px}
    .dir{font-size:22px;font-weight:800;font-family:Georgia,serif;color:#0D3B4E;line-height:1.2;margin-bottom:4px}
    .barrio{font-size:13px;color:#7FA1BB;margin-bottom:12px}
    .precio-row{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px}
    .precio-chip{padding:9px 18px;border-radius:12px;font-size:16px;font-weight:700;line-height:1.2}
    .chip-alq{background:#0D3B4E;color:#fff}
    .chip-alq .sub{font-weight:400;font-size:11px;color:#7FA1BB}
    .chip-vta{background:#E7EBEE;color:#0D3B4E;border:1px solid #7FA1BB}
    .attrs{display:flex;flex-wrap:wrap;gap:6px}
    .attr{background:#E7EBEE;border:1px solid #c8d6df;font-size:12px;color:#0D3B4E;padding:5px 12px;border-radius:20px;font-weight:500}

    /* ── Descripción ── */
    .section{margin:16px 16px 0}
    .section-title{font-size:10px;color:#7FA1BB;text-transform:uppercase;letter-spacing:.1em;font-weight:700;margin-bottom:6px}
    .desc-box{background:#fff;border:1px solid #E7EBEE;border-radius:12px;padding:14px;font-size:14px;color:#0D3B4E;line-height:1.7}

    /* ── Footer ── */
    .footer{padding:20px 16px 6px;text-align:center;font-size:11px;color:#7FA1BB;letter-spacing:.04em}
    .footer strong{color:#0D3B4E}

    /* ── CTA fijo ── */
    .cta-bar{position:fixed;bottom:0;left:0;right:0;padding:10px 16px;padding-bottom:calc(10px + env(safe-area-inset-bottom));background:rgba(247,247,245,.96);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);border-top:1px solid #E7EBEE}
    .btn-wa{display:flex;align-items:center;justify-content:center;gap:10px;background:#25D366;color:#fff;font-size:16px;font-weight:700;padding:15px 16px;border-radius:14px;text-decoration:none;border:none;width:100%;cursor:pointer;-webkit-tap-highlight-color:transparent}
    .btn-wa svg{width:22px;height:22px;fill:#fff;flex-shrink:0}
  </style>
</head>
<body>

  <!-- Galería fotos + videos -->
  <div class="gallery">
    <div class="slides" id="slides" onscroll="onScroll()">
      ${media.length > 0 ? slides : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#7FA1BB;font-size:13px">Sin fotos</div>'}
    </div>
    ${media.length > 1 ? `<div class="counter" id="counter">1 / ${media.length}</div>` : ''}
  </div>
  ${media.length > 1 ? `<div class="dots-wrap">${dots}</div>` : ''}

  <!-- Marca -->
  <div class="brand-bar">
    <span class="brand-name">GUTLEBER &amp; ASOCIADOS</span>
    <span class="brand-sep">·</span>
    <span class="brand-desc">Negocios Inmobiliarios</span>
  </div>

  <div class="info">
    <div class="tipo-tag">${tipoLabel[prop.tipo] || prop.tipo}</div>
    <div class="dir">${prop.direccion}</div>
    ${prop.barrio ? `<div class="barrio">📍 ${prop.barrio}</div>` : ''}
    <div class="precio-row">
      ${prop.enAlquiler && prop.alquilerBase ? `<div class="precio-chip chip-alq">${formatPeso(prop.alquilerBase)}<span class="sub"> /mes</span></div>` : ''}
      ${prop.enVenta && prop.valorVenta ? `<div class="precio-chip chip-vta">USD ${prop.valorVenta.toLocaleString('es-AR')}</div>` : ''}
    </div>
    <div class="attrs">
      ${prop.superficie  ? `<div class="attr">📐 ${prop.superficie} m²</div>` : ''}
      ${prop.dormitorios ? `<div class="attr">🛏 ${prop.dormitorios} dorm.</div>` : ''}
      ${prop.banos       ? `<div class="attr">🚿 ${prop.banos} baño${prop.banos > 1 ? 's' : ''}</div>` : ''}
      ${prop.cochera     ? `<div class="attr">🚗 Cochera</div>` : ''}
      ${prop.piso        ? `<div class="attr">Piso ${prop.piso}</div>` : ''}
      ${prop.antiguedad  ? `<div class="attr">${prop.antiguedad} años</div>` : ''}
    </div>
  </div>

  ${prop.descripcion ? `
  <div class="section">
    <div class="section-title">Descripción</div>
    <div class="desc-box">${prop.descripcion}</div>
  </div>` : ''}

  <div class="footer"><strong>Gutleber &amp; Asociados</strong> — Posadas, Misiones</div>

  <!-- CTA siempre visible -->
  <div class="cta-bar">
    <a href="${waLink}" class="btn-wa">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      Consultar por WhatsApp
    </a>
  </div>

  <script>
    var cur = 0, total = ${media.length};
    function goTo(i) {
      var s = document.getElementById('slides');
      if (s) s.scrollTo({ left: s.offsetWidth * i, behavior: 'smooth' });
    }
    function setActive(i) {
      document.querySelectorAll('.dot').forEach(function(d,j){ d.classList.toggle('active', j===i) });
      var c = document.getElementById('counter');
      if (c) c.textContent = (i+1) + ' / ' + total;
      cur = i;
    }
    function onScroll() {
      var s = document.getElementById('slides');
      if (!s) return;
      var i = Math.round(s.scrollLeft / s.offsetWidth);
      if (i !== cur) setActive(i);
    }
    setActive(0);
  </script>
</body>
</html>`)
})

// ── Preview HTML — carrusel de todas las imágenes ─────────────────────────────

router.get('/tarjeta/:id/preview', async (req, res) => {
  const prop = await getPropConImagenes(req.params.id)
  if (!prop) return res.status(404).send('Propiedad no encontrada')
  if (!prop.imagenes.length) return res.status(400).send('La propiedad no tiene imágenes')

  const total   = prop.imagenes.length
  const baseUrl = `/api/public/tarjeta/${prop.id}`

  // Genera los <img> del carrusel
  const slides = prop.imagenes.map((_, i) => `
    <div class="slide" id="slide-${i}">
      <img
        src="${baseUrl}/imagen/${i}?t=${Date.now()}"
        alt="Tarjeta ${i + 1}"
        loading="${i === 0 ? 'eager' : 'lazy'}"
      />
      <div class="slide-footer">
        <span class="slide-num">${i + 1} / ${total}</span>
        <a class="btn-dl" href="${baseUrl}/imagen/${i}" download="tarjeta-${prop.id}-${i + 1}.jpg">
          ⬇ Descargar
        </a>
      </div>
    </div>`).join('')

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Tarjetas — ${prop.direccion}</title>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #111;
      min-height: 100vh;
      font-family: -apple-system, sans-serif;
      color: #fff;
    }

    /* ── Toolbar ── */
    .toolbar {
      position: fixed; top: 0; left: 0; right: 0; z-index: 20;
      background: #0d0d0d;
      border-bottom: 1px solid #222;
      padding: 10px 20px;
      display: flex; align-items: center; gap: 12px;
    }
    .toolbar h1 { color: #C4B09A; font-size: 13px; font-weight: 600; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .toolbar-right { display: flex; gap: 8px; align-items: center; flex-shrink: 0; }
    .badge-total { background: #2a2a2a; color: #8C7B6B; font-size: 11px; padding: 3px 10px; border-radius: 99px; }

    /* ── Carrusel ── */
    .carousel-wrap {
      padding-top: 52px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 32px;
      padding-bottom: 48px;
    }

    .slide {
      width: min(540px, 96vw);
    }
    .slide img {
      width: 100%;
      aspect-ratio: 1;
      border-radius: 14px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.7);
      display: block;
      background: #1a1a1a;
    }
    .slide-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 10px;
      padding: 0 4px;
    }
    .slide-num { color: #555; font-size: 12px; }

    .btn-dl {
      background: #C4B09A;
      color: #2C2C2A;
      border: none;
      padding: 6px 14px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      text-decoration: none;
      display: inline-block;
    }
    .btn-dl:hover { background: #d4c0aa; }

    .btn-reload {
      background: transparent;
      color: #C4B09A;
      border: 1px solid #333;
      padding: 5px 12px;
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
    }
    .btn-reload:hover { border-color: #C4B09A; }

    .info { color: #555; font-size: 11px; text-align: center; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>📸 ${prop.tipo} · ${prop.direccion}</h1>
    <div class="toolbar-right">
      <span class="badge-total">${total} imagen${total !== 1 ? 'es' : ''}</span>
      <button class="btn-reload" onclick="reloadAll()">↺ Recargar</button>
    </div>
  </div>

  <div class="carousel-wrap">
    ${slides}
    <p class="info">1080 × 1080 px · listo para WhatsApp e Instagram</p>
  </div>

  <script>
    function reloadAll() {
      document.querySelectorAll('.slide img').forEach((img, i) => {
        img.src = '${baseUrl}/imagen/' + i + '?t=' + Date.now()
      })
    }
  </script>
</body>
</html>`)
})

export default router
