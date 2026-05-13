import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import { prisma, logger } from '../index'
import { procesarMensaje, MediaItem } from './agente'

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

// ── Helpers humanos ──────────────────────────────────────────────────────────

/** Espera aleatoria entre min y max ms */
function delay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min
  return new Promise((r) => setTimeout(r, ms))
}

/** Estima tiempo de "escritura" basado en la longitud del texto */
function tiempoEscritura(texto: string): number {
  // ~40 palabras por minuto para parecer humano, entre 1.5s y 4s
  const palabras = texto.split(/\s+/).length
  const ms = Math.min(Math.max(palabras * 60, 1500), 4000)
  return ms
}

/** Muestra "escribiendo..." en WhatsApp y espera.
 *  Recibe el remoteJid ORIGINAL (puede ser @s.whatsapp.net o @lid). */
async function mostrarEscribiendo(remoteJid: string, textoAEnviar: string) {
  if (!sock || !isConnected) return
  try {
    await sock.sendPresenceUpdate('composing', remoteJid)
    await delay(tiempoEscritura(textoAEnviar), tiempoEscritura(textoAEnviar) + 500)
    await sock.sendPresenceUpdate('paused', remoteJid)
  } catch {
    // No es crítico si falla — WhatsApp @lid puede no soportar presencia
  }
}

// ── Init WhatsApp ─────────────────────────────────────────────────────────────

export async function initWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  const { version } = await fetchLatestBaileysVersion()

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: false,
    logger: logger as any,
  })

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      qrCode = qr
      logger.info('📱 QR listo — escaneá desde el sistema')
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

  // ── Mensajes entrantes ──────────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (!msg.key.fromMe && msg.message) {
        // JID original completo — SIEMPRE usar este para enviar, nunca reconstruirlo
        const remoteJid = msg.key.remoteJid || ''

        // Número limpio para la DB (sin @s.whatsapp.net ni @lid)
        const from = remoteJid.split('@')[0]

        const texto =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '[media]'

        logger.info(`📨 [${remoteJid}] ${texto.substring(0, 60)}`)

        // Buscar persona existente (buscar por número limpio Y por JID completo)
        const persona = await prisma.persona.findFirst({
          where: { OR: [{ whatsapp: from }, { whatsapp: remoteJid }] }
        })

        // Obtener o crear conversación (clave única = número limpio)
        let conv = await prisma.conversacion.findUnique({ where: { numero: from } })
        if (!conv) {
          // También buscar si ya existe con el JID completo (migración de datos viejos)
          conv = await prisma.conversacion.findFirst({ where: { numero: remoteJid } })
        }
        if (!conv) {
          conv = await prisma.conversacion.create({
            data: {
              numero: from,
              personaId: persona?.id,
              nombreCapturado: persona ? `${persona.nombre} ${persona.apellido}` : null,
              ultimoMensaje: new Date(),
            },
          })
        }

        // Guardar mensaje entrante
        await prisma.inboxItem.create({
          data: {
            canal: 'WHATSAPP',
            mensaje: texto,
            tipo: 'ENTRANTE',
            numero: from,
            conversacionId: conv.id,
            personaId: persona?.id,
          },
        })

        // Procesar con el agente si no es media
        if (texto !== '[media]') {
          try {
            // Delay inicial breve (simula que leyó el mensaje)
            await delay(800, 2000)

            // Procesar mensaje → devuelve texto + media opcional
            const respuesta = await procesarMensaje(from, texto)

            if (respuesta.texto) {
              // Mostrar "escribiendo..." — usar remoteJid original
              await mostrarEscribiendo(remoteJid, respuesta.texto)

              // Enviar texto — usar remoteJid original (no reconstruir)
              await sendText(remoteJid, respuesta.texto)

              // Guardar en historial
              await prisma.inboxItem.create({
                data: {
                  canal: 'WHATSAPP',
                  mensaje: respuesta.texto,
                  tipo: 'SALIENTE',
                  numero: from,
                  conversacionId: conv.id,
                  personaId: persona?.id,
                  leido: true,
                },
              })

              await prisma.conversacion.update({
                where: { id: conv.id },
                data: { ultimoMensaje: new Date() },
              })
            }

            // Enviar media (fotos y videos) si las hay — usar remoteJid original
            if (respuesta.media && respuesta.media.length > 0) {
              await enviarMedia(remoteJid, from, conv.id, persona?.id, respuesta.media)
            }

          } catch (err) {
            logger.error({ err }, 'Error en agente WhatsApp')
          }
        }
      }
    }
  })
}

// ── Enviar lista de media (fotos + videos) ────────────────────────────────────

async function enviarMedia(
  remoteJid: string,   // JID original completo para enviar por WhatsApp
  numero: string,      // número limpio para guardar en DB
  conversacionId: string,
  personaId: string | undefined,
  items: MediaItem[]
) {
  for (const item of items) {
    await delay(700, 1500)
    try {
      if (item.tipo === 'imagen') {
        await sendImageUrl(remoteJid, item.url, item.caption)
      } else {
        await sendVideoUrl(remoteJid, item.url, item.caption)
      }
      const descripcion = item.tipo === 'imagen'
        ? `[Foto enviada]${item.caption ? ` — ${item.caption}` : ''}`
        : `[Video enviado]${item.caption ? ` — ${item.caption}` : ''}`
      await prisma.inboxItem.create({
        data: {
          canal: 'WHATSAPP',
          mensaje: descripcion,
          tipo: 'SALIENTE',
          numero,
          conversacionId,
          personaId,
          leido: true,
        },
      })
    } catch (err) {
      logger.error({ err, url: item.url }, `Error enviando ${item.tipo}`)
    }
  }
}

// ── Funciones de envío ────────────────────────────────────────────────────────

export async function sendText(to: string, message: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — mensaje no enviado')
    return
  }
  // Si ya tiene @ (JID completo como @s.whatsapp.net o @lid), usar tal cual.
  // Si es solo número, agregar @s.whatsapp.net
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  logger.info(`📤 Enviando a ${jid}: ${message.substring(0, 50)}...`)
  try {
    await sock.sendMessage(jid, { text: message })
    logger.info(`✅ Enviado OK a ${jid}`)
  } catch (err) {
    logger.error({ err, jid }, '❌ Error en sock.sendMessage (texto)')
    throw err
  }
}

/** Envía imagen desde URL pública (Unsplash, uploads, etc.) */
export async function sendImageUrl(to: string, url: string, caption?: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — imagen no enviada')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  logger.info(`📤 Enviando imagen a ${jid}: ${url.substring(0, 60)}`)
  try {
    await sock.sendMessage(jid, { image: { url }, caption: caption || '' })
    logger.info(`✅ Imagen enviada OK a ${jid}`)
  } catch (err) {
    logger.error({ err, jid, url }, '❌ Error enviando imagen')
    throw err
  }
}

/** Envía video desde URL pública */
export async function sendVideoUrl(to: string, url: string, caption?: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — video no enviado')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  logger.info(`📤 Enviando video a ${jid}: ${url.substring(0, 60)}`)
  try {
    await sock.sendMessage(jid, { video: { url }, caption: caption || '' })
    logger.info(`✅ Video enviado OK a ${jid}`)
  } catch (err) {
    logger.error({ err, jid, url }, '❌ Error enviando video')
    throw err
  }
}

/** Envía imagen desde Buffer (para imágenes generadas en memoria, ej. con Sharp) */
export async function sendImage(to: string, buffer: Buffer, caption?: string) {
  if (!sock || !isConnected) return
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { image: buffer, caption })
}

/** Envía video desde Buffer */
export async function sendVideo(to: string, buffer: Buffer, caption?: string) {
  if (!sock || !isConnected) return
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { video: buffer, caption })
}

export async function sendPDF(to: string, buffer: Buffer, filename: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — PDF no enviado')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, {
    document: buffer,
    mimetype: 'application/pdf',
    fileName: filename,
  })
}

export async function restartClient() {
  if (sock) { sock.end(undefined); sock = null }
  isConnected = false
  qrCode = null
  await initWhatsApp()
}
