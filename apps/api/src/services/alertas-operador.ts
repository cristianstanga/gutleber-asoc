import { sendText } from './whatsapp-meta'
import { logger } from '../index'

// Números de los operadores que reciben alertas (formato internacional sin +)
function getOperadores(): string[] {
  const raw = process.env.NOTIF_OPERADORES ?? ''
  return raw.split(',').map(n => n.trim()).filter(Boolean)
}

export async function alertarOperadores(mensaje: string): Promise<void> {
  const operadores = getOperadores()
  if (operadores.length === 0) {
    logger.warn('⚠️  NOTIF_OPERADORES no configurado — alerta no enviada')
    return
  }
  await Promise.allSettled(
    operadores.map(num =>
      sendText(num, mensaje).catch(err =>
        logger.error({ err, num }, '❌ Error enviando alerta a operador')
      )
    )
  )
}

export async function alertarVisita(params: {
  nombre: string
  direccion: string
  diaHorario: string
  conversacionId: string
}): Promise<void> {
  const url = `${process.env.APP_URL ?? 'https://app.gutleberyasociados.com'}/conversaciones`
  const msg = [
    '🏠 *Nueva visita solicitada*',
    `👤 ${params.nombre}`,
    `📍 ${params.direccion}`,
    `📅 ${params.diaHorario}`,
    `👉 ${url}`,
  ].join('\n')
  await alertarOperadores(msg)
}

export async function alertarRedFlag(params: {
  nombre: string
  numero: string
  motivo: string
  conversacionId: string
}): Promise<void> {
  const url = `${process.env.APP_URL ?? 'https://app.gutleberyasociados.com'}/conversaciones`
  const msg = [
    '🚨 *Atención requerida*',
    `👤 ${params.nombre || params.numero}`,
    `⚠️  ${params.motivo}`,
    `👉 ${url}`,
  ].join('\n')
  await alertarOperadores(msg)
}
