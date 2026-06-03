import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  userEmail?: string
  userRol?: string
  userPersonaId?: string | null
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token requerido' })
  }
  const token = header.slice(7)
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET!) as {
      sub: string
      email: string
      rol: string
      personaId?: string | null
    }
    req.userId = payload.sub
    req.userEmail = payload.email
    req.userRol = payload.rol
    req.userPersonaId = payload.personaId ?? null
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' })
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.userRol !== 'ADMIN') {
    return res.status(403).json({ error: 'Se requiere rol de administrador' })
  }
  next()
}

export function requireAdminOrOperador(req: AuthRequest, res: Response, next: NextFunction) {
  if (!['ADMIN', 'OPERADOR'].includes(req.userRol ?? '')) {
    return res.status(403).json({ error: 'Acceso no autorizado' })
  }
  next()
}
