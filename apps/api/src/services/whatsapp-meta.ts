import { logger } from '../index'

const GRAPH_URL = 'https://graph.facebook.com/v25.0'

function cfg() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  const token = process.env.WHATSAPP_ACCESS_TOKEN
  if (!phoneNumberId || !token) throw new Error('META_WA_NOT_CONFIGURED')
  return { phoneNumberId, token }
}

/** Convierte cualquier formato al número que acepta Meta Cloud API.
 *  Argentina móvil: 549XXXXXXXXXX → 54AREA15NUMBER (formato que usa Meta internamente). */
function toMetaPhone(phone: string): string {
  if (phone.includes('@')) phone = phone.split('@')[0]
  const digits = phone.replace(/\D/g, '')

  // Argentina móvil con prefijo 9: 549XXXXXXXXXX (13 dígitos)
  // Meta usa el formato con 15: 54AREA15NUMBER (14 dígitos)
  if (digits.startsWith('549') && digits.length === 13) {
    const local = digits.slice(3) // 10 dígitos: área + número
    // Buenos Aires (11) tiene área de 2 dígitos; el resto 3 dígitos
    const areaLen = local.startsWith('11') ? 2 : 3
    const area = local.slice(0, areaLen)
    const number = local.slice(areaLen)
    return `54${area}15${number}`
  }

  return digits
}

async function metaPost(endpoint: string, body: object): Promise<Record<string, unknown>> {
  const { phoneNumberId, token } = cfg()
  const res = await fetch(`${GRAPH_URL}/${phoneNumberId}/${endpoint}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const data = await res.json() as Record<string, unknown>
  if (!res.ok) {
    const err = data.error as Record<string, unknown> | undefined
    const msg = err ? `${err.code}: ${err.message}` : `HTTP ${res.status}`
    logger.error({ data }, `❌ Meta WA error: ${msg}`)
    throw new Error(msg)
  }
  return data
}

export async function sendText(to: string, message: string): Promise<void> {
  const phone = toMetaPhone(to)
  logger.info(`📤 Meta WA → ${phone}`)
  await metaPost('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'text',
    text: { body: message, preview_url: false },
  })
  logger.info(`✅ Meta WA texto enviado a ${phone}`)
}

export async function sendImageUrl(to: string, url: string, caption?: string): Promise<void> {
  const phone = toMetaPhone(to)
  await metaPost('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'image',
    image: { link: url, caption: caption || '' },
  })
  logger.info(`✅ Meta WA imagen enviada a ${phone}`)
}

export async function sendVideoUrl(to: string, url: string, caption?: string): Promise<void> {
  const phone = toMetaPhone(to)
  await metaPost('messages', {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: phone,
    type: 'video',
    video: { link: url, caption: caption || '' },
  })
  logger.info(`✅ Meta WA video enviado a ${phone}`)
}

export async function sendPDF(to: string, buffer: Buffer, filename: string): Promise<void> {
  // PDF vía buffer no está soportado directamente por Meta Cloud API — necesita URL pública.
  // Por ahora logueamos un warning; migrar a URL cuando tengamos storage en la nube.
  logger.warn({ to, filename }, '⚠️ Meta WA: sendPDF requiere URL pública — no implementado aún')
}

export function getStatus() {
  const configured = !!(process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN)
  return { connected: configured, provider: 'meta', session: 'cloud-api' }
}

/** Envía el template hello_world — solo para testing de conectividad */
export async function sendHelloWorld(to: string): Promise<unknown> {
  const phone = toMetaPhone(to)
  return metaPost('messages', {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: { name: 'hello_world', language: { code: 'en_US' } },
  })
}
