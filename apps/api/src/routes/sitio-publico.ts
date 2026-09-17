/**
 * API pública del sitio web de la inmobiliaria (sin auth).
 * Consumida por el frontend público (apps/web-publico), NO por el panel interno.
 *
 * GET /api/public/propiedades           → listado (filtros: operacion, tipo, barrio, precioMin, precioMax, dormitorios, destacada)
 * GET /api/public/propiedades/:id       → ficha completa + similares
 * GET /api/public/config                → contacto, redes, textos institucionales
 * GET /api/public/blog                  → posts publicados
 * GET /api/public/blog/:slug            → post publicado por slug
 */

import { Router } from 'express'
import { prisma } from '../index'
import { TipoVinculo } from '@prisma/client'
import { CLAVES_CONFIG, DEFAULTS } from './config'

const router = Router()

const includePublico = {
  imagenes: { orderBy: { orden: 'asc' as const } },
  videos: { orderBy: { orden: 'asc' as const } },
  tours360: { orderBy: { orden: 'asc' as const } },
  vinculos: { where: { activo: true }, select: { tipo: true } },
}

// Filtra solo las que están realmente disponibles (misma regla que el catálogo de WhatsApp)
function filtrarDisponibles<T extends { enAlquiler: boolean; enVenta: boolean; vinculos: { tipo: TipoVinculo }[] }>(props: T[]) {
  return props.filter((p) => {
    const disponibleAlquiler = p.enAlquiler && !p.vinculos.some((v) => v.tipo === TipoVinculo.ALQUILER)
    const disponibleVenta    = p.enVenta    && !p.vinculos.some((v) => v.tipo === TipoVinculo.VENTA)
    return disponibleAlquiler || disponibleVenta
  })
}

// ─── Propiedades ────────────────────────────────────────────────────────────

router.get('/propiedades', async (req, res) => {
  const { operacion, tipo, barrio, precioMin, precioMax, dormitorios, destacada } = req.query as Record<string, string>

  const where: any = { publicadaWeb: true, OR: [{ enAlquiler: true }, { enVenta: true }] }
  if (operacion === 'venta') where.enVenta = true
  if (operacion === 'alquiler') where.enAlquiler = true
  if (tipo) where.tipo = tipo
  if (barrio) where.barrio = { contains: barrio, mode: 'insensitive' }
  if (dormitorios) where.dormitorios = { gte: Number(dormitorios) }
  if (destacada === 'true') where.destacada = true

  const campoPrecio = operacion === 'alquiler' ? 'alquilerBase' : 'valorVenta'
  if (precioMin) where[campoPrecio] = { ...where[campoPrecio], gte: Number(precioMin) }
  if (precioMax) where[campoPrecio] = { ...where[campoPrecio], lte: Number(precioMax) }

  const propiedades = await prisma.propiedad.findMany({
    where,
    include: includePublico,
    orderBy: { createdAt: 'desc' },
  })

  res.json(filtrarDisponibles(propiedades))
})

router.get('/propiedades/:id', async (req, res) => {
  const prop = await prisma.propiedad.findUnique({
    where: { id: req.params.id },
    include: includePublico,
  })
  if (!prop) return res.status(404).json({ error: 'Propiedad no encontrada' })
  if (!prop.publicadaWeb) return res.status(404).json({ error: 'Propiedad no disponible' })
  if (!filtrarDisponibles([prop]).length) return res.status(404).json({ error: 'Propiedad no disponible' })

  prisma.propiedad.update({ where: { id: prop.id }, data: { vistas: { increment: 1 } } }).catch(() => {})

  const similaresRaw = await prisma.propiedad.findMany({
    where: {
      id: { not: prop.id },
      tipo: prop.tipo,
      publicadaWeb: true,
      OR: [{ enAlquiler: true }, { enVenta: true }],
      ...(prop.barrio ? { barrio: prop.barrio } : {}),
    },
    include: includePublico,
    take: 6,
  })

  res.json({ ...prop, similares: filtrarDisponibles(similaresRaw).slice(0, 3) })
})

// ─── Config institucional ───────────────────────────────────────────────────
// Expone solo las claves relevantes para el sitio público (no todo ConfigSistema
// — hay claves internas como requisitos de alquiler para uso del agente IA/CRM).

const CLAVES_PUBLICAS = [
  CLAVES_CONFIG.CONTACTO_TELEFONO,
  CLAVES_CONFIG.CONTACTO_WHATSAPP,
  CLAVES_CONFIG.CONTACTO_EMAIL,
  CLAVES_CONFIG.INSTAGRAM_USUARIO,
  CLAVES_CONFIG.TEXTO_NOSOTROS,
  CLAVES_CONFIG.TEXTO_SERVICIOS,
  CLAVES_CONFIG.HORARIOS_ATENCION,
]

router.get('/config', async (_req, res) => {
  const items = await prisma.configSistema.findMany({ where: { clave: { in: CLAVES_PUBLICAS } } })
  const mapa: Record<string, string> = {}
  for (const clave of CLAVES_PUBLICAS) mapa[clave] = DEFAULTS[clave] ?? ''
  for (const item of items) mapa[item.clave] = item.valor
  res.json(mapa)
})

// ─── Blog ────────────────────────────────────────────────────────────────────

router.get('/blog', async (_req, res) => {
  const posts = await prisma.blogPost.findMany({
    where: { publicado: true },
    orderBy: { publicadoEn: 'desc' },
    select: { id: true, titulo: true, slug: true, resumen: true, imagenPortada: true, publicadoEn: true },
  })
  res.json(posts)
})

router.get('/blog/:slug', async (req, res) => {
  const post = await prisma.blogPost.findUnique({ where: { slug: req.params.slug } })
  if (!post || !post.publicado) return res.status(404).json({ error: 'Post no encontrado' })
  res.json(post)
})

export default router
