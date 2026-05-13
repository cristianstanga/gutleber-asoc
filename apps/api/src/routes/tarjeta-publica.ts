/**
 * Rutas públicas (sin auth) para preview de tarjetas de propiedades.
 * Útil para probar el diseño en el browser y para compartir en redes.
 *
 * GET /api/public/tarjeta/:id          → JPEG de la tarjeta
 * GET /api/public/tarjeta/:id/preview  → página HTML con preview y reload automático
 */

import { Router } from 'express'
import { prisma } from '../index'
import { generarTarjeta } from '../services/tarjeta'

const router = Router()

// ── JPEG de la tarjeta ────────────────────────────────────────────────────────
router.get('/tarjeta/:id', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (prop.imagenes.length === 0)
    return res.status(400).json({ error: 'La propiedad no tiene imágenes' })

  try {
    const buffer = await generarTarjeta({
      imagenUrl: prop.imagenes[0].url,
      tipo: prop.tipo,
      direccion: prop.direccion,
      superficie: prop.superficie,
      enAlquiler: prop.enAlquiler,
      enVenta: prop.enVenta,
      alquilerBase: prop.alquilerBase,
      valorVenta: prop.valorVenta,
      descripcion: prop.descripcion,
    })
    // Sin cache para que el reload del preview siempre muestre cambios
    res.set('Content-Type', 'image/jpeg')
    res.set('Cache-Control', 'no-store')
    res.send(buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error generando tarjeta'
    res.status(500).json({ error: msg })
  }
})

// ── Preview HTML con auto-reload ──────────────────────────────────────────────
router.get('/tarjeta/:id/preview', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    select: { id: true, direccion: true, tipo: true },
  })
  if (!prop) return res.status(404).send('Propiedad no encontrada')

  const imgUrl = `/api/public/tarjeta/${prop.id}`

  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview Tarjeta — ${prop.direccion}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #1a1a1a;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, sans-serif;
      padding: 24px;
    }
    .toolbar {
      position: fixed;
      top: 0; left: 0; right: 0;
      background: #111;
      border-bottom: 1px solid #333;
      padding: 10px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      z-index: 10;
    }
    .toolbar h1 { color: #C4B09A; font-size: 14px; font-weight: 600; flex: 1; }
    .toolbar span { color: #666; font-size: 12px; }
    .btn {
      background: #C4B09A;
      color: #2C2C2A;
      border: none;
      padding: 6px 14px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
    }
    .btn:hover { background: #d4c0aa; }
    .btn-outline {
      background: transparent;
      color: #C4B09A;
      border: 1px solid #C4B09A;
    }
    .btn-outline:hover { background: rgba(196,176,154,0.1); }
    .card {
      margin-top: 56px;
      max-width: 540px;
      width: 100%;
    }
    .card img {
      width: 100%;
      border-radius: 12px;
      box-shadow: 0 24px 60px rgba(0,0,0,0.6);
      display: block;
    }
    .meta {
      margin-top: 16px;
      color: #666;
      font-size: 12px;
      text-align: center;
    }
    .meta strong { color: #999; }
    #reload-counter { color: #555; }
  </style>
</head>
<body>
  <div class="toolbar">
    <h1>🎨 Preview Tarjeta — ${prop.direccion}</h1>
    <span id="reload-counter">Auto-reload: 10s</span>
    <button class="btn btn-outline" onclick="reloadNow()">↺ Recargar</button>
    <a class="btn" href="${imgUrl}" download="tarjeta-${prop.id}.jpg">⬇ Descargar</a>
  </div>

  <div class="card">
    <img id="tarjeta" src="${imgUrl}?t=${Date.now()}" alt="Tarjeta propiedad" />
    <p class="meta">
      <strong>${prop.tipo}</strong> · ${prop.direccion}<br>
      ID: <code>${prop.id}</code>
    </p>
  </div>

  <script>
    let countdown = 10
    const counter = document.getElementById('reload-counter')
    const img = document.getElementById('tarjeta')

    function reloadNow() {
      img.src = '${imgUrl}?t=' + Date.now()
      countdown = 10
    }

    setInterval(() => {
      countdown--
      counter.textContent = 'Auto-reload: ' + countdown + 's'
      if (countdown <= 0) {
        reloadNow()
      }
    }, 1000)
  </script>
</body>
</html>`)
})

export default router
