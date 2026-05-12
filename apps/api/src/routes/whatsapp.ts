import { Router } from 'express'
import { getStatus, getQR, restartClient } from '../services/whatsapp'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
})

router.get('/qr', (_req, res) => {
  const qr = getQR()
  if (!qr) return res.json({ qr: null, connected: getStatus().connected })
  res.json({ qr, connected: false })
})

router.post('/restart', async (_req, res) => {
  await restartClient()
  res.json({ ok: true })
})

export default router
