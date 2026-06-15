import { Router } from 'express'
import { prisma, logger } from '../index'
import { responderAgente } from '../services/agente-ia'

const router = Router()

// GET — Meta verifica el webhook al configurarlo en el panel
router.get('/', (req, res) => {
  const mode = req.query['hub.mode']
  const token = req.query['hub.verify_token']
  const challenge = req.query['hub.challenge']
  const expected = process.env.WHATSAPP_VERIFY_TOKEN || 'gutleber_webhook_2026'
  if (mode === 'subscribe' && token === expected) {
    logger.info('✅ Webhook Meta WA verificado')
    return res.status(200).send(challenge)
  }
  logger.warn({ token }, '⚠️ Webhook: token inválido')
  res.sendStatus(403)
})

// POST — Meta envía mensajes entrantes aquí
router.post('/', async (req, res) => {
  // Siempre 200 inmediato — Meta reintenta si no responde rápido
  res.sendStatus(200)

  try {
    const body = req.body
    if (body.object !== 'whatsapp_business_account') return

    for (const entry of body.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') continue
        const value = change.value

        // Status de mensajes salientes (entregado, leído, error)
        for (const status of value.statuses || []) {
          if (status.status === 'failed') {
            logger.error({ status }, `❌ Meta WA: mensaje fallido a ${status.recipient_id}`)
          } else {
            logger.info(`📬 Meta WA: ${status.status} → ${status.recipient_id}`)
          }
        }

        // Mensajes entrantes
        for (const msg of value.messages || []) {
          await handleIncoming(msg, value.contacts?.[0])
        }
      }
    }
  } catch (err) {
    logger.error({ err }, 'Error procesando webhook Meta WA')
  }
})

async function handleIncoming(msg: Record<string, unknown>, contact?: Record<string, unknown>) {
  const from = msg.from as string
  const pushName = (contact?.profile as Record<string, unknown>)?.name as string | undefined || null
  const texto =
    msg.type === 'text'
      ? (msg.text as Record<string, unknown>)?.body as string
      : '[media]'

  logger.info(`📨 Meta WA entrante [${from}] "${pushName}": ${texto?.substring(0, 60)}`)

  const persona = await prisma.persona.findFirst({
    where: { whatsapp: { in: [from, `+${from}`] } },
  })

  let conv = await prisma.conversacion.findUnique({ where: { numero: from } })
  if (!conv) {
    conv = await prisma.conversacion.create({
      data: {
        numero: from,
        jid: `${from}@s.whatsapp.net`,
        personaId: persona?.id || null,
        pushName,
        telefonoReal: from,
        nombreCapturado: persona
          ? `${persona.nombre} ${persona.apellido}`
          : (pushName || null),
        ultimoMensaje: new Date(),
      },
    })
  } else {
    const upd: Record<string, unknown> = { ultimoMensaje: new Date() }
    if (pushName && !conv.pushName) upd.pushName = pushName
    if (pushName && !conv.nombreCapturado) upd.nombreCapturado = pushName
    if (!conv.telefonoReal) upd.telefonoReal = from
    conv = await prisma.conversacion.update({ where: { id: conv.id }, data: upd })
  }

  await prisma.inboxItem.create({
    data: {
      canal: 'WHATSAPP',
      mensaje: texto || '[media]',
      tipo: 'ENTRANTE',
      numero: from,
      conversacionId: conv.id,
      personaId: persona?.id || null,
    },
  })

  // Agente IA responde automáticamente (solo si hay texto, async para no bloquear)
  if (texto && texto !== '[media]') {
    responderAgente(conv.id, from).catch(err =>
      logger.error({ err }, '❌ Agente IA (async)')
    )
  }
}

export default router
