import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

router.get('/', async (req, res) => {
  const { activo } = req.query
  const where: Record<string, unknown> = {}
  if (activo !== undefined) where.activo = activo === 'true'

  const vinculos = await prisma.vinculo.findMany({
    where,
    include: { propiedad: true, persona: true },
    orderBy: { fechaInicio: 'desc' },
  })
  res.json(vinculos)
})

router.get('/:id', async (req, res) => {
  const vinculo = await prisma.vinculo.findUnique({
    where: { id: req.params.id },
    include: {
      propiedad: true,
      persona: true,
      pagos: { orderBy: { fechaVencimiento: 'desc' } },
    },
  })
  if (!vinculo) return res.status(404).json({ error: 'Vínculo no encontrado' })
  res.json(vinculo)
})

router.post('/', async (req, res) => {
  const { propiedadId, personaId, tipo, fechaInicio, alquilerInicial, indice, periodicidad, notas } = req.body

  const alquilerActual = alquilerInicial
  const inicio = new Date(fechaInicio)
  const proximaActualizacion = new Date(inicio)
  proximaActualizacion.setMonth(proximaActualizacion.getMonth() + (periodicidad || 3))

  const vinculo = await prisma.vinculo.create({
    data: {
      propiedadId,
      personaId,
      tipo,
      fechaInicio: inicio,
      alquilerInicial,
      alquilerActual,
      indice,
      periodicidad: periodicidad || 3,
      proximaActualizacion,
      notas,
      activo: true,
    },
    include: { propiedad: true, persona: true },
  })

  // Activar alquiler en la propiedad
  if (tipo === 'ALQUILER') {
    await prisma.propiedad.update({ where: { id: propiedadId }, data: { enAlquiler: true } })
  }

  res.status(201).json(vinculo)
})

router.put('/:id', async (req, res) => {
  const vinculo = await prisma.vinculo.update({ where: { id: req.params.id }, data: req.body })
  res.json(vinculo)
})

router.patch('/:id/cerrar', async (req, res) => {
  const { fechaFin } = req.body
  const vinculo = await prisma.vinculo.update({
    where: { id: req.params.id },
    data: { activo: false, fechaFin: fechaFin ? new Date(fechaFin) : new Date() },
  })
  res.json(vinculo)
})

export default router
