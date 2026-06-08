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
import { initWhatsApp, getDebugInfo, checkNumber } from './services/whatsapp'
import { sendHelloWorld } from './services/whatsapp-meta'
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

// WhatsApp debug — sin auth para diagnóstico en VPS
app.get('/api/whatsapp/debug', (_req, res) => res.json(getDebugInfo()))
app.get('/api/whatsapp/check/:phone', async (req, res) => res.json(await checkNumber(req.params.phone)))
app.get('/api/whatsapp/meta-test/:phone', async (req, res) => {
  try { res.json({ ok: true, result: await sendHelloWorld(req.params.phone) }) }
  catch (err) { res.status(500).json({ error: String(err) }) }
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
  initWhatsApp().catch((err) => logger.error({ err }, 'Error iniciando WhatsApp'))
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
