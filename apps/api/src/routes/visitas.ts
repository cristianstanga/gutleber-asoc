import { Router } from 'express'
import { prisma } from '../index'
import { sendText } from '../services/whatsapp-meta'
import { crearEventoVisita, cancelarEventoVisita } from '../services/google-calendar'
import { turnosDisponibles, todosLosTurnos, formatearHoras } from '../services/disponibilidad'
import { EstadoVisita } from '@prisma/client'
import { requireAdmin } from '../middleware/auth'

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

// GET /visitas/disponibilidad?fecha=YYYY-MM-DD
router.get('/disponibilidad', async (req, res) => {
  const { fecha } = req.query
  if (!fecha || typeof fecha !== 'string') return res.status(400).json({ error: 'fecha requerida (YYYY-MM-DD)' })
  const disponibles = await turnosDisponibles(fecha)
  const todos = todosLosTurnos(fecha)
  res.json({
    fecha,
    todos: todos.map(s => s.toISOString()),
    disponibles: disponibles.map(s => s.toISOString()),
  })
})

// GET /visitas/bloqueados?fecha=YYYY-MM-DD
router.get('/bloqueados', async (req, res) => {
  const { fecha } = req.query
  if (!fecha || typeof fecha !== 'string') return res.status(400).json({ error: 'fecha requerida' })
  const [y, m, d] = fecha.split('-').map(Number)
  const inicio = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0))
  const fin    = new Date(Date.UTC(y, m - 1, d, 26, 59, 59, 999))
  const bloqueados = await prisma.turnoBloqueado.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    orderBy: { fecha: 'asc' },
  })
  res.json(bloqueados)
})

// POST /visitas/bloquear  body: { fecha: ISO, motivo? }
router.post('/bloquear', async (req, res) => {
  const { fecha, motivo } = req.body
  if (!fecha) return res.status(400).json({ error: 'fecha requerida' })
  const turno = await prisma.turnoBloqueado.create({
    data: { fecha: new Date(fecha), motivo: motivo || null },
  })
  res.json(turno)
})

// DELETE /visitas/bloquear/:id
router.delete('/bloquear/:id', requireAdmin, async (req, res) => {
  await prisma.turnoBloqueado.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
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
    timeZone: 'America/Argentina/Buenos_Aires',
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

  const googleEventId = await crearEventoVisita({
    id: visita.id,
    nombreContacto: visita.nombreContacto,
    numeroContacto: visita.numeroContacto,
    fechaConfirmada: fechaDate,
    propiedadDireccion: visita.propiedad?.direccion,
    notas: visita.notas,
  })

  if (googleEventId) {
    await prisma.visita.update({ where: { id: visita.id }, data: { googleEventId } })
  }

  res.json({ ...visita, googleEventId })
})

router.patch('/:id/cancelar', async (req, res) => {
  const visita = await prisma.visita.update({
    where: { id: req.params.id },
    data: { estado: EstadoVisita.CANCELADA },
  })

  if (visita.googleEventId) {
    await cancelarEventoVisita(visita.googleEventId)
    await prisma.visita.update({ where: { id: visita.id }, data: { googleEventId: null } })
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
