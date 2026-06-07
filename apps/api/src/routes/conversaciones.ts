import { Router } from 'express'
import { prisma } from '../index'
import { sendText } from '../services/whatsapp-meta'

const router = Router()

// Lista de conversaciones (ordenadas por último mensaje)
router.get('/', async (_req, res) => {
  const convs = await prisma.conversacion.findMany({
    include: {
      persona: true,
      propiedadInteres: { select: { id: true, direccion: true } },
      mensajes: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { mensaje: true, tipo: true, createdAt: true },
      },
      _count: { select: { mensajes: { where: { leido: false, tipo: 'ENTRANTE' } } } },
    },
    orderBy: { ultimoMensaje: 'desc' },
  })
  res.json(convs)
})

// Detalle de conversación con todos los mensajes
router.get('/:id', async (req, res) => {
  const conv = await prisma.conversacion.findUnique({
    where: { id: req.params.id },
    include: {
      persona: true,
      propiedadInteres: true,
      mensajes: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  // Marcar mensajes como leídos
  await prisma.inboxItem.updateMany({
    where: { conversacionId: req.params.id, leido: false },
    data: { leido: true },
  })

  res.json(conv)
})

// Enviar mensaje manual desde el sistema
router.post('/:id/mensaje', async (req, res) => {
  const { mensaje } = req.body
  const conv = await prisma.conversacion.findUnique({ where: { id: req.params.id } })
  if (!conv) return res.status(404).json({ error: 'Conversación no encontrada' })

  // Si el jid es @lid, preferir telefonoReal (phone JID real) para evitar 463
  const destinatario = (conv.jid?.endsWith('@lid') && conv.telefonoReal)
    ? conv.telefonoReal
    : (conv.jid || conv.numero)
  try {
    await sendText(destinatario, mensaje)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return res.status(500).json({ error: `Error WA: ${msg}` })
  }

  const item = await prisma.inboxItem.create({
    data: {
      canal: 'WHATSAPP',
      mensaje,
      tipo: 'SALIENTE',
      numero: conv.numero,
      conversacionId: conv.id,
      personaId: conv.personaId,
      leido: true,
    },
  })

  await prisma.conversacion.update({
    where: { id: conv.id },
    data: { ultimoMensaje: new Date() },
  })

  res.status(201).json(item)
})

// Actualizar datos de la conversación (etapa, notas, vincular persona)
router.patch('/:id', async (req, res) => {
  const { etapa, notas, personaId, propiedadInteresId } = req.body
  const conv = await prisma.conversacion.update({
    where: { id: req.params.id },
    data: {
      ...(etapa ? { etapa } : {}),
      ...(notas !== undefined ? { notas } : {}),
      ...(personaId !== undefined ? { personaId } : {}),
      ...(propiedadInteresId !== undefined ? { propiedadInteresId } : {}),
    },
    include: { persona: true, propiedadInteres: true },
  })
  res.json(conv)
})

// Eliminar conversación (y todos sus mensajes por cascade)
router.delete('/:id', async (req, res) => {
  try {
    // Primero borrar InboxItems (no hay cascade automático en Prisma sin onDelete)
    await prisma.inboxItem.deleteMany({ where: { conversacionId: req.params.id } })
    await prisma.conversacion.delete({ where: { id: req.params.id } })
    res.json({ ok: true })
  } catch {
    res.status(404).json({ error: 'Conversación no encontrada' })
  }
})

// Resumen: total no leídos
router.get('/resumen/noLeidos', async (_req, res) => {
  const count = await prisma.inboxItem.count({ where: { leido: false, tipo: 'ENTRANTE' } })
  res.json({ count })
})

export default router
