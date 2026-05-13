import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { prisma } from '../index'
import { upload, uploadVideo, getPublicUrl } from '../services/upload'
import { publicarPropiedad } from '../services/instagram'

const router = Router()

const includeCompleto = {
  imagenes: { orderBy: { orden: 'asc' as const } },
  videos: { orderBy: { orden: 'asc' as const } },
  vinculos: { where: { activo: true }, include: { persona: true } },
  _count: { select: { pagos: true } },
}

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

router.delete('/:id', async (req, res) => {
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

router.delete('/:id/imagenes/:imagenId', async (req, res) => {
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

router.delete('/:id/videos/:videoId', async (req, res) => {
  const video = await prisma.propiedadVideo.findUnique({ where: { id: req.params.videoId } })
  if (!video) return res.status(404).json({ error: 'Video no encontrado' })

  const filePath = path.join(process.cwd(), 'uploads', video.nombre)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)

  await prisma.propiedadVideo.delete({ where: { id: req.params.videoId } })
  res.json({ ok: true })
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
