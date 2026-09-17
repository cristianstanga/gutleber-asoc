import { Router } from 'express'
import { prisma } from '../index'
import { AuthRequest, requireAdmin } from '../middleware/auth'

const router = Router()

function slugify(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // saca acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

router.get('/', async (_req, res) => {
  const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } })
  res.json(posts)
})

router.get('/:id', async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { id: req.params.id } })
  if (!post) return res.status(404).json({ error: 'Post no encontrado' })
  res.json(post)
})

router.post('/', async (req, res) => {
  const { titulo, resumen, contenido, imagenPortada, publicado } = req.body
  if (!titulo || !contenido) return res.status(400).json({ error: 'Falta título o contenido' })

  let slug = slugify(titulo)
  const existe = await prisma.blogPost.findUnique({ where: { slug } })
  if (existe) slug = `${slug}-${Date.now().toString(36)}`

  const post = await prisma.blogPost.create({
    data: {
      titulo, slug, resumen, contenido, imagenPortada,
      publicado: !!publicado,
      publicadoEn: publicado ? new Date() : null,
    },
  })
  res.status(201).json(post)
})

router.put('/:id', async (req, res) => {
  const { titulo, resumen, contenido, imagenPortada, publicado } = req.body
  const actual = await prisma.blogPost.findUnique({ where: { id: req.params.id } })
  if (!actual) return res.status(404).json({ error: 'Post no encontrado' })

  const post = await prisma.blogPost.update({
    where: { id: req.params.id },
    data: {
      titulo, resumen, contenido, imagenPortada,
      publicado: !!publicado,
      publicadoEn: publicado && !actual.publicado ? new Date() : actual.publicadoEn,
    },
  })
  res.json(post)
})

router.delete('/:id', requireAdmin, async (req: AuthRequest, res) => {
  await prisma.blogPost.delete({ where: { id: req.params.id } })
  res.json({ ok: true })
})

export default router
