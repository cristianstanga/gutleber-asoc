import { Router } from 'express'
import {
  propiedadesDisponibles, enviarCatalogoWA, enviarPropiedadWA,
  enviarFotosPropiedad, enviarVideosPropiedad,
} from '../services/catalogo-wa'

const router = Router()

// GET /api/catalogo/disponibles
router.get('/disponibles', async (_req, res) => {
  const props = await propiedadesDisponibles()
  res.json(props)
})

// POST /api/catalogo/wa/sincronizar  body: { destino? }
router.post('/wa/sincronizar', async (req, res) => {
  const { destino } = req.body
  try {
    const enviadas = await enviarCatalogoWA(destino)
    res.json({ ok: true, enviadas })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error al sincronizar'
    res.status(500).json({ error: msg })
  }
})

// POST /api/catalogo/wa/propiedad/:id  body: { destino }
router.post('/wa/propiedad/:id', async (req, res) => {
  const { destino } = req.body
  if (!destino) return res.status(400).json({ error: 'Falta el número destino' })
  try {
    await enviarPropiedadWA(req.params.id, destino)
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(500).json({ error: msg })
  }
})

// POST /api/catalogo/wa/propiedad/:id/fotos  body: { destino }
router.post('/wa/propiedad/:id/fotos', async (req, res) => {
  const { destino } = req.body
  if (!destino) return res.status(400).json({ error: 'Falta el número destino' })
  try {
    const enviadas = await enviarFotosPropiedad(req.params.id, destino)
    res.json({ ok: true, enviadas })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(500).json({ error: msg })
  }
})

// POST /api/catalogo/wa/propiedad/:id/videos  body: { destino }
router.post('/wa/propiedad/:id/videos', async (req, res) => {
  const { destino } = req.body
  if (!destino) return res.status(400).json({ error: 'Falta el número destino' })
  try {
    const enviados = await enviarVideosPropiedad(req.params.id, destino)
    res.json({ ok: true, enviados })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(500).json({ error: msg })
  }
})

export default router
