import { Router } from 'express'
import { prisma } from '../index'
import { sendText, sendTemplate } from '../services/whatsapp-meta'
import { EtapaConversacion } from '@prisma/client'

const router = Router()

router.get('/', async (req, res) => {
  const { leido, personaId } = req.query
  const where: Record<string, unknown> = {}
  if (leido !== undefined) where.leido = leido === 'true'
  if (personaId) where.personaId = personaId

  const items = await prisma.inboxItem.findMany({
    where,
    include: { persona: true, propiedad: true },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  res.json(items)
})

router.patch('/:id/leer', async (req, res) => {
  const item = await prisma.inboxItem.update({ where: { id: req.params.id }, data: { leido: true } })
  res.json(item)
})

router.patch('/leer-todo', async (_req, res) => {
  await prisma.inboxItem.updateMany({ where: { leido: false }, data: { leido: true } })
  res.json({ ok: true })
})

router.post('/enviar', async (req, res) => {
  const { personaId, mensaje, propiedadId, usarTemplate, motivo } = req.body

  const persona = await prisma.persona.findUnique({ where: { id: personaId } })
  if (!persona?.whatsapp) return res.status(400).json({ error: 'Sin WhatsApp' })

  const mensajeFinal = usarTemplate
    ? `Hola ${persona.nombre}, le escribimos desde Gutleber & Asoc. para conversar sobre ${motivo || 'una consulta'}. Quedamos a disposición.`
    : mensaje

  if (usarTemplate) {
    await sendTemplate(persona.whatsapp, 'gutleber_contacto', [persona.nombre, motivo || 'una consulta'])
  } else {
    await sendText(persona.whatsapp, mensaje)
  }

  // Buscar o crear conversación para que aparezca en el CRM
  const numeroLimpio = persona.whatsapp.replace(/\D/g, '')
  let conv = await prisma.conversacion.findFirst({ where: { personaId } })

  if (!conv) {
    try {
      conv = await prisma.conversacion.create({
        data: {
          numero: numeroLimpio,
          personaId,
          etapa: EtapaConversacion.CLIENTE,
          ultimoMensaje: new Date(),
        },
      })
    } catch {
      // El número ya existe en otra conversación — buscarla y vincularla
      conv = await prisma.conversacion.findFirst({ where: { numero: { contains: numeroLimpio.slice(-10) } } })
      if (conv) {
        await prisma.conversacion.update({ where: { id: conv.id }, data: { personaId, ultimoMensaje: new Date() } })
      }
    }
  } else {
    await prisma.conversacion.update({ where: { id: conv.id }, data: { ultimoMensaje: new Date() } })
  }

  const item = await prisma.inboxItem.create({
    data: {
      canal: 'WHATSAPP',
      mensaje: mensajeFinal,
      tipo: 'SALIENTE',
      personaId,
      propiedadId: propiedadId || null,
      conversacionId: conv?.id ?? null,
      numero: numeroLimpio,
      leido: true,
    },
    include: { persona: true },
  })
  res.status(201).json(item)
})

export default router
