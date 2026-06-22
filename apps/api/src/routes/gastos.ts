import { Router } from 'express'
import { prisma } from '../index'
import { authMiddleware, requireAdmin, AuthRequest } from '../middleware/auth'

const router = Router()

// Listar gastos (filtros: propiedadId, vinculoId, estado)
router.get('/', async (req, res) => {
  const { propiedadId, vinculoId, estado } = req.query
  const where: Record<string, unknown> = {}
  if (propiedadId) where.propiedadId = propiedadId
  if (vinculoId) where.vinculoId = vinculoId
  if (estado) where.estado = estado

  const gastos = await prisma.gasto.findMany({
    where,
    include: { propiedad: true, vinculo: { include: { persona: true } } },
    orderBy: { fecha: 'desc' },
  })
  res.json(gastos)
})

// Crear gasto
router.post('/', async (req, res) => {
  try {
    const { descripcion, monto, fecha, propiedadId, vinculoId } = req.body
    if (!descripcion || !monto) {
      return res.status(400).json({ error: 'descripcion y monto son requeridos' })
    }
    const gasto = await prisma.gasto.create({
      data: {
        descripcion,
        monto: Number(monto),
        fecha: fecha ? new Date(fecha) : new Date(),
        propiedadId: propiedadId || null,
        vinculoId: vinculoId || null,
      },
      include: { propiedad: true },
    })
    res.status(201).json(gasto)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' })
  }
})

// Actualizar gasto (descripcion, monto, fecha, estado)
router.patch('/:id', async (req, res) => {
  try {
    const { descripcion, monto, fecha, estado } = req.body
    const data: Record<string, unknown> = {}
    if (descripcion !== undefined) data.descripcion = descripcion
    if (monto !== undefined) data.monto = Number(monto)
    if (fecha !== undefined) data.fecha = new Date(fecha)
    if (estado !== undefined) data.estado = estado

    const gasto = await prisma.gasto.update({
      where: { id: req.params.id },
      data,
    })
    res.json(gasto)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error' })
  }
})

// Anular gasto — solo ADMIN
router.delete('/:id', authMiddleware, requireAdmin, async (req: AuthRequest, res) => {
  const gasto = await prisma.gasto.update({
    where: { id: req.params.id },
    data: { estado: 'ANULADO' },
  })
  res.json(gasto)
})

export default router
