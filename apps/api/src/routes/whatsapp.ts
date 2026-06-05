import { Router } from 'express'
import { getStatus, getQRImage, restartClient, clearSession } from '../services/whatsapp'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
})

router.get('/qr', async (_req, res) => {
  const connected = getStatus().connected
  if (connected) return res.json({ qrImage: null, connected: true })
  const qrImage = await getQRImage()
  res.json({ qrImage, connected: false })
})

router.post('/restart', async (_req, res) => {
  await restartClient()
  res.json({ ok: true })
})

router.post('/clear-session', async (_req, res) => {
  await clearSession()
  res.json({ ok: true })
})

export default router
