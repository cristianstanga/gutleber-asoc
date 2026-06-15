import Anthropic from '@anthropic-ai/sdk'
import { prisma, logger } from '../index'
import { sendText } from './whatsapp-meta'
import { EtapaConversacion } from '@prisma/client'

const ETAPAS_ACTIVAS: EtapaConversacion[] = [
  EtapaConversacion.NUEVO,
  EtapaConversacion.CONSULTANDO,
  EtapaConversacion.INTERESADO,
  EtapaConversacion.RECOPILANDO,
  EtapaConversacion.VISITA_PENDIENTE,
]

function buildCatalogo(propiedades: Array<{
  tipo: string; direccion: string; barrio?: string | null
  superficie?: number | null; dormitorios?: number | null; banos?: number | null
  cochera?: boolean | null; enAlquiler: boolean; enVenta: boolean
  alquilerBase?: number | null; valorVenta?: number | null; descripcion?: string | null
}>): string {
  if (propiedades.length === 0) return 'Sin propiedades disponibles en este momento.'
  return propiedades.map(p => {
    const lineas: string[] = []
    const tipoLabel: Record<string, string> = {
      DEPARTAMENTO: 'Departamento', CASA: 'Casa', LOCAL: 'Local',
      TERRENO: 'Terreno', OFICINA: 'Oficina',
    }
    lineas.push(`• ${tipoLabel[p.tipo] ?? p.tipo} — ${p.direccion}${p.barrio ? `, ${p.barrio}` : ''}`)
    const detalles: string[] = []
    if (p.superficie) detalles.push(`${p.superficie} m²`)
    if (p.dormitorios) detalles.push(`${p.dormitorios} dorm.`)
    if (p.banos) detalles.push(`${p.banos} baño${p.banos > 1 ? 's' : ''}`)
    if (p.cochera) detalles.push('cochera')
    if (detalles.length) lineas.push(`  ${detalles.join(' · ')}`)
    if (p.enAlquiler && p.alquilerBase)
      lineas.push(`  Alquiler: $${p.alquilerBase.toLocaleString('es-AR')}/mes`)
    if (p.enVenta && p.valorVenta)
      lineas.push(`  Venta: USD ${p.valorVenta.toLocaleString('es-AR')}`)
    return lineas.join('\n')
  }).join('\n\n')
}

export async function responderAgente(conversacionId: string, numeroDestino: string): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return

  try {
    const conv = await prisma.conversacion.findUnique({
      where: { id: conversacionId },
      include: {
        mensajes: { orderBy: { createdAt: 'asc' }, take: 20 },
      },
    })
    if (!conv) return
    if (!conv.agenteActivo) return
    if (!ETAPAS_ACTIVAS.includes(conv.etapa)) return

    // No responder si el último mensaje ya es saliente (evitar bucle)
    const ultimo = conv.mensajes[conv.mensajes.length - 1]
    if (ultimo?.tipo === 'SALIENTE') return

    const propiedades = await prisma.propiedad.findMany({
      where: { OR: [{ enAlquiler: true }, { enVenta: true }] },
      select: {
        tipo: true, direccion: true, barrio: true, superficie: true,
        dormitorios: true, banos: true, cochera: true,
        enAlquiler: true, enVenta: true, alquilerBase: true, valorVenta: true, descripcion: true,
      },
    })

    const catalogo = buildCatalogo(propiedades)

    const hayAlquiler = propiedades.some(p => p.enAlquiler)
    const hayVenta = propiedades.some(p => p.enVenta)
    const operacion = hayAlquiler && hayVenta
      ? 'alquiler y venta'
      : hayAlquiler ? 'alquiler' : 'venta'

    const requisitosAlquiler = hayAlquiler ? `
REQUISITOS PARA ALQUILAR:
- DNI vigente
- Últimos 3 recibos de sueldo (o constancia de ingresos si es monotributista/autónomo)
- Garantía propietaria (escritura de inmueble libre de deuda en Misiones) O seguro de caución
- Referencias personales y laborales` : ''

    const system = `Sos el agente de ventas virtual de Gutleber & Asoc., inmobiliaria boutique en Posadas, Misiones, Argentina. Atendés consultas 24/7 sobre propiedades en ${operacion}.

PROPIEDADES DISPONIBLES:
${catalogo}
${requisitosAlquiler}

CÓMO CALIFICAR AL INTERESADO (en orden, sin bombardear con preguntas):
1. Qué zona o barrio prefiere
2. Su presupuesto aproximado
3. Cuándo lo necesita
4. Su nombre, para que el asesor pueda contactarlo

CÓMO MANEJAR VISITAS:
Cuando alguien quiere ver una propiedad, pedí su nombre y el día/horario que le queda mejor. Confirmá que "en breve un asesor te va a confirmar la visita". No des fechas ni horarios exactos vos.

REGLAS:
- No ofrezcas opciones que no existen en el catálogo (si solo hay alquiler, no preguntes si quiere comprar)
- No preguntes cosas irrelevantes para la búsqueda de una propiedad
- No confirmes precios finales ni hagas descuentos
- No hables de temas ajenos a la inmobiliaria

ESTILO: Amigable, directo, profesional. Español argentino informal (vos, te). Máximo 3-4 líneas por respuesta. Texto plano, sin asteriscos ni markdown. Hacé una sola pregunta por vez para no abrumar.`

    const historial = conv.mensajes.map(m => ({
      role: (m.tipo === 'ENTRANTE' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.mensaje,
    }))

    const client = new Anthropic({ apiKey: key })
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system,
      messages: historial,
    })

    const respuesta = (response.content[0] as { type: string; text: string }).text.trim()
    if (!respuesta) return

    await sendText(numeroDestino, respuesta)

    await prisma.inboxItem.create({
      data: {
        canal: 'WHATSAPP',
        mensaje: respuesta,
        tipo: 'SALIENTE',
        numero: numeroDestino,
        conversacionId,
        leido: true,
      },
    })

    await prisma.conversacion.update({
      where: { id: conversacionId },
      data: {
        ultimoMensaje: new Date(),
        ...(conv.etapa === EtapaConversacion.NUEVO ? { etapa: EtapaConversacion.CONSULTANDO } : {}),
      },
    })

    logger.info(`🤖 Agente IA respondió a ${numeroDestino}`)
  } catch (err) {
    logger.error({ err }, '❌ Error en agente IA')
  }
}
