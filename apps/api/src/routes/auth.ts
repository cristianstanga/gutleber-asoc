import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'
import { authMiddleware, AuthRequest } from '../middleware/auth'

const router = Router()

router.post('/login', async (req, res) => {
  const { email, password } = req.body
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña requeridos' })
  }

  const usuario = await prisma.usuario.findUnique({ where: { email } })
  if (!usuario || !usuario.activo) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const ok = await bcrypt.compare(password, usuario.password)
  if (!ok) {
    return res.status(401).json({ error: 'Credenciales inválidas' })
  }

  const token = jwt.sign(
    { sub: usuario.id, email: usuario.email, rol: usuario.rol, personaId: usuario.personaId },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  )

  res.json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: usuario.rol,
      personaId: usuario.personaId,
    },
  })
})

router.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

router.get('/me', authMiddleware, async (req: AuthRequest, res) => {
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.userId },
    select: { id: true, nombre: true, email: true, rol: true, personaId: true, activo: true },
  })
  if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' })
  res.json(usuario)
})

// Solo disponible cuando no hay ningún usuario — crea el primer admin
router.post('/setup', async (req, res) => {
  const count = await prisma.usuario.count()
  if (count > 0) {
    return res.status(403).json({ error: 'El sistema ya tiene usuarios configurados' })
  }
  const { nombre, email, password } = req.body
  if (!nombre || !email || !password) {
    return res.status(400).json({ error: 'nombre, email y password son requeridos' })
  }
  const hash = await bcrypt.hash(password, 12)
  const usuario = await prisma.usuario.create({
    data: { nombre, email, password: hash, rol: 'ADMIN' },
    select: { id: true, nombre: true, email: true, rol: true },
  })
  res.status(201).json(usuario)
})

export default router
