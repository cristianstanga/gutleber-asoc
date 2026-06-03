import { Router } from 'express'
import { prisma } from '../index'
import { generarContratoPDF } from '../services/contrato'

const router = Router()

router.get('/', async (req, res) => {
  const { activo, tipo } = req.query
  const where: Record<string, unknown> = {}
  if (activo !== undefined) where.activo = activo === 'true'
  if (tipo) where.tipo = tipo

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
  const { propiedadId, personaId, tipo, fechaInicio, duracionMeses, alquilerInicial, indice, periodicidad, honorariosPct, administrado, notas } = req.body

  const alquilerActual = alquilerInicial
  const inicio = new Date(fechaInicio)

  // Calcular fecha fin a partir de duración en meses
  let fechaFin: Date | undefined
  if (duracionMeses) {
    fechaFin = new Date(inicio)
    fechaFin.setMonth(fechaFin.getMonth() + Number(duracionMeses))
  }

  const proximaActualizacion = new Date(inicio)
  proximaActualizacion.setMonth(proximaActualizacion.getMonth() + (periodicidad || 3))

  const vinculo = await prisma.vinculo.create({
    data: {
      propiedadId,
      personaId,
      tipo,
      fechaInicio: inicio,
      fechaFin,
      duracionMeses: duracionMeses ? Number(duracionMeses) : undefined,
      administrado: administrado === true || administrado === 'true',
      alquilerInicial,
      alquilerActual,
      indice,
      periodicidad: periodicidad || 3,
      honorariosPct: honorariosPct != null ? Number(honorariosPct) : 8,
      proximaActualizacion,
      notas,
      activo: true,
    },
    include: { propiedad: true, persona: true },
  })

  if (tipo === 'ALQUILER') {
    await prisma.propiedad.update({
      where: { id: propiedadId },
      data: { enAlquiler: true, administrada: administrado === true || administrado === 'true' },
    })
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

// ─── Generar contrato PDF ─────────────────────────────────────────────────────
router.get('/:id/contrato', async (req, res) => {
  const vinculo = await prisma.vinculo.findUnique({
    where: { id: req.params.id },
    include: {
      propiedad: true,
      persona: true,
    },
  })
  if (!vinculo) return res.status(404).json({ error: 'Vínculo no encontrado' })
  if (vinculo.tipo !== 'ALQUILER') return res.status(400).json({ error: 'Solo se generan contratos para alquileres' })

  // Buscar propietario: primero desde propiedad.propietario, fallback al vínculo ADMINISTRACION
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — propietario relation added in latest migration; TS server may need restart
  const propiedadConPropietario = await prisma.propiedad.findUnique({
    where: { id: vinculo.propiedadId },
    include: { propietario: true },
  }) as any
  let propietarioPersona = propiedadConPropietario?.propietario ?? null
  if (!propietarioPersona) {
    const vinculoPropietario = await prisma.vinculo.findFirst({
      where: { propiedadId: vinculo.propiedadId, tipo: { in: ['ADMINISTRACION', 'VENTA'] }, activo: true },
      include: { persona: true },
    })
    propietarioPersona = vinculoPropietario?.persona ?? null
  }

  try {
    const pdf = await generarContratoPDF({
      propiedad: {
        direccion: vinculo.propiedad.direccion,
        tipo: vinculo.propiedad.tipo,
        superficie: vinculo.propiedad.superficie,
        dormitorios: (vinculo.propiedad as any).dormitorios,
        banos: (vinculo.propiedad as any).banos,
        piso: (vinculo.propiedad as any).piso,
        cochera: (vinculo.propiedad as any).cochera,
      },
      inquilino: {
        nombre: vinculo.persona.nombre,
        apellido: vinculo.persona.apellido,
        dni: vinculo.persona.dni,
        whatsapp: vinculo.persona.whatsapp,
        email: vinculo.persona.email,
      },
      propietario: propietarioPersona
        ? {
            nombre: propietarioPersona.nombre,
            apellido: propietarioPersona.apellido,
            dni: propietarioPersona.dni,
          }
        : null,
      contrato: {
        fechaInicio: vinculo.fechaInicio,
        fechaFin: vinculo.fechaFin,
        alquilerInicial: vinculo.alquilerInicial || 0,
        alquilerActual: vinculo.alquilerActual || 0,
        indice: vinculo.indice,
        periodicidad: vinculo.periodicidad,
        notas: vinculo.notas,
      },
    })

    const filename = `contrato-${vinculo.persona.apellido.toLowerCase()}-${vinculo.propiedad.direccion.split(' ')[0].toLowerCase()}.pdf`
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(pdf)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error generando PDF'
    res.status(500).json({ error: msg })
  }
})

export default router
