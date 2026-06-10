import { Router } from 'express'
import { getStatus, sendHelloWorld } from '../services/whatsapp-meta'
import { logger } from '../index'

const router = Router()

router.get('/status', (_req, res) => {
  res.json(getStatus())
})

// Lista los templates registrados en Meta con sus idiomas
router.get('/templates', async (_req, res) => {
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!wabaId || !token) return res.status(500).json({ error: 'Variables WA no configuradas' })
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates?fields=name,language,status&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await r.json()
    res.json(data)
  } catch (err) {
    res.status(500).json({ error: String(err) })
  }
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
