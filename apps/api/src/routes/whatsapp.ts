import { Router } from 'express'
import { getStatus } from '../services/whatsapp-meta'
import { sendHelloWorld } from '../services/whatsapp-meta'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
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
