import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import { prisma, logger } from '../index'

const SESSION_PATH = process.env.WA_SESSION_PATH || path.join(process.cwd(), 'baileys_auth_info')

let sock: ReturnType<typeof makeWASocket> | null = null
let qrCode: string | null = null
let isConnected = false

export function getStatus() {
  return { connected: isConnected, session: SESSION_PATH }
}

export function getQR() {
  return qrCode
}

export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: true,
    logger: logger as any,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCode = qr
      logger.info('📱 QR listo — escaneá desde el sistema o la terminal')
    }

    if (connection === 'close') {
      isConnected = false
      qrCode = null
      const shouldReconnect =
        (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut
      if (shouldReconnect) {
        logger.info('🔄 Reconectando WhatsApp...')
        setTimeout(initWhatsApp, 5000)
      }
    }

    if (connection === 'open') {
      isConnected = true
      qrCode = null
      logger.info('✅ WhatsApp conectado')
    }
  })

  // Escuchar mensajes entrantes
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
        const texto =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '[media]'

        const persona = await prisma.persona.findFirst({ where: { whatsapp: from } })

        await prisma.inboxItem.create({
          data: {
            canal: 'WHATSAPP',
            mensaje: texto,
            tipo: 'ENTRANTE',
            personaId: persona?.id,
          },
        })

        logger.info(`📨 Mensaje de ${from}: ${texto.substring(0, 60)}`)

        // Bot: responder consultas de propiedades
        await responderBot(from, texto.toLowerCase().trim())
      }
    }
  })
}

export async function sendText(to: string, message: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — no se pudo enviar mensaje')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { text: message })
}

export async function sendPDF(to: string, buffer: Buffer, filename: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — no se pudo enviar PDF')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, {
    document: buffer,
    mimetype: 'application/pdf',
    fileName: filename,
  })
}

// ─── Bot de propiedades ──────────────────────────────────────────────────────

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

async function responderBot(from: string, texto: string) {
  // Palabras clave que activan el bot
  const quiereAlquiler = /alquiler|alquilar|alquilo/.test(texto)
  const quiereVenta = /venta|vender|comprar|compra/.test(texto)
  const quierePropiedades = /propiedad|propiedades|disponible|dispon/.test(texto)
  const esSaludo = /^(hola|buenas|buen dia|buenas tardes|buenas noches|hey|hi)/.test(texto)

  if (esSaludo) {
    await sendText(from,
      `¡Hola! 👋 Soy el asistente de *Gutleber & Asoc.*\n\n` +
      `Podés consultarme:\n` +
      `• *propiedades en alquiler*\n` +
      `• *propiedades en venta*\n` +
      `• *todas las propiedades*\n\n` +
      `¿En qué te puedo ayudar?`
    )
    return
  }

  if (!quiereAlquiler && !quiereVenta && !quierePropiedades) return

  const where: Record<string, unknown> = {}
  if (quiereAlquiler && !quiereVenta) where.enAlquiler = true
  if (quiereVenta && !quiereAlquiler) where.enVenta = true

  const propiedades = await prisma.propiedad.findMany({
    where,
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
    take: 5,
  })

  if (propiedades.length === 0) {
    await sendText(from, 'Por el momento no tenemos propiedades disponibles con esas características. Te contactamos cuando tengamos novedades. 🏠')
    return
  }

  const tipoLabel: Record<string, string> = {
    CASA: 'Casa', DEPARTAMENTO: 'Dpto.', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
  }

  const lista = propiedades.map((p, i) => {
    const lineas = [`*${i + 1}. ${tipoLabel[p.tipo] || p.tipo} — ${p.direccion}*`]
    if (p.superficie) lineas.push(`📐 ${p.superficie} m²`)
    if (p.enAlquiler && p.alquilerBase) lineas.push(`💰 Alquiler: ${formatARS(p.alquilerBase)}`)
    if (p.enVenta && p.valorVenta) lineas.push(`💰 Venta: USD ${p.valorVenta.toLocaleString('es-AR')}`)
    if (p.descripcion) lineas.push(`ℹ️ ${p.descripcion.substring(0, 80)}`)
    return lineas.join('\n')
  }).join('\n\n')

  const titulo = quiereAlquiler && !quiereVenta
    ? '🏠 *Propiedades en alquiler disponibles:*'
    : quiereVenta && !quiereAlquiler
    ? '🏠 *Propiedades en venta disponibles:*'
    : '🏠 *Propiedades disponibles:*'

  await sendText(from, `${titulo}\n\n${lista}\n\n_Para más información respondé con el número de la propiedad que te interesa._`)
}

export async function restartClient() {
  if (sock) {
    sock.end(undefined)
    sock = null
  }
  isConnected = false
  qrCode = null
  await initWhatsApp()
}
