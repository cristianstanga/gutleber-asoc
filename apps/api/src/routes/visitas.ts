import { Router } from 'express'
import { prisma } from '../index'
import { sendText } from '../services/whatsapp-meta'
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

  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { estado: EstadoVisita.CONFIRMADA, fechaConfirmada: new Date(fechaConfirmada) },
    include: { propiedad: { select: { direccion: true } } },
  })

  const fechaStr = new Date(fechaConfirmada).toLocaleString('es-AR', {
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

  res.json(visita)
})

router.patch('/:id/cancelar', async (req, res) => {
  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { estado: EstadoVisita.CANCELADA },
  })
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
