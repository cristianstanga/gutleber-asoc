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

/** Muestra "escribiendo..." en WhatsApp y espera */
async function mostrarEscribiendo(jid: string, textoAEnviar: string) {
  if (!sock || !isConnected) return
  try {
    await sock.sendPresenceUpdate('composing', jid)
    await delay(tiempoEscritura(textoAEnviar), tiempoEscritura(textoAEnviar) + 500)
    await sock.sendPresenceUpdate('paused', jid)
  } catch {
    // No es crítico si falla
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
        const from = msg.key.remoteJid?.replace('@s.whatsapp.net', '') || ''
        const jid = `${from}@s.whatsapp.net`

        const texto =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '[media]'

        logger.info(`📨 Mensaje de ${from}: ${texto.substring(0, 60)}`)

        // Buscar persona existente
        const persona = await prisma.persona.findFirst({ where: { whatsapp: from } })

        // Obtener o crear conversación
        let conv = await prisma.conversacion.findUnique({ where: { numero: from } })
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
              // Mostrar "escribiendo..." proporcional al largo del texto
              await mostrarEscribiendo(jid, respuesta.texto)

              // Enviar texto
              await sendText(from, respuesta.texto)

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

            // Enviar media (fotos y videos) si las hay
            if (respuesta.media && respuesta.media.length > 0) {
              await enviarMedia(from, conv.id, persona?.id, respuesta.media)
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
  to: string,
  conversacionId: string,
  personaId: string | undefined,
  items: MediaItem[]
) {
  for (const item of items) {
    // Pausa breve entre cada archivo para no saturar
    await delay(700, 1500)

    try {
      if (item.tipo === 'imagen') {
        await sendImageUrl(to, item.url, item.caption)
      } else {
        await sendVideoUrl(to, item.url, item.caption)
      }

      // Guardar en historial
      const descripcion = item.tipo === 'imagen'
        ? `[Foto enviada]${item.caption ? ` — ${item.caption}` : ''}`
        : `[Video enviado]${item.caption ? ` — ${item.caption}` : ''}`

      await prisma.inboxItem.create({
        data: {
          canal: 'WHATSAPP',
          mensaje: descripcion,
          tipo: 'SALIENTE',
          numero: to,
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
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { text: message })
}

/** Envía imagen desde URL pública (Unsplash, uploads, etc.) */
export async function sendImageUrl(to: string, url: string, caption?: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — imagen no enviada')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { image: { url }, caption: caption || '' })
}

/** Envía video desde URL pública */
export async function sendVideoUrl(to: string, url: string, caption?: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — video no enviado')
    return
  }
  const jid = to.includes('@') ? to : `${to}@s.whatsapp.net`
  await sock.sendMessage(jid, { video: { url }, caption: caption || '' })
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
