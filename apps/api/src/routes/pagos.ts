import { Router } from 'express'
import { prisma } from '../index'
import { EstadoPago } from '@prisma/client'
import { generarReciboPDF } from '../services/pdf'
import { sendPDF, sendText } from '../services/whatsapp'

const router = Router()

router.get('/', async (req, res) => {
  const { estado, propiedadId, personaId, periodo } = req.query
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado
  if (propiedadId) where.propiedadId = propiedadId
  if (personaId) where.personaId = personaId
  if (periodo) where.periodo = periodo

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
  const pago = await prisma.pago.create({ data: req.body })
  res.status(201).json(pago)
})

router.patch('/:id/marcar-pagado', async (req, res) => {
  const pago = await prisma.pago.update({
    where: { id: req.params.id },
    data: { estado: EstadoPago.PAGADO, fechaPago: new Date() },
    include: { persona: true, propiedad: true },
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

// Descargar recibo PDF
router.get('/:id/pdf', async (req, res) => {
  const pago = await prisma.pago.findUnique({
    where: { id: req.params.id },
    include: { persona: true, propiedad: true },
  })
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' })

  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="recibo-${pago.periodo || pago.id}.pdf"`)
  const pdfStream = generarReciboPDF(pago as Parameters<typeof generarReciboPDF>[0])
  pdfStream.pipe(res)
})

// Enviar recibo por WhatsApp
router.post('/:id/enviar-whatsapp', async (req, res) => {
  const pago = await prisma.pago.findUnique({
    where: { id: req.params.id },
    include: { persona: true, propiedad: true },
  })
  if (!pago) return res.status(404).json({ error: 'Pago no encontrado' })
  if (!pago.persona?.whatsapp) return res.status(400).json({ error: 'El inquilino no tiene WhatsApp registrado' })

  const telefono = pago.persona.whatsapp

  const saludo = `Hola ${pago.persona.nombre}, le enviamos el comprobante de pago correspondiente al período ${pago.periodo || ''} de la propiedad ${pago.propiedad?.direccion || ''}. ¡Gracias!`
  await sendText(telefono, saludo)

  const pdfStream = generarReciboPDF(pago as Parameters<typeof generarReciboPDF>[0])
  const chunks: Buffer[] = []
  pdfStream.on('data', (c: Buffer) => chunks.push(c))
  await new Promise((resolve, reject) => {
    pdfStream.on('end', resolve)
    pdfStream.on('error', reject)
  })
  const pdfBuffer = Buffer.concat(chunks)
  await sendPDF(telefono, pdfBuffer, `Recibo ${pago.periodo || pago.id}.pdf`)

  await prisma.pago.update({ where: { id: req.params.id }, data: { comprobanteEnviado: true } })

  // Guardar en inbox
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
})

export default router
