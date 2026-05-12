import { Router } from 'express'
import { prisma } from '../index'
import { EstadoPago } from '@prisma/client'

const router = Router()

router.get('/', async (_req, res) => {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)

  const [
    totalPropiedades,
    propEnAlquiler,
    propEnVenta,
    totalInquilinos,
    pagosPendientes,
    pagosEnMora,
    recaudadoMes,
    contratosVencer,
    inboxNoLeidos,
  ] = await Promise.all([
    prisma.propiedad.count(),
    prisma.propiedad.count({ where: { enAlquiler: true } }),
    prisma.propiedad.count({ where: { enVenta: true } }),
    prisma.persona.count({ where: { tipo: 'INQUILINO' } }),
    prisma.pago.count({ where: { estado: EstadoPago.PENDIENTE } }),
    prisma.pago.count({ where: { estado: EstadoPago.MORA } }),
    prisma.pago.aggregate({
      where: { estado: EstadoPago.PAGADO, fechaPago: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    }),
    prisma.vinculo.count({
      where: {
        activo: true,
        fechaFin: { gte: hoy, lte: new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.inboxItem.count({ where: { leido: false } }),
  ])

  const ultimosPagos = await prisma.pago.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: { persona: true, propiedad: true },
  })

  const alertas = await prisma.pago.findMany({
    where: { estado: { in: [EstadoPago.PENDIENTE, EstadoPago.VENCIDO, EstadoPago.MORA] } },
    take: 10,
    orderBy: { fechaVencimiento: 'asc' },
    include: { persona: true, propiedad: true },
  })

  res.json({
    kpis: {
      totalPropiedades,
      propEnAlquiler,
      propEnVenta,
      totalInquilinos,
      pagosPendientes,
      pagosEnMora,
      recaudadoMes: recaudadoMes._sum.monto || 0,
      contratosVencer,
      inboxNoLeidos,
    },
    ultimosPagos,
    alertas,
  })
})

export default router
