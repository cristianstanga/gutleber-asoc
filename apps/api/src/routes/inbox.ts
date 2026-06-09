import { Router } from 'express'
import { prisma } from '../index'
import { sendText } from '../services/whatsapp-meta'

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
  const { personaId, mensaje, propiedadId } = req.body

  const persona = await prisma.persona.findUnique({ where: { id: personaId } })
  if (!persona?.whatsapp) return res.status(400).json({ error: 'Sin WhatsApp' })

  await sendText(persona.whatsapp, mensaje)

  const item = await prisma.inboxItem.create({
    data: { canal: 'WHATSAPP', mensaje, tipo: 'SALIENTE', personaId, propiedadId: propiedadId || null },
    include: { persona: true },
  })
  res.status(201).json(item)
})

export default router
