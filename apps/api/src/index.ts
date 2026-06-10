import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import path from 'path'
import { PrismaClient } from '@prisma/client'
import pino from 'pino'

import authRouter from './routes/auth'
import dashboardRouter from './routes/dashboard'
import propiedadesRouter from './routes/propiedades'
import tarjetaPublicaRouter from './routes/tarjeta-publica'
import personasRouter from './routes/personas'
import vinculosRouter from './routes/vinculos'
import pagosRouter from './routes/pagos'
import inboxRouter from './routes/inbox'
import whatsappRouter from './routes/whatsapp'
import indicesRouter from './routes/indices'
import conversacionesRouter from './routes/conversaciones'
import gastosRouter from './routes/gastos'
import iaRouter from './routes/ia'
import catalogoRouter from './routes/catalogo'
import usuariosRouter from './routes/usuarios'
import webhookWhatsappRouter from './routes/webhook-whatsapp'
import { initCron } from './services/cron'
import { sendHelloWorld, getStatus as getWAStatus } from './services/whatsapp-meta'
import { authMiddleware, requireAdmin, requireAdminOrOperador } from './middleware/auth'

export const prisma = new PrismaClient()
export const logger = pino({ transport: { target: 'pino-pretty' } })

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }))
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Health check (sin auth)
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// Auth (sin middleware)
app.use('/api/auth', authRouter)

// Tarjeta pública (sin auth — para preview y compartir)
app.use('/api/public', tarjetaPublicaRouter)

// WhatsApp — sin auth para diagnóstico
app.get('/api/whatsapp/debug', (_req, res) => res.json(getWAStatus()))
app.get('/api/whatsapp/meta-test/:phone', async (req, res) => {
  try { res.json({ ok: true, result: await sendHelloWorld(req.params.phone) }) }
  catch (err) { res.status(500).json({ error: String(err) }) }
})
// Test template — GET /api/whatsapp/test-template/:phone/:name/:lang
app.get('/api/whatsapp/test-template/:phone/:name/:lang', async (req, res) => {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) return res.status(500).json({ error: 'Variables WA no configuradas' })
  const { phone, name, lang } = req.params
  const body = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'template',
    template: {
      name,
      language: { code: lang },
      components: [{ type: 'body', parameters: [{ type: 'text', text: 'TEST' }, { type: 'text', text: 'TEST2' }, { type: 'text', text: 'TEST3' }, { type: 'text', text: 'TEST4' }] }],
    },
  }
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await r.json()
    res.json({ ok: r.ok, status: r.status, requestBody: body, response: data })
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Crea los templates en el WABA correcto (one-time setup)
app.post('/api/whatsapp/crear-templates', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = '1748009346185242'
  if (!token) return res.status(500).json({ error: 'Token no configurado' })

  const templates = [
    {
      name: 'gutleber_pago_cobrado',
      language: 'es_AR',
      category: 'UTILITY',
      components: [{
        type: 'BODY',
        text: 'Hola {{1}}, le informamos que se registró el cobro del alquiler. 📍 {{2}} 📅 {{3}} 💰 {{4}} En breve procesamos la liquidación y transferencia. Gutleber & Asoc.',
        example: { body_text: [['Francisco', 'Mitre 450 Oberá', '10 de junio de 2026', '$ 150.000']] },
      }],
    },
    {
      name: 'gutleber_transferencia',
      language: 'es_AR',
      category: 'UTILITY',
      components: [{
        type: 'BODY',
        text: 'Hola {{1}}, se procesó la transferencia de su propiedad. 📍 {{2}} 📅 {{3}} Alquiler cobrado: {{4}} Honorarios ({{5}}%): -{{6}} Total transferido: {{7}} Gutleber & Asoc.',
        example: { body_text: [['Francisco', 'Mitre 450', '10 jun 2026', '$ 150.000', '8', '$ 12.000', '$ 138.000']] },
      }],
    },
  ]

  const results = []
  for (const tmpl of templates) {
    const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(tmpl),
    })
    const data = await r.json()
    results.push({ name: tmpl.name, ok: r.ok, status: r.status, response: data })
  }
  res.json(results)
})

// Lista templates del WABA correcto
app.get('/api/whatsapp/templates', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = '1748009346185242'
  if (!token) return res.status(500).json({ error: 'Token no configurado' })
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates?fields=name,language,status&limit=50`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    res.json(await r.json())
  } catch (err) { res.status(500).json({ error: String(err) }) }
})

// Webhook Meta WhatsApp (sin auth — Meta hace su propia verificación)
app.use('/api/webhooks/whatsapp', webhookWhatsappRouter)

// Rutas protegidas
app.use('/api/dashboard', authMiddleware, dashboardRouter)
app.use('/api/propiedades', authMiddleware, propiedadesRouter)
app.use('/api/personas', authMiddleware, personasRouter)
app.use('/api/vinculos', authMiddleware, vinculosRouter)
app.use('/api/pagos', authMiddleware, pagosRouter)
app.use('/api/inbox', authMiddleware, inboxRouter)
app.use('/api/whatsapp', authMiddleware, whatsappRouter)
app.use('/api/indices', authMiddleware, indicesRouter)
app.use('/api/conversaciones', authMiddleware, conversacionesRouter)
app.use('/api/gastos', authMiddleware, gastosRouter)
app.use('/api/ia', authMiddleware, iaRouter)
app.use('/api/catalogo', authMiddleware, catalogoRouter)
app.use('/api/usuarios', authMiddleware, requireAdminOrOperador, usuariosRouter)

async function fixImageUrls() {
  // Reemplaza URLs viejas (https://automatizapp.pro/uploads/) por la URL correcta (https://app.automatizapp.pro/uploads/)
  const OLD = 'https://automatizapp.pro/uploads/'
  const NEW = 'https://app.automatizapp.pro/uploads/'
  const [imgFixed, vidFixed] = await Promise.all([
    prisma.$executeRaw`UPDATE "PropiedadImagen" SET url = REPLACE(url, ${OLD}, ${NEW}) WHERE url LIKE ${OLD + '%'}`,
    prisma.$executeRaw`UPDATE "PropiedadVideo"  SET url = REPLACE(url, ${OLD}, ${NEW}) WHERE url LIKE ${OLD + '%'}`,
  ])
  if (imgFixed > 0 || vidFixed > 0)
    logger.info(`🔧 URLs de archivos corregidas: ${imgFixed} imágenes, ${vidFixed} videos`)
}

app.listen(PORT, () => {
  logger.info(`🏢 Gutleber API corriendo en http://localhost:${PORT}`)
  fixImageUrls().catch((err) => logger.warn({ err }, 'fixImageUrls falló'))
  initCron()
})

// ── Prevenir crashes por errores no capturados (Baileys, etc.) ────────────────
process.on('unhandledRejection', (reason) => {
  logger.warn({ reason }, '⚠️  unhandledRejection — ignorado para mantener el servidor activo')
})
process.on('uncaughtException', (err) => {
  logger.warn({ err }, '⚠️  uncaughtException — ignorado para mantener el servidor activo')
})

process.on('SIGTERM', async () => {
  await prisma.$disconnect()
  process.exit(0)
})
