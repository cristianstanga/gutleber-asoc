import { Router } from 'express'
import { getStatus, getQRImage, restartClient, clearSession, getDebugInfo, checkNumber } from '../services/whatsapp'
import { sendHelloWorld } from '../services/whatsapp-meta'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
})

router.get('/debug', (_req, res) => {
  res.json(getDebugInfo())
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

router.get('/check/:phone', async (req, res) => {
  const result = await checkNumber(req.params.phone)
  res.json(result)
})

// Test de conectividad Meta — envía hello_world template al número dado
router.get('/meta-test/:phone', async (req, res) => {
  try {
    const result = await sendHelloWorld(req.params.phone)
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
})

export default router
