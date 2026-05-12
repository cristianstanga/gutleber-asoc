import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

router.get('/', async (req, res) => {
  const { tipo, enAlquiler, enVenta } = req.query
  const where: Record<string, unknown> = {}
  if (tipo) where.tipo = tipo
  if (enAlquiler !== undefined) where.enAlquiler = enAlquiler === 'true'
  if (enVenta !== undefined) where.enVenta = enVenta === 'true'

  const propiedades = await prisma.propiedad.findMany({
    where,
    include: {
      vinculos: { where: { activo: true }, include: { persona: true } },
      _count: { select: { pagos: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(propiedades)
})

router.get('/:id', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: {
      vinculos: { include: { persona: true } },
      pagos: { include: { persona: true }, orderBy: { fechaVencimiento: 'desc' }, take: 20 },
    },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  res.json(prop)
})

router.post('/', async (req, res) => {
  const data = req.body
  const prop = await prisma.propiedad.create({ data })
  res.status(201).json(prop)
})

router.put('/:id', async (req, res) => {
  const prop = await prisma.propiedad.update({ where: { id: req.params.id }, data: req.body })
  res.json(prop)
})

router.delete('/:id', async (req, res) => {
  await prisma.propiedad.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
