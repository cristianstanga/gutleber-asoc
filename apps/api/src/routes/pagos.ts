import { Router } from 'express'
import { prisma } from '../index'
import { EstadoPago } from '@prisma/client'
import {
  generarReciboPDF, generarLiquidacionPDF,
  DatosRecibo, DatosLiquidacion, ConceptoExtra,
} from '../services/pdf'
import { sendPDF, sendText } from '../services/whatsapp'
import { sendText as sendMetaText, sendTemplate, sendPDF as sendMetaPDF } from '../services/whatsapp-meta'

const router = Router()

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function contarRecibos() {
  return prisma.pago.count({ where: { nroRecibo: { not: null } } })
}

async function buildDatosRecibo(pagoId: string): Promise<DatosRecibo | null> {
  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: {
      persona: true,
      propiedad: true,
      vinculo: { include: { propiedad: true, persona: true } },
    },
  })
  if (!pago || !pago.persona || !pago.propiedad) return null

  // Buscar propietario: vínculo ADMINISTRACION en la misma propiedad
  let propietarioNombre = 'GUTLEBER y asoc.'
  if (pago.propiedadId) {
    const vAdmin = await prisma.vinculo.findFirst({
      where: { propiedadId: pago.propiedadId, tipo: 'ADMINISTRACION', activo: true },
      include: { persona: true },
    })
    if (vAdmin?.persona) {
      propietarioNombre = `${vAdmin.persona.nombre} ${vAdmin.persona.apellido}`.toUpperCase()
    }
  }

  // Número de pago dentro del contrato
  let nroPago = 1, totalPagos = 24
  if (pago.vinculoId) {
    const pagosContrato = await prisma.pago.findMany({
      where: { vinculoId: pago.vinculoId, tipo: 'ALQUILER' },
      orderBy: { fechaVencimiento: 'asc' },
      select: { id: true },
    })
    const idx = pagosContrato.findIndex(p => p.id === pagoId)
    nroPago = idx >= 0 ? idx + 1 : 1
    totalPagos = pago.vinculo?.periodicidad
      ? Math.ceil(/* 24 meses */ 24 / 1)
      : pagosContrato.length || 12
    if (pago.vinculo?.fechaInicio && pago.vinculo?.fechaFin) {
      const meses = Math.round(
        (new Date(pago.vinculo.fechaFin).getTime() - new Date(pago.vinculo.fechaInicio).getTime())
        / (30.44 * 24 * 60 * 60 * 1000)
      )
      totalPagos = meses || 12
    }
  }

  // Mes legible
  const fechaRef = pago.fechaPago || pago.fechaVencimiento
  const mes = new Date(fechaRef).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)

  const extras = (pago.conceptosExtra as ConceptoExtra[] | null) || []
  const total = pago.totalConExtras ?? pago.monto

  return {
    nroRecibo: pago.nroRecibo,
    fechaPago: pago.fechaPago || pago.fechaVencimiento,
    inquilino: {
      nombre: pago.persona.nombre,
      apellido: pago.persona.apellido,
      dni: pago.persona.dni,
      iva: 'Consumidor Final',
    },
    contrato: {
      inicio: pago.vinculo?.fechaInicio || pago.fechaVencimiento,
      fin: pago.vinculo?.fechaFin,
      pago: nroPago,
      totalPagos,
    },
    propiedad: { direccion: pago.propiedad.direccion },
    propietario: propietarioNombre,
    mes: mesCap,
    alquiler: pago.monto,
    conceptosExtra: extras,
    totalRecibo: total,
    formaPago: pago.formaPago || 'Efectivo',
  }
}

async function buildDatosLiquidacion(pagoId: string): Promise<DatosLiquidacion | null> {
  const pago = await prisma.pago.findUnique({
    where: { id: pagoId },
    include: {
      persona: true,
      propiedad: true,
      vinculo: { select: { fechaInicio: true, fechaFin: true, honorariosPct: true } },
    },
  })
  if (!pago || !pago.propiedad) return null

  // Propietario: vínculo ADMINISTRACION en la misma propiedad
  let propietario = {
    nombre: 'GUTLEBER', apellido: 'y asoc.',
    cuit: null as string | null,
    iva: 'Responsable Monotributo' as string | null,
    direccion: null as string | null,
  }
  if (pago.propiedadId) {
    const vAdmin = await prisma.vinculo.findFirst({
      where: { propiedadId: pago.propiedadId, tipo: 'ADMINISTRACION', activo: true },
      include: { persona: true },
    })
    if (vAdmin?.persona) {
      propietario = {
        nombre: vAdmin.persona.nombre,
        apellido: vAdmin.persona.apellido,
        cuit: null,
        iva: 'Responsable Monotributo',
        direccion: null,
      }
    }
  }

  // Número de pago en el contrato
  let nroPago = 1, totalPagos = 12
  if (pago.vinculoId) {
    const pagosContrato = await prisma.pago.findMany({
      where: { vinculoId: pago.vinculoId, tipo: 'ALQUILER' },
      orderBy: { fechaVencimiento: 'asc' },
      select: { id: true },
    })
    const idx = pagosContrato.findIndex(p => p.id === pagoId)
    nroPago = idx >= 0 ? idx + 1 : 1
    if (pago.vinculo?.fechaInicio && pago.vinculo?.fechaFin) {
      const meses = Math.round(
        (new Date(pago.vinculo.fechaFin).getTime() - new Date(pago.vinculo.fechaInicio).getTime())
        / (30.44 * 24 * 60 * 60 * 1000)
      )
      totalPagos = meses || 12
    }
  }

  const fechaRef = pago.fechaPago || pago.fechaVencimiento
  const mes = new Date(fechaRef).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  const mesCap = mes.charAt(0).toUpperCase() + mes.slice(1)
  const total = pago.totalConExtras ?? pago.monto

  // Honorarios del vínculo (default 8)
  const honorariosPct = pago.vinculo?.honorariosPct ?? 8

  const conceptosInquilino = (pago.conceptosExtra as { descripcion: string; monto: number; esInmobiliaria?: boolean }[] | null) || []

  return {
    nroLiquidacion: pago.nroRecibo,
    fechaLiquidacion: pago.fechaPago || pago.fechaVencimiento,
    propietario,
    propiedad: { descripcion: pago.propiedad.direccion },
    mes: mesCap,
    pago: nroPago,
    totalPagos,
    alquilerBase: pago.monto,
    totalLiquidacion: total,
    honorariosPct,
    gastos: [],
    conceptosInquilino,
    formaPago: pago.formaPago || 'Efectivo',
  }
}

// ─── Rutas ────────────────────────────────────────────────────────────────────

router.get('/', async (req, res) => {
  const { estado, propiedadId, personaId, periodo, vinculoId } = req.query
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (propiedadId) where.propiedadId = propiedadId
  if (personaId) where.personaId = personaId
  if (periodo) where.periodo = periodo
  if (vinculoId) where.vinculoId = vinculoId

  const pagos = await prisma.pago.findMany({
    where,
    include: { persona: true, propiedad: true, vinculo: true },
    orderBy: { fechaVencimiento: 'desc' },
  })
  res.json(pagos)
})

router.get('/:id', async (req, res) => {
  const pago = await prisma.pago.findUnique({
    where: { id: req.params.id },
    include: { persona: true, propiedad: true, vinculo: true },
  })
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' })
  res.json(pago)
})

router.post('/', async (req, res) => {
  try {
    const {
      vinculoId, propiedadId, personaId, tipo, concepto, monto, moneda,
      periodo, fechaVencimiento, formaPago, conceptosExtra, totalConExtras,
    } = req.body

    // Asignar número de recibo secuencial
    const totalRecibos = await contarRecibos()
    const nroRecibo = totalRecibos + 1001 // offset para arrancar desde 1001

    const pago = await prisma.pago.create({
      data: {
        tipo, concepto, monto, moneda, periodo,
        fechaVencimiento: new Date(fechaVencimiento),
        formaPago: formaPago || 'Efectivo',
        conceptosExtra: conceptosExtra || [],
        totalConExtras: totalConExtras || monto,
        nroRecibo,
        vinculoId, propiedadId, personaId,
        estado: EstadoPago.PENDIENTE,
      },
      include: { persona: true, propiedad: true, vinculo: true },
    })
    res.status(201).json(pago)
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Error creando pago' })
  }
})

// Marcar como pagado (con forma de pago y extras si no se cargaron antes)
router.patch('/:id/marcar-pagado', async (req, res) => {
  const { formaPago, conceptosExtra, totalConExtras } = req.body
  const data: Record<string, unknown> = {
    estado: EstadoPago.PAGADO,
    fechaPago: new Date(),
  }
  if (formaPago) data.formaPago = formaPago
  if (conceptosExtra) data.conceptosExtra = conceptosExtra
  if (totalConExtras) data.totalConExtras = totalConExtras

  // Asignar nroRecibo si no tiene
  const current = await prisma.pago.findUnique({ where: { id: req.params.id } })
  if (current && !current.nroRecibo) {
    const total = await contarRecibos()
    data.nroRecibo = total + 1001
  }

  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data,
    include: {
      persona: true,
      propiedad: { include: { propietario: true } },
    },
  })
  res.json(pago)

  // Notificar al propietario que se cobró — sin bloquear la respuesta
  if (pago.tipo === 'ALQUILER' && pago.propiedadId) {
    const vAdmin = await prisma.vinculo.findFirst({
      where: { propiedadId: pago.propiedadId, tipo: 'ADMINISTRACION', activo: true },
      include: { persona: true },
    })
    const tel = vAdmin?.persona?.whatsapp
    if (tel) {
      const nombre = vAdmin!.persona!.nombre
      const montoTotal = pago.totalConExtras ?? pago.monto
      const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
      const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
      const dir = pago.propiedad?.direccion ?? ''
      sendTemplate(tel, 'gutleber_pago_cobrado', [nombre, dir, fecha, fmt(montoTotal)])
        .catch(() => {
          // Template pendiente de aprobación — fallback texto libre (ventana 24hs)
          const msg =
            `✅ *Hola ${nombre}, se cobró el alquiler*\n\n` +
            `📍 ${dir}\n📅 ${fecha}\n💰 *${fmt(montoTotal)}*\n\n` +
            `En breve procesamos la liquidación.\n_Gutleber & Asoc._`
          sendMetaText(tel, msg).catch(() => {})
        })
    }
  }
})

// Marcar pagado al propietario (liquidación enviada)
router.patch('/:id/pagar-propietario', async (req, res) => {
  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data: { pagadoAlPropietario: true, fechaPagoPropietario: new Date() },
    include: {
      propiedad: true,
      vinculo: { select: { honorariosPct: true } },
    },
  })
  res.json(pago)

  // Notificar al propietario vía WhatsApp
  if (pago.propiedadId) {
    const vAdmin = await prisma.vinculo.findFirst({
      where: { propiedadId: pago.propiedadId, tipo: 'ADMINISTRACION', activo: true },
      include: { persona: true },
    })
    const tel = vAdmin?.persona?.whatsapp
    if (tel) {
      const honorariosPct = pago.vinculo?.honorariosPct ?? 8
      const conceptos = (pago.conceptosExtra as ConceptoExtra[] | null) ?? []
      const extrasParaProp = conceptos.filter(c => !c.esInmobiliaria).reduce((s, c) => s + c.monto, 0)
      const honorarios = Math.round(pago.monto * honorariosPct / 100)
      const totalTransferir = (pago.monto - honorarios) + extrasParaProp
      const fmt = (n: number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)
      const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
      const nombre = vAdmin!.persona!.nombre
      const dir = pago.propiedad?.direccion ?? ''
      sendTemplate(tel, 'gutleber_transferencia', [nombre, dir, fecha, fmt(pago.monto), String(honorariosPct), fmt(honorarios), fmt(totalTransferir)])
        .catch(() => {
          // Template pendiente de aprobación — fallback texto libre (ventana 24hs)
          const msg =
            `💸 *Hola ${nombre}, transferencia procesada*\n\n` +
            `📍 ${dir}\n📅 ${fecha}\n\n` +
            `Alquiler: ${fmt(pago.monto)}\nHonorarios (${honorariosPct}%): -${fmt(honorarios)}\n` +
            `━━━━━━━━━━━\n*Total transferido: ${fmt(totalTransferir)}*\n\n_Gutleber & Asoc._`
          sendMetaText(tel, msg).catch(() => {})
        })
    }
  }
})

// Revertir cobro al inquilino (vuelve a PENDIENTE para poder re-cobrarlo)
router.patch('/:id/revertir-cobro', async (req, res) => {
  const current = await prisma.pago.findUnique({ where: { id: req.params.id } })
  if (!current) return res.status(404).json({ error: 'Pago no encontrado' })
  if (current.pagadoAlPropietario) return res.status(400).json({ error: 'Ya transferido al propietario — no se puede revertir' })
  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data: {
      estado: EstadoPago.PENDIENTE,
      fechaPago: null,
      formaPago: null,
      conceptosExtra: [],
      totalConExtras: null,
      comprobanteEnviado: false,
      nroRecibo: null,
    },
  })
  res.json(pago)
})

// Revertir pago al propietario (si se registró por error)
router.patch('/:id/revertir-pago-propietario', async (req, res) => {
  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data: { pagadoAlPropietario: false, fechaPagoPropietario: null },
  })
  res.json(pago)
})

router.patch('/:id/anular', async (req, res) => {
  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data: { estado: EstadoPago.ANULADO },
  })
  res.json(pago)
})

// ─── PDF Recibo al inquilino ──────────────────────────────────────────────────

router.get('/:id/recibo', async (req, res) => {
  const datos = await buildDatosRecibo(req.params.id)
  if (!datos) return res.status(404).json({ error: 'Pago no encontrado o sin datos suficientes' })

  try {
    const buffer = await generarReciboPDF(datos)
    const filename = `recibo-${datos.nroRecibo || req.params.id}.pdf`
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error generando recibo' })
  }
})

// Alias legacy /pdf → /recibo
router.get('/:id/pdf', async (req, res) => {
  res.redirect(`/api/pagos/${req.params.id}/recibo`)
})

// ─── PDF Liquidación al propietario ──────────────────────────────────────────
// Acepta POST con body { honorariosPct?, gastosIds?, gastosExtra? }
// o GET sin parámetros (usa honorarios del vínculo)

router.post('/:id/liquidacion', async (req, res) => {
  const datos = await buildDatosLiquidacion(req.params.id)
  if (!datos) return res.status(404).json({ error: 'Pago no encontrado o sin datos suficientes' })

  // Override de honorarios
  if (req.body.honorariosPct !== undefined) {
    datos.honorariosPct = Number(req.body.honorariosPct)
  }

  // Gastos a incluir: pueden venir como array { descripcion, monto }
  const gastosExtra: { descripcion: string; monto: number }[] = req.body.gastosExtra || []

  // Si vienen IDs de gastos del sistema, los marcamos como APLICADO
  const gastosIds: string[] = req.body.gastosIds || []
  if (gastosIds.length > 0) {
    const gastosDB = await prisma.gasto.findMany({ where: { id: { in: gastosIds } } })
    for (const g of gastosDB) {
      gastosExtra.push({ descripcion: g.descripcion, monto: g.monto })
    }
    // Marcar como aplicados
    await prisma.gasto.updateMany({
      where: { id: { in: gastosIds } },
      data: { estado: 'APLICADO', pagoId: req.params.id },
    })
  }

  datos.gastos = gastosExtra

  try {
    const buffer = await generarLiquidacionPDF(datos)
    const filename = `liquidacion-${datos.nroLiquidacion || req.params.id}.pdf`
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error generando liquidación' })
  }
})

// GET legacy (sin gastos ni override)
router.get('/:id/liquidacion', async (req, res) => {
  const datos = await buildDatosLiquidacion(req.params.id)
  if (!datos) return res.status(404).json({ error: 'Pago no encontrado o sin datos suficientes' })
  datos.gastos = []
  try {
    const buffer = await generarLiquidacionPDF(datos)
    const filename = `liquidacion-${datos.nroLiquidacion || req.params.id}.pdf`
    res.set('Content-Type', 'application/pdf')
    res.set('Content-Disposition', `attachment; filename="${filename}"`)
    res.send(buffer)
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error generando liquidación' })
  }
})

// ─── Enviar recibo por WhatsApp ───────────────────────────────────────────────

router.post('/:id/enviar-whatsapp', async (req, res) => {
  const pago = await prisma.pago.findUnique({
    where: { id: req.params.id },
    include: { persona: true, propiedad: true },
  })
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' })
  if (!pago.persona?.whatsapp) return res.status(400).json({ error: 'El inquilino no tiene WhatsApp registrado' })

  const datos = await buildDatosRecibo(req.params.id)
  if (!datos) return res.status(400).json({ error: 'No se pudieron obtener los datos del recibo' })

  try {
    const buffer = await generarReciboPDF(datos)
    const saludo =
      `Hola ${pago.persona.nombre}, le enviamos el comprobante de pago correspondiente ` +
      `al período ${pago.periodo || ''} de *${pago.propiedad?.direccion || ''}*. ¡Gracias!`
    await sendMetaText(pago.persona.whatsapp, saludo)
    await sendMetaPDF(pago.persona.whatsapp, buffer, `Recibo ${pago.periodo || pago.id}.pdf`)

    await prisma.pago.update({ where: { id: pago.id }, data: { comprobanteEnviado: true } })
    await prisma.inboxItem.create({
      data: {
        canal: 'WHATSAPP',
        mensaje: `Recibo enviado: ${pago.concepto}`,
        tipo: 'SALIENTE',
        personaId: pago.personaId || undefined,
        propiedadId: pago.propiedadId || undefined,
      },
    })
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Error enviando' })
  }
})

export default router
