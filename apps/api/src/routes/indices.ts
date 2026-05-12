import { Router } from 'express'
import { prisma } from '../index'
import { Indice } from '@prisma/client'

const router = Router()

// Listar contratos activos de un índice
router.get('/:indice/contratos', async (req, res) => {
  const indice = req.params.indice.toUpperCase() as Indice
  const vinculos = await prisma.vinculo.findMany({
    where: { activo: true, indice },
    include: { propiedad: true, persona: true },
  })
  res.json(vinculos)
})

// Aplicar ajuste masivo a un índice
router.post('/:indice/ajustar', async (req, res) => {
  const indice = req.params.indice.toUpperCase() as Indice
  const { porcentaje, proximaActualizacion } = req.body

  if (!porcentaje || porcentaje <= 0) {
    return res.status(400).json({ error: 'Porcentaje debe ser mayor a 0' })
  }

  const vinculos = await prisma.vinculo.findMany({ where: { activo: true, indice } })

  const updates = await Promise.all(
    vinculos.map((v) => {
      const nuevoMonto = Math.round((v.alquilerActual || 0) * (1 + porcentaje / 100))
      return prisma.vinculo.update({
        where: { id: v.id },
        data: {
          alquilerActual: nuevoMonto,
          proximaActualizacion: proximaActualizacion ? new Date(proximaActualizacion) : undefined,
        },
      })
    })
  )

  // Actualizar también los pagos pendientes futuros de estos contratos
  for (const v of vinculos) {
    const nuevoMonto = Math.round((v.alquilerActual || 0) * (1 + porcentaje / 100))
    await prisma.pago.updateMany({
      where: { vinculoId: v.id, estado: 'PENDIENTE', fechaVencimiento: { gt: new Date() } },
      data: { monto: nuevoMonto },
    })
  }

  res.json({ actualizados: updates.length, indice, porcentaje })
})

export default router
