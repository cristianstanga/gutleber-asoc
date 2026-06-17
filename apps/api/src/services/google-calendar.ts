import { google } from 'googleapis'
import { logger } from '../index'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || 'primary'

function getCalendarClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error('Google Calendar no configurado (faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REFRESH_TOKEN)')
  }

  const auth = new google.auth.OAuth2(clientId, clientSecret, 'urn:ietf:wg:oauth:2.0:oob')
  auth.setCredentials({ refresh_token: refreshToken })
  return google.calendar({ version: 'v3', auth })
}

interface DatosVisita {
  id: string
  nombreContacto: string
  numeroContacto: string
  fechaConfirmada: Date
  propiedadDireccion?: string
  notas?: string | null
}

export async function crearEventoVisita(visita: DatosVisita): Promise<string | null> {
  try {
    const calendar = getCalendarClient()

    const inicio = visita.fechaConfirmada
    const fin = new Date(inicio.getTime() + 45 * 60 * 1000) // 45 minutos

    const descripcion = [
      `Contacto: ${visita.nombreContacto}`,
      `WhatsApp: ${visita.numeroContacto}`,
      ...(visita.notas ? [`Notas: ${visita.notas}`] : []),
    ].join('\n')

    const { data } = await calendar.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `Visita — ${visita.propiedadDireccion || 'Propiedad'} (${visita.nombreContacto})`,
        description: descripcion,
        location: visita.propiedadDireccion,
        start: { dateTime: inicio.toISOString(), timeZone: 'America/Argentina/Buenos_Aires' },
        end:   { dateTime: fin.toISOString(),    timeZone: 'America/Argentina/Buenos_Aires' },
        reminders: {
          useDefault: false,
          overrides: [{ method: 'popup', minutes: 30 }],
        },
      },
    })

    logger.info(`📅 Evento Google Calendar creado: ${data.id} — ${visita.propiedadDireccion}`)
    return data.id ?? null
  } catch (err) {
    logger.error({ err }, '⚠️ No se pudo crear evento en Google Calendar')
    return null
  }
}

export async function cancelarEventoVisita(googleEventId: string): Promise<void> {
  try {
    const calendar = getCalendarClient()
    await calendar.events.delete({ calendarId: CALENDAR_ID, eventId: googleEventId })
    logger.info(`🗑️ Evento Google Calendar eliminado: ${googleEventId}`)
  } catch (err) {
    logger.error({ err }, '⚠️ No se pudo eliminar evento de Google Calendar')
  }
}
