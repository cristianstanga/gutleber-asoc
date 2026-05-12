import axios from 'axios'
import { logger } from '../index'

const BASE = 'https://graph.facebook.com/v19.0'

function getCreds() {
  const token = process.env.INSTAGRAM_ACCESS_TOKEN
  const accountId = process.env.INSTAGRAM_ACCOUNT_ID
  if (!token || !accountId) throw new Error('Variables INSTAGRAM_ACCESS_TOKEN e INSTAGRAM_ACCOUNT_ID no configuradas')
  return { token, accountId }
}

export interface PublicarPayload {
  imagenUrl: string          // URL pública accesible por Meta
  caption: string
  imagenesExtra?: string[]   // Para carrusel
}

// Publicar imagen simple
async function publicarImagen(payload: PublicarPayload): Promise<string> {
  const { token, accountId } = getCreds()

  // 1. Crear media container
  const { data: media } = await axios.post(
    `${BASE}/${accountId}/media`,
    {
      image_url: payload.imagenUrl,
      caption: payload.caption,
      access_token: token,
    }
  )

  // 2. Publicar
  const { data: published } = await axios.post(
    `${BASE}/${accountId}/media_publish`,
    { creation_id: media.id, access_token: token }
  )

  logger.info(`📸 Instagram: post publicado ${published.id}`)
  return published.id as string
}

// Publicar carrusel (múltiples fotos)
async function publicarCarrusel(payload: PublicarPayload): Promise<string> {
  const { token, accountId } = getCreds()
  const todasLasUrls = [payload.imagenUrl, ...(payload.imagenesExtra || [])]

  // 1. Crear containers individuales para cada foto
  const containerIds = await Promise.all(
    todasLasUrls.map((url) =>
      axios
        .post(`${BASE}/${accountId}/media`, {
          image_url: url,
          is_carousel_item: true,
          access_token: token,
        })
        .then((r) => r.data.id as string)
    )
  )

  // 2. Crear container del carrusel
  const { data: carousel } = await axios.post(
    `${BASE}/${accountId}/media`,
    {
      media_type: 'CAROUSEL',
      children: containerIds.join(','),
      caption: payload.caption,
      access_token: token,
    }
  )

  // 3. Publicar
  const { data: published } = await axios.post(
    `${BASE}/${accountId}/media_publish`,
    { creation_id: carousel.id, access_token: token }
  )

  logger.info(`📸 Instagram: carrusel publicado ${published.id}`)
  return published.id as string
}

export async function publicarPropiedad(payload: PublicarPayload): Promise<string> {
  const esCarrusel = payload.imagenesExtra && payload.imagenesExtra.length > 0
  return esCarrusel ? publicarCarrusel(payload) : publicarImagen(payload)
}
