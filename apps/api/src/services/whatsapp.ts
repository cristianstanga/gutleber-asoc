import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from '@whiskeysockets/baileys'
import { Boom } from '@hapi/boom'
import path from 'path'
import fs from 'fs'
import QRCode from 'qrcode'
import { prisma, logger } from '../index'
import { procesarMensaje, MediaItem } from './agente'

// Mapa en memoria: LID o JID → número de teléfono real (se llena con contacts.upsert)
const contactPhoneMap = new Map<string, string>()

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

export async function getQRImage(): Promise<string | null> {
  if (!qrCode) return null
  return QRCode.toDataURL(qrCode, { width: 280, margin: 2 })
}

export async function clearSession() {
  if (sock) {
    sock.end(new Error('clearSession'))
    sock = null
  }
  isConnected = false
  qrCode = null
  // SESSION_PATH puede ser un mount de Docker — no borrar el directorio,
  // solo su contenido (rmSync del dir lanzaría EBUSY en volúmenes Docker)
  try {
    if (fs.existsSync(SESSION_PATH)) {
      for (const file of fs.readdirSync(SESSION_PATH)) {
        fs.rmSync(path.join(SESSION_PATH, file), { recursive: true, force: true })
      }
      logger.info('🗑️ Sesión WhatsApp eliminada')
    }
  } catch (err) {
    logger.warn({ err }, '⚠️ Error limpiando sesión — continuando de todas formas')
  }
  // fire-and-forget — no await para no bloquear la respuesta HTTP
  initWhatsApp().catch((err) => logger.error({ err }, 'Error en clearSession→initWhatsApp'))
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

let lastInitError: string | null = null

export function getDebugInfo() {
  return {
    sessionPath: SESSION_PATH,
    sockCreated: sock !== null,
    isConnected,
    hasQR: qrCode !== null,
    lastInitError,
  }
}

export async function initWhatsApp() {
  try {
  lastInitError = null
  logger.info(`🚀 initWhatsApp: cargando sesión desde ${SESSION_PATH}`)
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_PATH)
  logger.info('🔑 Sesión cargada — obteniendo versión WA...')
  // fetchLatestBaileysVersion hace GET a GitHub — si el VPS filtra el tráfico
  // a nivel TCP, el await cuelga indefinidamente. Race de 3s con fallback hardcoded.
  const waVer = await Promise.race([
    fetchLatestBaileysVersion(),
    new Promise<{ version: [number, number, number]; isLatest: boolean }>((resolve) =>
      setTimeout(() => resolve({ version: [2, 3000, 1023141920], isLatest: false }), 3000)
    ),
  ])
  const version = waVer.version
  logger.info(`📦 WA version: ${version.join('.')} — creando socket...`)

  // Si WA_PROXY_URL está definido, rutea la conexión por ese proxy (útil en
  // VPS de datacenter donde WA bloquea el pre-key exchange — error 463)
  // Si WA_PROXY_URL está definido, rutea la conexión por ese proxy (útil en
  // VPS de datacenter donde WA bloquea el pre-key exchange — error 463)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let agent: any
  if (process.env.WA_PROXY_URL) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { HttpsProxyAgent } = require('https-proxy-agent')
    agent = new HttpsProxyAgent(process.env.WA_PROXY_URL)
    logger.info(`🔀 Usando proxy WA: ${process.env.WA_PROXY_URL}`)
  }

  sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger as any),
    },
    printQRInTerminal: true,
    logger: logger as any,
    getMessage: async () => ({ conversation: '' }),
    ...(agent ? { agent } : {}),
  })
  logger.info('🔌 Socket creado — esperando connection.update...')

  sock.ev.on('creds.update', saveCreds)

  // ── Captura contactos para resolver LID → número real ──────────────────────
  sock.ev.on('contacts.upsert', (contacts) => {
    for (const c of contacts) {
      // c.id puede ser @s.whatsapp.net o @lid
      // c.notify es el nombre push, c.name es el nombre guardado en agenda
      if (c.id) {
        const num = c.id.split('@')[0]
        // Si el JID es @s.whatsapp.net → el número ES el teléfono real
        if (c.id.endsWith('@s.whatsapp.net') && num) {
          // Mapear también por posibles LIDs relacionados
          contactPhoneMap.set(c.id, num)
        }
      }
    }
    logger.info(`📇 Contactos actualizados: ${contacts.length} registros`)
  })

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

        // Nombre de perfil de WhatsApp (pushName viene gratis en cada mensaje)
        const pushName = msg.pushName || null

        // Teléfono real: si es @s.whatsapp.net el número limpio ES el teléfono
        // Si es @lid, intentamos resolver del mapa de contactos
        let telefonoReal: string | null = null
        if (remoteJid.endsWith('@s.whatsapp.net')) {
          telefonoReal = from
        } else if (remoteJid.endsWith('@lid')) {
          telefonoReal = contactPhoneMap.get(remoteJid) || null
        }

        const texto =
          msg.message.conversation ||
          msg.message.extendedTextMessage?.text ||
          '[media]'

        logger.info(`📨 [${remoteJid}] pushName="${pushName}" tel="${telefonoReal}" → ${texto.substring(0, 50)}`)

        // Buscar persona existente por teléfono real o número limpio
        const busquedaWA = [from, remoteJid, telefonoReal].filter(Boolean) as string[]
        const persona = await prisma.persona.findFirst({
          where: { whatsapp: { in: busquedaWA } }
        })

        // Obtener o crear conversación
        let conv = await prisma.conversacion.findUnique({ where: { numero: from } })
        if (!conv) {
          conv = await prisma.conversacion.findFirst({ where: { numero: remoteJid } })
        }

        // Intentar obtener foto de perfil (puede fallar si la privacidad lo bloquea)
        let fotoPerfilUrl: string | null = null
        if (!conv?.fotoPerfilUrl) {
          try {
            fotoPerfilUrl = await sock!.profilePictureUrl(remoteJid, 'image') ?? null
          } catch {
            // Sin foto de perfil o privacidad bloqueada — no es crítico
          }
        }

        if (!conv) {
          conv = await prisma.conversacion.create({
            data: {
              numero: from,
              jid: remoteJid,
              personaId: persona?.id,
              pushName,
              fotoPerfilUrl,
              telefonoReal,
              nombreCapturado: persona ? `${persona.nombre} ${persona.apellido}` : (pushName || null),
              ultimoMensaje: new Date(),
            },
          })
        } else {
          // Actualizar datos de contacto si tenemos nueva info
          const updateContacto: Record<string, unknown> = {}
          if (!conv.jid) updateContacto.jid = remoteJid
          if (pushName && !conv.pushName) updateContacto.pushName = pushName
          if (fotoPerfilUrl && !conv.fotoPerfilUrl) updateContacto.fotoPerfilUrl = fotoPerfilUrl
          if (telefonoReal && !conv.telefonoReal) updateContacto.telefonoReal = telefonoReal
          if (pushName && !conv.nombreCapturado) updateContacto.nombreCapturado = pushName
          if (Object.keys(updateContacto).length > 0) {
            conv = await prisma.conversacion.update({
              where: { id: conv.id },
              data: updateContacto,
            })
          }
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
  } catch (err) {
    lastInitError = err instanceof Error ? err.message : String(err)
    logger.error({ err }, '❌ WhatsApp init error — reintentando en 10s')
    setTimeout(initWhatsApp, 10_000)
  }
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

// ── Resolución de JID para Argentina ─────────────────────────────────────────

/**
 * Convierte cualquier formato de número argentino al JID de WA.
 * Post-2019 Argentina usa 54XXXXXXXXXX (sin el 9 de prefijo móvil).
 * onWhatsApp() devuelve exists=true para 549XX pero el routing de mensajes
 * ya usa 54XX — por eso los mensajes con 549 dan error 463.
 *
 *   "3764123456"      → "543764123456@s.whatsapp.net"
 *   "03764123456"     → "543764123456@s.whatsapp.net"
 *   "5493764123456"   → "543764123456@s.whatsapp.net"  (quita el 9)
 *   "543764123456"    → "543764123456@s.whatsapp.net"  (ya correcto)
 */
async function resolveJid(phone: string): Promise<string> {
  if (phone.includes('@')) return phone
  const digits = phone.replace(/\D/g, '')

  let normalized: string
  if (digits.startsWith('549') && digits.length === 13) {
    // Tiene el 9 → lo quitamos (post-2019)
    normalized = '54' + digits.slice(3)
  } else if (digits.startsWith('54') && digits.length >= 12) {
    normalized = digits
  } else if (digits.startsWith('0') && digits.length === 11) {
    normalized = '54' + digits.slice(1)
  } else if (digits.length === 10) {
    normalized = '54' + digits
  } else {
    normalized = digits
  }

  logger.info(`📋 JID: ${digits} → ${normalized}@s.whatsapp.net`)
  return `${normalized}@s.whatsapp.net`
}

// ── Funciones de envío ────────────────────────────────────────────────────────

export async function sendText(to: string, message: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — mensaje no enviado')
    return
  }
  const jid = await resolveJid(to)
  logger.info(`📤 Enviando a ${jid}: ${message.substring(0, 50)}...`)
  try {
    // Simular escritura humana antes de enviar — reduce riesgo de ban
    await mostrarEscribiendo(jid, message)
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
  const jid = await resolveJid(to)
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
  const jid = await resolveJid(to)
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
  const jid = await resolveJid(to)
  await sock.sendMessage(jid, { image: buffer, caption })
}

/** Envía video desde Buffer */
export async function sendVideo(to: string, buffer: Buffer, caption?: string) {
  if (!sock || !isConnected) return
  const jid = await resolveJid(to)
  await sock.sendMessage(jid, { video: buffer, caption })
}

export async function sendPDF(to: string, buffer: Buffer, filename: string) {
  if (!sock || !isConnected) {
    logger.warn('WhatsApp no conectado — PDF no enviado')
    return
  }
  const jid = await resolveJid(to)
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
