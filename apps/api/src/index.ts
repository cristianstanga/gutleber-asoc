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
import sitioPublicoRouter from './routes/sitio-publico'
import blogRouter from './routes/blog'
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
import configRouter from './routes/config'
import visitasRouter from './routes/visitas'
import statsRouter from './routes/stats'
import seedDemoRouter from './routes/seed-demo'
import seedRealRouter from './routes/seed-real'
import webhookWhatsappRouter from './routes/webhook-whatsapp'
import { initCron } from './services/cron'
import { sendHelloWorld, getStatus as getWAStatus } from './services/whatsapp-meta'
import { authMiddleware, requireAdminOrOperador } from './middleware/auth'

export const prisma = new PrismaClient()
export const logger = pino({ transport: { target: 'pino-pretty' } })

const app = express()
const PORT = process.env.PORT || 3001

// CORS_ORIGIN acepta uno o varios orígenes separados por coma (panel interno + sitio público)
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:5174')
  .split(',')
  .map((o) => o.trim())
app.use(cors({ origin: corsOrigins, credentials: true }))
app.use(express.json())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

// Health check (sin auth)
app.get('/health', (_req, res) => res.json({ ok: true, ts: new Date().toISOString() }))

// Auth (sin middleware)
app.use('/api/auth', authRouter)

// Tarjeta pública (sin auth — para preview y compartir) + API del sitio público
app.use('/api/public', tarjetaPublicaRouter)
app.use('/api/public', sitioPublicoRouter)

// WhatsApp — sin auth para diagnóstico
app.get('/api/whatsapp/debug', (_req, res) => res.json(getWAStatus()))
app.get('/api/whatsapp/meta-test/:phone', async (req, res) => {
  try { res.json({ ok: true, result: await sendHelloWorld(req.params.phone) }) }
  catch (err) { res.status(500).json({ error: String(err) }) }
})
// Crea gutleber_recibo en WABA correcto (one-time)
app.post('/api/whatsapp/crear-recibo-template', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = '1748009346185242'
  if (!token) return res.status(500).json({ error: 'Token no configurado' })
  const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'gutleber_recibo',
      language: 'es_AR',
      category: 'UTILITY',
      components: [{
        type: 'BODY',
        text: 'Hola {{1}}, su comprobante de pago del período {{2}} está disponible. Inmueble: {{4}} Monto: {{3}} Gracias por su pago. Gutleber & Co.',
        example: { body_text: [['Juan', 'Junio de 2026', '$ 150.000', 'Mitre 450 Oberá']] },
      }],
    }),
  })
  res.json({ ok: r.ok, status: r.status, response: await r.json() })
})

// Crea gutleber_contacto en WABA correcto (one-time) — contacto proactivo fuera de ventana 24hs
app.post('/api/whatsapp/crear-contacto-template', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = '1748009346185242'
  if (!token) return res.status(500).json({ error: 'Token no configurado' })
  const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'gutleber_contacto',
      language: 'es_AR',
      category: 'UTILITY',
      components: [{
        type: 'BODY',
        text: 'Hola {{1}}, le escribimos desde Gutleber & Co. para conversar sobre {{2}}. Quedamos a disposición.',
        example: { body_text: [['Juan', 'su contrato de alquiler']] },
      }],
    }),
  })
  res.json({ ok: r.ok, status: r.status, response: await r.json() })
})

// Renombra las 4 plantillas ya aprobadas de "Gutleber & Asoc." a "Gutleber & Co."
// (one-time — editar una plantilla existente la manda de nuevo a revisión de Meta,
// pero mantiene el mismo nombre/id, así que no hay que tocar los sendTemplate(...) del código)
app.post('/api/whatsapp/renombrar-plantillas', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!token) return res.status(500).json({ error: 'Token no configurado' })

  const ediciones = [
    {
      id: '1334746771938444', // gutleber_contacto
      text: 'Hola {{1}}, le escribimos desde Gutleber & Co. para conversar sobre {{2}}. Quedamos a disposición.',
      example: ['Juan', 'su contrato de alquiler'],
    },
    {
      id: '2185678405547532', // gutleber_recibo
      text: 'Hola {{1}}, su comprobante de pago del período {{2}} está disponible. Inmueble: {{4}} Monto: {{3}} Gracias por su pago. Gutleber & Co.',
      example: ['Juan', 'Junio de 2026', '$ 150.000', 'Mitre 450 Oberá'],
    },
    {
      id: '1324653125697709', // gutleber_transferencia
      text: 'Hola {{1}}, se procesó la transferencia de su propiedad. 📍 {{2}} 📅 {{3}} Alquiler cobrado: {{4}} Honorarios ({{5}}%): -{{6}} Total transferido: {{7}} Gutleber & Co.',
      example: ['Francisco', 'Mitre 450', '10 jun 2026', '$ 150.000', '8', '$ 12.000', '$ 138.000'],
    },
    {
      id: '1482621693114316', // gutleber_pago_cobrado
      text: 'Hola {{1}}, le informamos que se registró el cobro del alquiler. 📍 {{2}} 📅 {{3}} 💰 {{4}} En breve procesamos la liquidación y transferencia. Gutleber & Co.',
      example: ['Francisco', 'Mitre 450 Oberá', '10 de junio de 2026', '$ 150.000'],
    },
  ]

  const resultados = []
  for (const ed of ediciones) {
    const r = await fetch(`https://graph.facebook.com/v25.0/${ed.id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        components: [{ type: 'BODY', text: ed.text, example: { body_text: [ed.example] } }],
      }),
    })
    resultados.push({ id: ed.id, ok: r.ok, status: r.status, response: await r.json() })
  }
  res.json(resultados)
})

// Lista templates del WABA correcto — diagnóstico
app.get('/api/whatsapp/templates', async (_req, res) => {
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  const wabaId = '1748009346185242'
  if (!token) return res.status(500).json({ error: 'Token no configurado' })
  try {
    const r = await fetch(`https://graph.facebook.com/v25.0/${wabaId}/message_templates?fields=name,language,status,components&limit=50`, {
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
app.use('/api/config', authMiddleware, requireAdminOrOperador, configRouter)
app.use('/api/blog', authMiddleware, requireAdminOrOperador, blogRouter)
app.use('/api/visitas', authMiddleware, requireAdminOrOperador, visitasRouter)
app.use('/api/stats', authMiddleware, requireAdminOrOperador, statsRouter)
app.use('/api/seed-demo', authMiddleware, seedDemoRouter)
app.use('/api/seed-real', authMiddleware, seedRealRouter)

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
