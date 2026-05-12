import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

router.get('/', async (req, res) => {
  const { tipo, q } = req.query
  const where: Record<string, unknown> = {}
  if (tipo) where.tipo = tipo
  if (q) {
    where.OR = [
      { nombre: { contains: q as string, mode: 'insensitive' } },
      { apellido: { contains: q as string, mode: 'insensitive' } },
      { dni: { contains: q as string } },
    ]
  }
  const personas = await prisma.persona.findMany({
    where,
    include: { vinculos: { where: { activo: true }, include: { propiedad: true } } },
    orderBy: { apellido: 'asc' },
  })
  res.json(personas)
})

router.get('/:id', async (req, res) => {
  const persona = await prisma.persona.findUnique({
    where: { id: req.params.id },
    include: {
      vinculos: { include: { propiedad: true } },
      pagos: { orderBy: { fechaVencimiento: 'desc' }, take: 20 },
      inboxItems: { orderBy: { createdAt: 'desc' }, take: 20 },
    },
  })
  if (!persona) return res.status(404).json({ error: 'Persona no encontrada' })
  res.json(persona)
})

router.post('/', async (req, res) => {
  const persona = await prisma.persona.create({ data: req.body })
  res.status(201).json(persona)
})

router.put('/:id', async (req, res) => {
  const persona = await prisma.persona.update({ where: { id: req.params.id }, data: req.body })
  res.json(persona)
})

router.delete('/:id', async (req, res) => {
  await prisma.persona.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
