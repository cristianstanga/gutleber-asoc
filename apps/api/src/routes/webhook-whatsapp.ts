import { Router } from 'express'
import { prisma, logger } from '../index'
import { responderAgente } from '../services/agente-ia'
import { sendText } from '../services/whatsapp-meta'
import type { Persona } from '@prisma/client'

const router = Router()

const CINTIA_TEL = '+54 9 3765 41-0765'

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

        for (const status of value.statuses || []) {
          if (status.status === 'failed') {
            logger.error({ status }, `❌ Meta WA: mensaje fallido a ${status.recipient_id}`)
          } else {
            logger.info(`📬 Meta WA: ${status.status} → ${status.recipient_id}`)
          }
        }

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

  if (!texto || texto === '[media]') return

  // Enrutar según tipo de persona
  if (persona?.tipo === 'PROPIETARIO') {
    await manejarPropietario(from, texto, persona).catch(err =>
      logger.error({ err }, '❌ Respuesta propietario WA')
    )
  } else if (persona?.tipo === 'INQUILINO') {
    await manejarInquilino(from, texto, persona).catch(err =>
      logger.error({ err }, '❌ Respuesta inquilino WA')
    )
  } else {
    responderAgente(conv.id, from).catch(err =>
      logger.error({ err }, '❌ Agente IA (prospecto)')
    )
  }
}

// ── Embudo PROPIETARIO ────────────────────────────────────────────────────────

async function manejarPropietario(from: string, texto: string, persona: Persona) {
  const msg = texto.trim().toLowerCase()
  const quiereCintia = msg === '2' || /cintia|hablar|comunicar|person/i.test(msg)
  const quiereEstado = msg === '1' || /propiedad|pago|estado|cobr|alquiler|liquida|transfer/i.test(msg)

  if (quiereCintia) {
    await sendText(from,
      `Para hablar directamente con Cintia Gutleber podés escribirle a:\n\n📱 *${CINTIA_TEL}*\n\nTe va a responder a la brevedad. 🙌`
    )
    return
  }

  if (quiereEstado) {
    const propiedades = await prisma.propiedad.findMany({
      where: { propietarioId: persona.id },
      include: {
        pagos: {
          where: { tipo: 'ALQUILER' },
          orderBy: { fechaVencimiento: 'desc' },
          take: 1,
        },
        vinculos: { where: { activo: true }, include: { persona: true }, take: 1 },
      },
    })

    if (propiedades.length === 0) {
      await sendText(from,
        `Hola ${persona.nombre}! No encontré propiedades asignadas a tu cuenta.\n\nContactá a Cintia al *${CINTIA_TEL}*`
      )
      return
    }

    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
    const lineas = propiedades.map(p => {
      const pago = p.pagos[0]
      const inq = p.vinculos[0]?.persona
      const inquilino = inq ? `${inq.nombre} ${inq.apellido}` : 'Sin inquilino'
      if (!pago) return `📍 *${p.direccion}*\n   Inquilino: ${inquilino}\n   Sin pagos este mes`

      let estadoLinea = ''
      if (pago.estado === 'PAGADO') {
        estadoLinea = pago.pagadoAlPropietario
          ? `✅ Cobrado y transferido (${fmt(pago.montoPropietario ?? pago.monto)})`
          : `✅ Cobrado — liquidación pendiente`
      } else if (pago.estado === 'MORA') {
        const dias = new Date().getDate()
        const mora = Math.round(pago.monto * dias / 100)
        estadoLinea = `⚠️ En mora — ${dias} días · ${fmt(mora)} de mora`
      } else {
        estadoLinea = `🕐 Pendiente — vence ${new Date(pago.fechaVencimiento).toLocaleDateString('es-AR')}`
      }

      return `📍 *${p.direccion}*\n   Inquilino: ${inquilino}\n   ${estadoLinea}`
    }).join('\n\n')

    await sendText(from,
      `Hola ${persona.nombre}! Tus propiedades este mes:\n\n${lineas}\n\n` +
      `Para más detalle o consultas escribile a Cintia al *${CINTIA_TEL}*`
    )
    return
  }

  // Menú inicial (primer mensaje o mensaje no reconocido)
  await sendText(from,
    `Hola ${persona.nombre}! 👋 Soy el asistente de *Gutleber & Asociados*.\n\n` +
    `¿En qué te puedo ayudar?\n\n` +
    `*1* — Estado de mis propiedades\n` +
    `*2* — Hablar con Cintia\n\n` +
    `Respondé con el número de la opción.`
  )
}

// ── Embudo INQUILINO ──────────────────────────────────────────────────────────

async function manejarInquilino(from: string, texto: string, persona: Persona) {
  const msg = texto.trim().toLowerCase()
  const quiereCintia = msg === '2' || /cintia|hablar|comunicar|person/i.test(msg)
  const quiereEstado = msg === '1' || /pago|deuda|alquiler|estado|mora|cuanto|debo|venci/i.test(msg)

  if (quiereCintia) {
    await sendText(from,
      `Para hablar directamente con Cintia Gutleber podés escribirle a:\n\n📱 *${CINTIA_TEL}*\n\nTe va a responder a la brevedad. 🙌`
    )
    return
  }

  if (quiereEstado) {
    const pago = await prisma.pago.findFirst({
      where: { personaId: persona.id, tipo: 'ALQUILER' },
      orderBy: { fechaVencimiento: 'desc' },
      include: { propiedad: true },
    })

    if (!pago) {
      await sendText(from,
        `Hola ${persona.nombre}! No encontré pagos registrados.\n\nContactá a Cintia al *${CINTIA_TEL}*`
      )
      return
    }

    const fmt = (n: number) => `$${Math.round(n).toLocaleString('es-AR')}`
    let respuesta = `Hola ${persona.nombre}! Tu situación al día de hoy:\n\n`
    respuesta += `📍 ${pago.propiedad?.direccion ?? ''}\n`
    respuesta += `📅 Período: ${pago.periodo ?? 'N/D'}\n\n`

    if (pago.estado === 'PAGADO') {
      respuesta += `✅ *Al día* — alquiler abonado\n`
      respuesta += `Monto: ${fmt(pago.totalConExtras ?? pago.monto)}`
    } else if (pago.estado === 'MORA') {
      const dias = new Date().getDate()
      const moraBase = Math.round(pago.monto * dias / 100)
      const moraNegociada = pago.moraMontoFinal
      respuesta += `⚠️ *En mora*\n`
      respuesta += `Alquiler base: ${fmt(pago.monto)}\n`
      if (moraNegociada != null) {
        respuesta += `Mora acordada: ${fmt(moraNegociada)}\n`
        respuesta += `*Total a regularizar: ${fmt(pago.monto + moraNegociada)}*`
      } else {
        respuesta += `Mora estimada (${dias} días × 1%): ${fmt(moraBase)}\n`
        respuesta += `*Total estimado: ${fmt(pago.monto + moraBase)}*\n`
        respuesta += `_El monto final se acuerda con la inmobiliaria._`
      }
    } else {
      const venc = new Date(pago.fechaVencimiento)
      const hoy = new Date()
      const diasRestantes = Math.ceil((venc.getTime() - hoy.getTime()) / 86400000)
      respuesta += `🕐 *Pendiente de pago*\n`
      respuesta += `Monto: ${fmt(pago.monto)}\n`
      respuesta += `Vencimiento: ${venc.toLocaleDateString('es-AR')}`
      if (diasRestantes > 0) respuesta += ` (en ${diasRestantes} días)`
      else if (diasRestantes === 0) respuesta += ` (hoy!)`
    }

    respuesta += `\n\nPara pagar o consultas escribile a Cintia al *${CINTIA_TEL}*`
    await sendText(from, respuesta)
    return
  }

  // Menú inicial
  await sendText(from,
    `Hola ${persona.nombre}! 👋 Soy el asistente de *Gutleber & Asociados*.\n\n` +
    `¿En qué te puedo ayudar?\n\n` +
    `*1* — Estado de mi alquiler\n` +
    `*2* — Hablar con Cintia\n\n` +
    `Respondé con el número de la opción.`
  )
}

export default router
