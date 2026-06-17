import { Router } from 'express'
import { prisma } from '../index'
import { sendText } from '../services/whatsapp-meta'
import { crearEventoVisita, cancelarEventoVisita } from '../services/google-calendar'
import { EstadoVisita } from '@prisma/client'

const router = Router()

router.get('/', async (req, res) => {
  const { estado } = req.query
  const where: Record<string, unknown> = {}
  if (estado) where.estado = estado

  const visitas = await prisma.visita.findMany({
    where,
    include: {
      propiedad: { select: { id: true, direccion: true } },
      conversacion: { select: { id: true, numero: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(visitas)
})

router.patch('/:id/confirmar', async (req, res) => {
  const { fechaConfirmada } = req.body
  if (!fechaConfirmada) return res.status(400).json({ error: 'fechaConfirmada requerida' })

  const fechaDate = new Date(fechaConfirmada)

  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { estado: EstadoVisita.CONFIRMADA, fechaConfirmada: fechaDate },
    include: { propiedad: { select: { direccion: true } } },
  })

  const fechaStr = fechaDate.toLocaleString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit',
  })

  const msg =
    `¡Hola ${visita.nombreContacto}! 👋\n\n` +
    `Tu visita a *${visita.propiedad?.direccion || 'la propiedad'}* quedó confirmada para:\n` +
    `📅 ${fechaStr}\n\n` +
    `Te esperamos. Cualquier consulta, escribinos.\n` +
    `— *Gutleber & Asoc.*`

  try {
    await sendText(visita.numeroContacto, msg)
  } catch {
    // El envío puede fallar por ventana de 24hs — la visita queda confirmada igual
  }

  // Crear evento en Google Calendar (best-effort: si falla, la visita ya está confirmada)
  const googleEventId = await crearEventoVisita({
    id: visita.id,
    nombreContacto: visita.nombreContacto,
    numeroContacto: visita.numeroContacto,
    fechaConfirmada: fechaDate,
    propiedadDireccion: visita.propiedad?.direccion,
    notas: visita.notas,
  })

  if (googleEventId) {
    await prisma.visita.update({
      where: { id: visita.id },
      data: { googleEventId },
    })
  }

  res.json({ ...visita, googleEventId })
})

router.patch('/:id/cancelar', async (req, res) => {
  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { estado: EstadoVisita.CANCELADA },
  })

  // Eliminar evento de Google Calendar si existe
  if (visita.googleEventId) {
    await cancelarEventoVisita(visita.googleEventId)
    await prisma.visita.update({
      where: { id: visita.id },
      data: { googleEventId: null },
    })
  }

  res.json(visita)
})

router.patch('/:id', async (req, res) => {
  const { notas, estado } = req.body
  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { ...(notas !== undefined ? { notas } : {}), ...(estado ? { estado } : {}) },
  })
  res.json(visita)
})

export default router
