import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../index'
import { upload, uploadVideo, getPublicUrl } from '../services/upload'
import { publicarPropiedad } from '../services/instagram'
import { generarTarjeta } from '../services/tarjeta'
import { sendImage } from '../services/whatsapp'
import { AuthRequest, requireAdmin } from '../middleware/auth'

const router = Router()

const includeCompleto = {
  imagenes: { orderBy: { orden: 'asc' as const } },
  videos: { orderBy: { orden: 'asc' as const } },
  vinculos: { where: { activo: true }, include: { persona: true } },
  propietario: true,
  _count: { select: { pagos: true } },
}

// Vista propietario — sus propiedades con pagos y vínculos activos
router.get('/mis', async (req: AuthRequest, res) => {
  if (!req.userPersonaId) return res.status(400).json({ error: 'Sin persona vinculada a este usuario' })
  const props = await prisma.propiedad.findMany({
    where: { propietarioId: req.userPersonaId },
    include: {
      imagenes: { orderBy: { orden: 'asc' } },
      vinculos: { where: { activo: true }, include: { persona: true } },
      pagos: {
        where: { tipo: 'ALQUILER' },
        orderBy: { fechaVencimiento: 'desc' },
        take: 6,
      },
      propietario: true,
    },
    orderBy: { createdAt: 'desc' },
  })
  res.json(props)
})

// Analytics de una propiedad para el propietario
router.get('/:id/analytics', async (req: AuthRequest, res) => {
  const propiedadId = req.params.id

  // Verificar que la propiedad pertenece al propietario (o es admin/operador)
  if (req.userRol === 'PROPIETARIO') {
    const prop = await prisma.propiedad.findUnique({ where: { id: propiedadId }, select: { propietarioId: true } })
    if (prop?.propietarioId !== req.userPersonaId) return res.status(403).json({ error: 'Sin acceso' })
  }

  const vinculo = await prisma.vinculo.findFirst({
    where: { propiedadId, tipo: 'ALQUILER', activo: true },
    select: { id: true, alquilerActual: true, alquilerInicial: true, honorariosPct: true, indice: true, proximaActualizacion: true, personaId: true, fechaInicio: true },
  })

  // Todos los pagos de alquiler de esta propiedad
  const pagos = await prisma.pago.findMany({
    where: { propiedadId, tipo: 'ALQUILER' },
    orderBy: { fechaVencimiento: 'asc' },
  })

  // Demora por mes del inquilino actual
  const demoraPorMes = pagos
    .filter((p) => p.estado === 'PAGADO' && p.fechaPago)
    .map((p) => {
      const venc = new Date(p.fechaVencimiento)
      const pago = new Date(p.fechaPago!)
      const dias = Math.max(0, Math.round((pago.getTime() - venc.getTime()) / 86400000))
      return {
        mes: venc.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }),
        diasDemora: dias,
        estado: dias === 0 ? 'ATiempo' : 'Tarde',
        monto: p.monto,
      }
    })

  // Stats del inquilino actual
  const pagadosConFecha = pagos.filter((p) => p.estado === 'PAGADO' && p.fechaPago)
  const diasDemoras = pagadosConFecha.map((p) =>
    Math.max(0, Math.round((new Date(p.fechaPago!).getTime() - new Date(p.fechaVencimiento).getTime()) / 86400000))
  )
  const statsInquilino = {
    totalPagos: pagadosConFecha.length,
    pagadosATiempo: diasDemoras.filter((d) => d === 0).length,
    promedioDiasDemora: diasDemoras.length ? +(diasDemoras.reduce((a, b) => a + b, 0) / diasDemoras.length).toFixed(1) : 0,
    maxDiasDemora: diasDemoras.length ? Math.max(...diasDemoras) : 0,
    enMora: pagos.filter((p) => p.estado === 'MORA').length,
  }

  // Stats globales de todos los inquilinos (comparativo)
  const todosPagos = await prisma.pago.findMany({
    where: { tipo: 'ALQUILER', estado: 'PAGADO', fechaPago: { not: null } },
    select: { fechaVencimiento: true, fechaPago: true, personaId: true },
  })
  const demorasGlobal = todosPagos.map((p) =>
    Math.max(0, Math.round((new Date(p.fechaPago!).getTime() - new Date(p.fechaVencimiento).getTime()) / 86400000))
  )
  const inquilinosUnicos = new Set(todosPagos.map((p) => p.personaId)).size
  const statsGlobal = {
    promedioDiasDemora: demorasGlobal.length ? +(demorasGlobal.reduce((a, b) => a + b, 0) / demorasGlobal.length).toFixed(1) : 0,
    porcentajeATiempo: demorasGlobal.length ? +((demorasGlobal.filter((d) => d === 0).length / demorasGlobal.length) * 100).toFixed(1) : 0,
    totalInquilinos: inquilinosUnicos,
    porcentajeInquilinosConMejorComportamiento: (() => {
      if (!vinculo || diasDemoras.length === 0) return null
      const promedioActual = statsInquilino.promedioDiasDemora
      const promediosPorInquilino: Record<string, number[]> = {}
      todosPagos.forEach((p) => {
        const d = Math.max(0, Math.round((new Date(p.fechaPago!).getTime() - new Date(p.fechaVencimiento).getTime()) / 86400000))
        if (!promediosPorInquilino[p.personaId ?? '']) promediosPorInquilino[p.personaId ?? ''] = []
        promediosPorInquilino[p.personaId ?? ''].push(d)
      })
      const promedios = Object.values(promediosPorInquilino).map((ds) => ds.reduce((a, b) => a + b, 0) / ds.length)
      const mejores = promedios.filter((p) => p > promedioActual).length
      return +(mejores / promedios.length * 100).toFixed(1)
    })(),
  }

  // Flujo de caja mensual (últimos 6 meses + próximos 2)
  const hoy = new Date()
  const flujoCaja = Array.from({ length: 8 }, (_, i) => {
    const d = new Date(hoy)
    d.setMonth(d.getMonth() - 5 + i)
    const mesKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    const pagosMes = pagos.filter((p) => {
      const pv = new Date(p.fechaVencimiento)
      return `${pv.getFullYear()}-${String(pv.getMonth() + 1).padStart(2, '0')}` === mesKey
    })
    const cobrado = pagosMes.filter((p) => p.estado === 'PAGADO').reduce((a, p) => a + p.monto, 0)
    const honorariosPct = vinculo?.honorariosPct ?? 8
    const neto = +(cobrado * (1 - honorariosPct / 100)).toFixed(0)
    const transferido = pagosMes.filter((p) => p.pagadoAlPropietario).reduce((a, p) => a + p.monto * (1 - honorariosPct / 100), 0)
    return { mes: label, cobrado, neto, transferido: +transferido.toFixed(0) }
  })

  // Próximo ajuste
  const proximoAjuste = vinculo?.proximaActualizacion ? {
    fecha: vinculo.proximaActualizacion,
    diasRestantes: Math.max(0, Math.round((new Date(vinculo.proximaActualizacion).getTime() - hoy.getTime()) / 86400000)),
    alquilerActual: vinculo.alquilerActual,
    indice: vinculo.indice,
  } : null

  res.json({ demoraPorMes, statsInquilino, statsGlobal, flujoCaja, proximoAjuste })
})

router.get('/', async (req, res) => {
  const { tipo, enAlquiler, enVenta } = req.query
  const where: Record<string, unknown> = {}
  if (tipo) where.tipo = tipo
  if (enAlquiler !== undefined) where.enAlquiler = enAlquiler === 'true'
  if (enVenta !== undefined) where.enVenta = enVenta === 'true'

  const propiedades = await prisma.propiedad.findMany({
    where,
    include: includeCompleto,
    orderBy: { createdAt: 'desc' },
  })
  res.json(propiedades)
})

router.get('/:id', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: {
      imagenes: { orderBy: { orden: 'asc' } },
      vinculos: { include: { persona: true } },
      pagos: { include: { persona: true }, orderBy: { fechaVencimiento: 'desc' }, take: 20 },
    },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  res.json(prop)
})

router.post('/', async (req, res) => {
  const prop = await prisma.propiedad.create({ data: req.body, include: includeCompleto })
  res.status(201).json(prop)
})

router.put('/:id', async (req, res) => {
  const prop = await prisma.propiedad.update({
    where: { id: req.params.id },
    data: req.body,
    include: includeCompleto,
  })
  res.json(prop)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  // Eliminar archivos físicos de imágenes
  const imagenes = await prisma.propiedadImagen.findMany({ where: { propiedadId: req.params.id } })
  for (const img of imagenes) {
    const filePath = path.join(process.cwd(), 'uploads', img.nombre)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  }
  await prisma.propiedad.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

// ─── Imágenes ─────────────────────────────────────────────────────────────────

router.post('/:id/imagenes', upload.array('imagenes', 10), async (req, res) => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) return res.status(400).json({ error: 'Sin archivos' })

  const existentes = await prisma.propiedadImagen.count({ where: { propiedadId: req.params.id } })

  const creadas = await Promise.all(
    files.map((file, i) =>
      prisma.propiedadImagen.create({
        data: {
          propiedadId: req.params.id,
          url: getPublicUrl(file.filename),
          nombre: file.filename,
          orden: existentes + i,
        },
      })
    )
  )
  res.status(201).json(creadas)
})

router.delete('/:id/imagenes/:imagenId', requireAdmin, async (req: AuthRequest, res) => {
  const imagen = await prisma.propiedadImagen.findUnique({ where: { id: req.params.imagenId } })
  if (!imagen) return res.status(404).json({ error: 'Imagen no encontrada' })

  const filePath = path.join(process.cwd(), 'uploads', imagen.nombre)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.propiedadImagen.delete({ where: { id: req.params.imagenId } })
  res.json({ ok: true })
})

router.patch('/:id/imagenes/reordenar', async (req, res) => {
  const { orden } = req.body as { orden: { id: string; orden: number }[] }
  await Promise.all(orden.map((item) => prisma.propiedadImagen.update({ where: { id: item.id }, data: { orden: item.orden } })))
  res.json({ ok: true })
})

// ─── Videos ───────────────────────────────────────────────────────────────────

router.post('/:id/videos', uploadVideo.array('videos', 5), async (req, res) => {
  const files = req.files as Express.Multer.File[]
  if (!files || files.length === 0) return res.status(400).json({ error: 'Sin archivos de video' })

  const existentes = await prisma.propiedadVideo.count({ where: { propiedadId: req.params.id } })

  const creados = await Promise.all(
    files.map((file, i) =>
      prisma.propiedadVideo.create({
        data: {
          propiedadId: req.params.id,
          url: getPublicUrl(file.filename),
          nombre: file.filename,
          titulo: req.body.titulo || null,
          orden: existentes + i,
        },
      })
    )
  )
  res.status(201).json(creados)
})

router.delete('/:id/videos/:videoId', requireAdmin, async (req: AuthRequest, res) => {
  const video = await prisma.propiedadVideo.findUnique({ where: { id: req.params.videoId } })
  if (!video) return res.status(404).json({ error: 'Video no encontrado' })

  const filePath = path.join(process.cwd(), 'uploads', video.nombre)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.propiedadVideo.delete({ where: { id: req.params.videoId } })
  res.json({ ok: true })
})

// ─── Tarjeta con datos superpuestos ──────────────────────────────────────────

// GET /:id/tarjeta → devuelve la imagen como JPEG (para preview en el sistema)
router.get('/:id/tarjeta', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (prop.imagenes.length === 0)
    return res.status(400).json({ error: 'La propiedad no tiene imágenes para generar tarjeta' })

  try {
    const buffer = await generarTarjeta({
      imagenUrl: prop.imagenes[0].url,
      tipo: prop.tipo,
      direccion: prop.direccion,
      superficie: prop.superficie,
      enAlquiler: prop.enAlquiler,
      enVenta: prop.enVenta,
      alquilerBase: prop.alquilerBase,
      valorVenta: prop.valorVenta,
      descripcion: prop.descripcion,
    })
    res.set('Content-Type', 'image/jpeg')
    res.send(buffer)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error generando tarjeta'
    res.status(500).json({ error: msg })
  }
})

// POST /:id/tarjeta/whatsapp → genera y envía por WhatsApp al número indicado
router.post('/:id/tarjeta/whatsapp', async (req, res) => {
  const { numero } = req.body
  if (!numero) return res.status(400).json({ error: 'Falta el número de WhatsApp destino' })

  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (prop.imagenes.length === 0)
    return res.status(400).json({ error: 'La propiedad no tiene imágenes' })

  try {
    const buffer = await generarTarjeta({
      imagenUrl: prop.imagenes[0].url,
      tipo: prop.tipo,
      direccion: prop.direccion,
      superficie: prop.superficie,
      enAlquiler: prop.enAlquiler,
      enVenta: prop.enVenta,
      alquilerBase: prop.alquilerBase,
      valorVenta: prop.valorVenta,
      descripcion: prop.descripcion,
    })
    await sendImage(numero, buffer, prop.direccion)
    res.json({ ok: true })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error'
    res.status(500).json({ error: msg })
  }
})

// ─── Instagram ────────────────────────────────────────────────────────────────

router.post('/:id/publicar-instagram', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: { imagenes: { orderBy: { orden: 'asc' } } },
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (prop.imagenes.length === 0) return res.status(400).json({ error: 'La propiedad no tiene imágenes' })

  const { captionExtra } = req.body

  const montoStr = prop.enAlquiler && prop.alquilerBase
    ? `💰 Alquiler: $${prop.alquilerBase.toLocaleString('es-AR')} ARS`
    : prop.enVenta && prop.valorVenta
    ? `💰 Venta: USD ${prop.valorVenta.toLocaleString('es-AR')}`
    : ''

  const superficieStr = prop.superficie ? `📐 ${prop.superficie} m²` : ''

  const caption = [
    `🏠 ${prop.direccion}`,
    superficieStr,
    montoStr,
    prop.descripcion || '',
    captionExtra || '',
    '',
    '📲 Consultá por WhatsApp',
    '#gutleber #propiedades #posadas #misiones #alquiler #inmobiliaria',
  ]
    .filter(Boolean)
    .join('\n')

  try {
    const [primera, ...resto] = prop.imagenes
    const postId = await publicarPropiedad({
      imagenUrl: primera.url,
      caption,
      imagenesExtra: resto.map((i) => i.url),
    })

    await prisma.propiedad.update({ where: { id: prop.id }, data: { instagramPostId: postId } })
    res.json({ ok: true, postId })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    res.status(500).json({ error: msg })
  }
})

export default router
