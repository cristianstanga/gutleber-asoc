import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../index'
import { AuthRequest } from '../middleware/auth'

const router = Router()

router.get('/', async (_req, res) => {
  const usuarios = await prisma.usuario.findMany({
    orderBy: { nombre: 'asc' },
    select: {
      id: true, nombre: true, email: true, rol: true, activo: true, personaId: true,
      persona: { select: { id: true, nombre: true, apellido: true } },
    },
  })
  res.json(usuarios)
})

router.post('/', async (req, res) => {
  const { nombre, email, password, rol, personaId } = req.body
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos' })
  }
  const existe = await prisma.usuario.findUnique({ where: { email } })
  if (existe) return res.status(409).json({ error: 'Ya existe un usuario con ese email' })

  const hash = await bcrypt.hash(password, 12)
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password: hash, rol: rol ?? 'OPERADOR', personaId: personaId ?? null },
    select: { id: true, nombre: true, email: true, rol: true, activo: true, personaId: true,
      persona: { select: { id: true, nombre: true, apellido: true } } },
  })
  res.status(201).json(usuario)
})

router.patch('/:id', async (req: AuthRequest, res) => {
  const { nombre, email, password, rol, activo, personaId } = req.body

  // Operador no puede cambiar su propio rol ni el de admins
  if (req.userRol === 'OPERADOR' && (rol || activo !== undefined)) {
    return res.status(403).json({ error: 'Sin permiso para modificar rol o estado' })
  }

  const data: Record<string, unknown> = {}
  if (nombre !== undefined) data.nombre = nombre
  if (email !== undefined) data.email = email
  if (rol !== undefined) data.rol = rol
  if (activo !== undefined) data.activo = activo
  if (personaId !== undefined) data.personaId = personaId ?? null
  if (password) data.password = await bcrypt.hash(password, 12)

  const usuario = await prisma.usuario.update({
    where: { id: req.params.id },
    data,
    select: { id: true, nombre: true, email: true, rol: true, activo: true, personaId: true,
      persona: { select: { id: true, nombre: true, apellido: true } } },
  })
  res.json(usuario)
})

export default router
