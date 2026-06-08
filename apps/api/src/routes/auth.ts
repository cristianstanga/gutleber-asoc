import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../index'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { sendPasswordResetEmail } from '../services/email'

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

// Solicitar reset de contraseña — siempre responde 200 (no revela si el email existe)
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'Email requerido' })

  res.json({ ok: true, message: 'Si el email existe, recibirás las instrucciones.' })

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    if (!usuario || !usuario.activo) return

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

    await prisma.passwordResetToken.create({ data: { email, token, expiresAt } })
    await sendPasswordResetEmail(email, token)
  } catch (err) {
    // Error silencioso — el cliente ya recibió 200
    console.error('forgot-password error:', err)
  }
})

// Confirmar reset — verifica token y actualiza password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body
  if (!token || !password) {
    return res.status(400).json({ error: 'Token y contraseña requeridos' })
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres' })
  }

  const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } })
  if (!resetToken) return res.status(400).json({ error: 'Token inválido' })
  if (resetToken.usedAt) return res.status(400).json({ error: 'El token ya fue usado' })
  if (resetToken.expiresAt < new Date()) return res.status(400).json({ error: 'El token expiró' })

  const hash = await bcrypt.hash(password, 12)
  await prisma.usuario.update({ where: { email: resetToken.email }, data: { password: hash } })
  await prisma.passwordResetToken.update({ where: { token }, data: { usedAt: new Date() } })

  res.json({ ok: true, message: 'Contraseña actualizada correctamente' })
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
