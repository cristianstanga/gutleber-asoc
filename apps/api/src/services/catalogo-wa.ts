import { prisma, logger } from '../index'
import { generarTarjeta } from './tarjeta'
import { sendImage, sendText } from './whatsapp'
import { TipoVinculo } from '@prisma/client'

const DESTINO_DEFAULT = process.env.CATALOGO_WA_NUMERO || ''

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

function pausa(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

export async function propiedadesDisponibles() {
  const props = await prisma.propiedad.findMany({
    where: { OR: [{ enAlquiler: true }, { enVenta: true }] },
    include: {
      imagenes: { orderBy: { orden: 'asc' } },
      vinculos: { where: { activo: true }, select: { tipo: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return props.filter((p) => {
    const disponibleAlquiler = p.enAlquiler && !p.vinculos.some((v) => v.tipo === TipoVinculo.ALQUILER)
    const disponibleVenta    = p.enVenta    && !p.vinculos.some((v) => v.tipo === TipoVinculo.VENTA)
    return disponibleAlquiler || disponibleVenta
  })
}

function buildCaption(p: { tipo: string; direccion: string; enAlquiler: boolean; enVenta: boolean; alquilerBase: number | null; valorVenta: number | null; superficie: number | null; dormitorios: number | null; banos: number | null; descripcion: string | null }): string {
  const modo = p.enAlquiler && p.enVenta ? 'Alquiler · Venta' : p.enAlquiler ? 'En alquiler' : 'En venta'
  const precio = p.enAlquiler && p.alquilerBase
    ? `💰 ${formatARS(p.alquilerBase)}/mes`
    : p.enVenta && p.valorVenta
    ? `💰 USD ${p.valorVenta.toLocaleString('es-AR')}`
    : ''

  const attrs: string[] = []
  if (p.superficie)   attrs.push(`${p.superficie} m²`)
  if (p.dormitorios)  attrs.push(`${p.dormitorios} dorm.`)
  if (p.banos)        attrs.push(`${p.banos} baño${p.banos > 1 ? 's' : ''}`)

  const lines = [
    `🏠 *${p.tipo} — ${modo}*`,
    `📍 ${p.direccion}`,
    ...(attrs.length ? [`📐 ${attrs.join('  ·  ')}`] : []),
    ...(precio ? [precio] : []),
    ...(p.descripcion ? [`\n${p.descripcion.slice(0, 180)}`] : []),
    '\n— *Gutleber & Asoc.*  ·  Consultá por WhatsApp',
  ]
  return lines.join('\n')
}

export async function enviarPropiedadWA(propiedadId: string, destino: string) {
  const prop = await prisma.propiedad.findUnique({
    where: { id: propiedadId },
    include: { imagenes: { orderBy: { orden: 'asc' } } },
  })
  if (!prop) throw new Error('Propiedad no encontrada')

  const caption = buildCaption(prop)

  if (prop.imagenes.length > 0) {
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
      habitaciones: prop.dormitorios,
      banos: prop.banos,
    })
    await sendImage(destino, buffer, caption)
  } else {
    await sendText(destino, caption)
  }

  logger.info(`📤 Catálogo WA: ${prop.direccion} → ${destino}`)
}

export async function enviarCatalogoWA(destino?: string): Promise<number> {
  const numero = destino || DESTINO_DEFAULT
  if (!numero) throw new Error('Sin número destino — configurá CATALOGO_WA_NUMERO o pasá destino en el body')

  const disponibles = await propiedadesDisponibles()

  if (disponibles.length === 0) {
    await sendText(numero, '📭 No hay propiedades disponibles en este momento.\n— *Gutleber & Asoc.*')
    return 0
  }

  const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
  await sendText(
    numero,
    `🏘️ *Stock disponible — Gutleber & Asoc.*\n` +
    `${disponibles.length} propiedad${disponibles.length !== 1 ? 'es' : ''} disponible${disponibles.length !== 1 ? 's' : ''}\n` +
    `_Actualizado: ${fecha}_`,
  )

  await pausa(1500)

  for (const prop of disponibles) {
    await enviarPropiedadWA(prop.id, numero)
    await pausa(1200)
  }

  logger.info(`✅ Catálogo WA completo: ${disponibles.length} propiedades → ${numero}`)
  return disponibles.length
}
