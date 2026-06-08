import { Router } from 'express'
import { prisma } from '../index'
import { EstadoPago } from '@prisma/client'

const router = Router()

// ─── Búsqueda rápida ──────────────────────────────────────────────────────────

router.get('/buscar', async (req, res) => {
  const q = ((req.query.q as string) || '').trim()
  if (q.length < 2) return res.json([])

  const vinculos = await prisma.vinculo.findMany({
    where: {
      activo: true,
      tipo: 'ALQUILER',
      OR: [
        { persona: { nombre: { contains: q, mode: 'insensitive' } } },
        { persona: { apellido: { contains: q, mode: 'insensitive' } } },
        { propiedad: { direccion: { contains: q, mode: 'insensitive' } } },
      ],
    },
    include: {
      persona: true,
      propiedad: true,
      pagos: {
        where: { estado: { in: [EstadoPago.PENDIENTE, EstadoPago.VENCIDO, EstadoPago.MORA] } },
        select: { id: true, estado: true, monto: true, fechaVencimiento: true },
        orderBy: { fechaVencimiento: 'asc' },
        take: 1,
      },
    },
    take: 8,
  })

  res.json(vinculos.map(v => ({
    vinculoId: v.id,
    nombre: `${v.persona.nombre} ${v.persona.apellido}`,
    propiedad: v.propiedad.direccion,
    alquiler: v.alquilerActual ?? v.alquilerInicial ?? 0,
    pagoUrgente: v.pagos[0] ?? null,
  })))
})

// ─── Dashboard principal ──────────────────────────────────────────────────────

router.get('/', async (_req, res) => {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
  const en90dias = new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000)

  const [
    totalPropiedades,
    propEnAlquiler,
    propEnVenta,
    totalInquilinos,
    pagosPendientes,
    pagosEnMora,
    pagosVencidos,
    recaudadoMes,
    esperadoMes,
    pagadosMesCuenta,
    contratosVencer,
    inboxNoLeidos,
  ] = await Promise.all([
    prisma.propiedad.count(),
    prisma.propiedad.count({ where: { enAlquiler: true } }),
    prisma.propiedad.count({ where: { enVenta: true } }),
    prisma.persona.count({ where: { tipo: 'INQUILINO' } }),
    prisma.pago.count({ where: { estado: EstadoPago.PENDIENTE } }),
    prisma.pago.count({ where: { estado: EstadoPago.MORA } }),
    prisma.pago.count({ where: { estado: EstadoPago.VENCIDO } }),
    prisma.pago.aggregate({
      where: { estado: EstadoPago.PAGADO, fechaPago: { gte: inicioMes, lte: finMes } },
      _sum: { monto: true },
    }),
    // Total esperado este mes (todos los pagos con vencimiento en el mes)
    prisma.pago.aggregate({
      where: { fechaVencimiento: { gte: inicioMes, lte: finMes }, estado: { not: EstadoPago.ANULADO } },
      _sum: { monto: true },
      _count: true,
    }),
    // Cuántos pagos del mes ya están cobrados
    prisma.pago.count({
      where: { estado: EstadoPago.PAGADO, fechaVencimiento: { gte: inicioMes, lte: finMes } },
    }),
    prisma.vinculo.count({
      where: {
        activo: true,
        fechaFin: { gte: hoy, lte: new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000) },
      },
    }),
    prisma.inboxItem.count({ where: { leido: false } }),
  ])

  const [ultimosPagos, alertas, proximosVencimientos, sinLiquidar] = await Promise.all([
    prisma.pago.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { persona: true, propiedad: true },
    }),

    prisma.pago.findMany({
      where: { estado: { in: [EstadoPago.PENDIENTE, EstadoPago.VENCIDO, EstadoPago.MORA] } },
      take: 10,
      orderBy: { fechaVencimiento: 'asc' },
      include: { persona: true, propiedad: true },
    }),

    prisma.vinculo.findMany({
      where: { activo: true, tipo: 'ALQUILER', fechaFin: { gte: hoy, lte: en90dias } },
      orderBy: { fechaFin: 'asc' },
      include: { persona: true, propiedad: true },
      take: 10,
    }),

    prisma.pago.findMany({
      where: { estado: EstadoPago.PAGADO, pagadoAlPropietario: false },
      orderBy: { fechaPago: 'asc' },
      include: {
        persona: true,
        propiedad: true,
        vinculo: { select: { id: true, honorariosPct: true } },
      },
      take: 10,
    }),
  ])

  const esperadoMesTotal = esperadoMes._sum.monto || 0
  const esperadoMesCuenta = esperadoMes._count || 0

  res.json({
    kpis: {
      totalPropiedades, propEnAlquiler, propEnVenta, totalInquilinos,
      pagosPendientes, pagosEnMora, pagosVencidos,
      recaudadoMes: recaudadoMes._sum.monto || 0,
      contratosVencer, inboxNoLeidos,
    },
    cobrosDelMes: {
      esperado: esperadoMesTotal,
      cobrado: recaudadoMes._sum.monto || 0,
      totalCuenta: esperadoMesCuenta,
      cobradoCuenta: pagadosMesCuenta,
      pendienteCuenta: esperadoMesCuenta - pagadosMesCuenta,
    },
    estadosPagos: {
      pendiente: pagosPendientes,
      vencido: pagosVencidos,
      mora: pagosEnMora,
    },
    ultimosPagos,
    alertas,
    proximosVencimientos: proximosVencimientos.map(v => ({
      vinculoId: v.id,
      nombre: `${v.persona.nombre} ${v.persona.apellido}`,
      propiedad: v.propiedad.direccion,
      fechaFin: v.fechaFin,
      diasRestantes: Math.ceil((new Date(v.fechaFin!).getTime() - hoy.getTime()) / (24 * 60 * 60 * 1000)),
    })),
    sinLiquidar: sinLiquidar.map(p => ({
      pagoId: p.id,
      vinculoId: p.vinculo?.id,
      nombre: p.persona ? `${p.persona.nombre} ${p.persona.apellido}` : '—',
      propiedad: p.propiedad?.direccion || '—',
      monto: p.totalConExtras ?? p.monto,
      honorariosPct: p.vinculo?.honorariosPct ?? 8,
      fechaPago: p.fechaPago,
      periodo: p.periodo,
    })),
  })
})

export default router
