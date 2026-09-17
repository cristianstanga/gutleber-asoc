import { Router } from 'express'
import { prisma } from '../index'

const router = Router()

export const CLAVES_CONFIG = {
  REQUISITOS_ALQUILER: 'requisitos_alquiler',
  HORARIOS_ATENCION: 'horarios_atencion',
  // Sitio público (institucional)
  CONTACTO_TELEFONO: 'contacto_telefono',
  CONTACTO_WHATSAPP: 'contacto_whatsapp',
  CONTACTO_EMAIL: 'contacto_email',
  INSTAGRAM_USUARIO: 'instagram_usuario',
  TEXTO_NOSOTROS: 'texto_nosotros',
  TEXTO_SERVICIOS: 'texto_servicios',
} as const

export const DEFAULTS: Record<string, string> = {
  [CLAVES_CONFIG.REQUISITOS_ALQUILER]:
    'DNI vigente. Últimos 3 recibos de sueldo (o constancia de ingresos si es monotributista/autónomo). Garantía propietaria (escritura de inmueble libre de deuda en Misiones) o seguro de caución. Referencias personales y laborales.',
  [CLAVES_CONFIG.HORARIOS_ATENCION]:
    'Lunes a viernes de 9 a 18hs, sábados de 9 a 13hs. No se coordinan visitas domingos ni feriados.',
  [CLAVES_CONFIG.CONTACTO_TELEFONO]: '+54 9 3765 41-0765',
  [CLAVES_CONFIG.CONTACTO_WHATSAPP]: '5493765410765',
  [CLAVES_CONFIG.CONTACTO_EMAIL]: '',
  [CLAVES_CONFIG.INSTAGRAM_USUARIO]: 'gutleberasociados',
  [CLAVES_CONFIG.TEXTO_NOSOTROS]: '',
  [CLAVES_CONFIG.TEXTO_SERVICIOS]: '',
}

router.get('/', async (_req, res) => {
  const items = await prisma.configSistema.findMany()
  const mapa: Record<string, string> = { ...DEFAULTS }
  for (const item of items) mapa[item.clave] = item.valor
  res.json(mapa)
})

router.put('/:clave', async (req, res) => {
  const { valor } = req.body
  if (typeof valor !== 'string') return res.status(400).json({ error: 'valor debe ser texto' })

  const item = await prisma.configSistema.upsert({
    where: { clave: req.params.clave },
    update: { valor },
    create: { clave: req.params.clave, valor },
  })
  res.json(item)
})

export default router
