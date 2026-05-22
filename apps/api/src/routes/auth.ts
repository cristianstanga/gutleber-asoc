import { Router } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../index'

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
    { sub: usuario.id, email: usuario.email },
    process.env.JWT_SECRET as string,
    { expiresIn: '7d' }
  )

  res.json({ token, usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email } })
})

router.post('/logout', (_req, res) => {
  res.json({ ok: true })
})

export default router
