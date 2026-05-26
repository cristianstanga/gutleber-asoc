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
