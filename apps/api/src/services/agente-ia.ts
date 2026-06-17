import Anthropic from '@anthropic-ai/sdk'
import { prisma, logger } from '../index'
import { sendText, sendImageUrl } from './whatsapp-meta'
import { EtapaConversacion } from '@prisma/client'
import { CLAVES_CONFIG } from '../routes/config'

const DEFAULT_REQUISITOS =
  'DNI vigente. Últimos 3 recibos de sueldo (o constancia de ingresos si es monotributista/autónomo). Garantía propietaria (escritura de inmueble libre de deuda en Misiones) o seguro de caución. Referencias personales y laborales.'
const DEFAULT_HORARIOS =
  'Lunes a viernes de 9 a 18hs, sábados de 9 a 13hs. No se coordinan visitas domingos ni feriados.'

async function getConfig(clave: string, fallback: string): Promise<string> {
  const item = await prisma.configSistema.findUnique({ where: { clave } })
  return item?.valor || fallback
}

const ETAPAS_ACTIVAS: EtapaConversacion[] = [
  EtapaConversacion.NUEVO,
  EtapaConversacion.CONSULTANDO,
  EtapaConversacion.INTERESADO,
  EtapaConversacion.RECOPILANDO,
  EtapaConversacion.VISITA_PENDIENTE,
]

type PropiedadCtx = {
  id: string; tipo: string; direccion: string; barrio: string | null
  superficie: number | null; dormitorios: number | null; banos: number | null
  cochera: boolean | null; enAlquiler: boolean; enVenta: boolean
  alquilerBase: number | null; valorVenta: number | null; descripcion: string | null
  imagenes: { url: string }[]
}

const TIPO_LABEL: Record<string, string> = {
  DEPARTAMENTO: 'Departamento', CASA: 'Casa', LOCAL: 'Local',
  TERRENO: 'Terreno', OFICINA: 'Oficina',
}

function buildCatalogo(propiedades: PropiedadCtx[]): string {
  if (propiedades.length === 0) return 'Sin propiedades disponibles en este momento.'
  return propiedades.map(p => {
    const lineas: string[] = []
    lineas.push(`• ${TIPO_LABEL[p.tipo] ?? p.tipo} — ${p.direccion}${p.barrio ? `, ${p.barrio}` : ''}`)
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
    lineas.push(`  Fotos disponibles: ${p.imagenes.length}`)
    return lineas.join('\n')
  }).join('\n\n')
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'enviar_fotos',
    description: 'Envía por WhatsApp las fotos disponibles de una propiedad puntual del catálogo. Usala cuando el interesado pida ver fotos, imágenes o cómo es la propiedad.',
    input_schema: {
      type: 'object',
      properties: {
        direccion: {
          type: 'string',
          description: 'La dirección de la propiedad tal como aparece en el catálogo (o parte de ella, ej: "Las Heras")',
        },
      },
      required: ['direccion'],
    },
  },
  {
    name: 'marcar_interes',
    description: 'Marca en el CRM qué propiedad y tipo de operación le interesa al contacto. Usala apenas quede claro de qué propiedad puntual está hablando o si busca alquilar o comprar, aunque todavía no haya pedido fotos ni visita.',
    input_schema: {
      type: 'object',
      properties: {
        direccion: { type: 'string', description: 'Dirección de la propiedad de interés, tal como aparece en el catálogo' },
        tipoInteres: { type: 'string', enum: ['ALQUILER', 'VENTA'], description: 'Si busca alquilar o comprar' },
        presupuesto: { type: 'number', description: 'Presupuesto aproximado mencionado, si lo dio' },
      },
      required: ['direccion'],
    },
  },
  {
    name: 'registrar_visita',
    description: 'Registra un pedido de visita a una propiedad para que un asesor lo confirme. Usala cuando el interesado ya dio su nombre y un día/horario tentativo para visitar.',
    input_schema: {
      type: 'object',
      properties: {
        direccion: { type: 'string', description: 'Dirección de la propiedad a visitar' },
        nombre: { type: 'string', description: 'Nombre del interesado' },
        diaHorario: { type: 'string', description: 'Día y horario tentativo tal como lo dijo el interesado, ej: "sábado por la tarde"' },
      },
      required: ['direccion', 'nombre', 'diaHorario'],
    },
  },
]

async function ejecutarHerramienta(
  nombre: string,
  input: Record<string, unknown>,
  propiedades: PropiedadCtx[],
  numeroDestino: string,
  conversacionId: string,
  personaId: string | null,
): Promise<string> {
  if (nombre === 'enviar_fotos') {
    const direccionBuscada = String(input.direccion || '').toLowerCase()
    const prop = propiedades.find(p => p.direccion.toLowerCase().includes(direccionBuscada))

    if (!prop) return 'No encontré esa propiedad en el catálogo disponible.'
    if (prop.imagenes.length === 0) return `${prop.direccion} no tiene fotos cargadas todavía.`

    for (const img of prop.imagenes.slice(0, 6)) {
      try {
        await sendImageUrl(numeroDestino, img.url)
        await prisma.inboxItem.create({
          data: {
            canal: 'WHATSAPP',
            mensaje: `[IMG]${img.url}`,
            tipo: 'SALIENTE',
            numero: numeroDestino,
            conversacionId,
            leido: true,
          },
        })
        await new Promise(r => setTimeout(r, 700))
      } catch (err) {
        logger.error({ err }, '❌ Error enviando foto del agente IA')
      }
    }
    return `Se enviaron ${Math.min(prop.imagenes.length, 6)} foto(s) de ${prop.direccion}.`
  }

  if (nombre === 'marcar_interes') {
    const direccionBuscada = String(input.direccion || '').toLowerCase()
    const prop = propiedades.find(p => p.direccion.toLowerCase().includes(direccionBuscada))
    if (!prop) return 'No encontré esa propiedad en el catálogo disponible.'

    await prisma.conversacion.update({
      where: { id: conversacionId },
      data: {
        propiedadInteresId: prop.id,
        ...(input.tipoInteres ? { tipoInteres: String(input.tipoInteres) } : {}),
        ...(input.presupuesto ? { presupuesto: Number(input.presupuesto) } : {}),
      },
    })
    return `Interés registrado: ${prop.direccion}.`
  }

  if (nombre === 'registrar_visita') {
    const direccionBuscada = String(input.direccion || '').toLowerCase()
    const prop = propiedades.find(p => p.direccion.toLowerCase().includes(direccionBuscada))

    await prisma.visita.create({
      data: {
        propiedadId: prop?.id,
        conversacionId,
        personaId,
        nombreContacto: String(input.nombre || ''),
        numeroContacto: numeroDestino,
        fechaPropuesta: String(input.diaHorario || ''),
      },
    })

    await prisma.conversacion.update({
      where: { id: conversacionId },
      data: { etapa: EtapaConversacion.VISITA_PENDIENTE },
    })

    return 'Visita registrada. Un asesor la va a confirmar a la brevedad.'
  }

  return 'Herramienta desconocida.'
}

export async function responderAgente(conversacionId: string, numeroDestino: string): Promise<void> {
  const key = process.env.ANTHROPIC_API_KEY
  if (!key) return

  try {
    const conv = await prisma.conversacion.findUnique({
      where: { id: conversacionId },
      include: {
        // desc + take 20 = los 20 más recientes; se revierten más abajo para enviarlos en orden cronológico
        mensajes: { orderBy: { createdAt: 'desc' }, take: 20 },
      },
    })
    const personaId = conv?.personaId ?? null
    if (!conv) return
    if (!conv.agenteActivo) return
    if (!ETAPAS_ACTIVAS.includes(conv.etapa)) return

    // conv.mensajes[0] es el más reciente (desc). No responder si ya es saliente (evitar bucle)
    const ultimo = conv.mensajes[0]
    if (ultimo?.tipo === 'SALIENTE') return

    // Revertir para tener orden cronológico al armar el historial
    conv.mensajes.reverse()

    const propiedades = await prisma.propiedad.findMany({
      where: { OR: [{ enAlquiler: true }, { enVenta: true }] },
      select: {
        id: true, tipo: true, direccion: true, barrio: true, superficie: true,
        dormitorios: true, banos: true, cochera: true,
        enAlquiler: true, enVenta: true, alquilerBase: true, valorVenta: true, descripcion: true,
        imagenes: { select: { url: true }, orderBy: { orden: 'asc' } },
      },
    })

    const catalogo = buildCatalogo(propiedades)

    const hayAlquiler = propiedades.some(p => p.enAlquiler)
    const hayVenta = propiedades.some(p => p.enVenta)
    const operacion = hayAlquiler && hayVenta
      ? 'alquiler y venta'
      : hayAlquiler ? 'alquiler' : 'venta'

    const [requisitos, horarios] = await Promise.all([
      getConfig(CLAVES_CONFIG.REQUISITOS_ALQUILER, DEFAULT_REQUISITOS),
      getConfig(CLAVES_CONFIG.HORARIOS_ATENCION, DEFAULT_HORARIOS),
    ])

    const requisitosAlquiler = hayAlquiler ? `
REQUISITOS PARA ALQUILAR:
${requisitos}` : ''

    const hoyStr = new Date().toLocaleDateString('es-AR', {
      weekday: 'long', day: '2-digit', month: 'long', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires',
    })

    const system = `Sos el agente de ventas virtual de Gutleber & Asoc., inmobiliaria boutique en Posadas, Misiones, Argentina. Atendés consultas 24/7 sobre propiedades en ${operacion}, hablando por WhatsApp.

Hoy es ${hoyStr}. Usá esta fecha para interpretar referencias como "el sábado" o "mañana".

PROPIEDADES DISPONIBLES:
${catalogo}
${requisitosAlquiler}

HORARIOS DE ATENCIÓN DE LA INMOBILIARIA:
${horarios}

CÓMO CALIFICAR AL INTERESADO (en orden, sin bombardear con preguntas):
1. Qué zona o barrio prefiere
2. Su presupuesto aproximado
3. Cuándo lo necesita
4. Su nombre, para que el asesor pueda contactarlo

CÓMO MANEJAR VISITAS:
Las visitas se coordinan en turnos de 45 minutos, de 9:00 a 17:00. Cuando alguien quiere ver una propiedad, pedí su nombre y el día/horario que le queda mejor dentro de ese rango. Si pide un horario fuera de rango (por ejemplo después de las 17:00), avisale que el horario de visitas es de 9 a 17 y pedile una alternativa dentro de ese rango. Usá la herramienta registrar_visita con esos datos. Confirmá que "en breve un asesor te va a confirmar la visita". No des fechas ni horarios exactos vos, eso lo confirma el asesor.

FOTOS:
Si el interesado pide ver fotos o imágenes de una propiedad, usá la herramienta enviar_fotos con la dirección correspondiente. No digas que vas a mandar las fotos hasta haber usado la herramienta.

REGISTRAR INTERÉS (importante, hacelo apenas tengas el dato):
En cuanto identifiques de qué propiedad puntual está hablando el interesado (aunque todavía no haya pedido fotos ni visita), usá la herramienta marcar_interes con la dirección y, si lo sabés, si busca alquilar o comprar y su presupuesto. Esto queda registrado en el CRM para que el equipo lo vea. Hacelo en segundo plano, sin avisarle al interesado que lo estás haciendo.

REGLAS:
- Ya estás hablando con la persona por WhatsApp — NUNCA pidas teléfono ni email, ya los tenés
- No ofrezcas opciones que no existen en el catálogo (si solo hay alquiler, no preguntes si quiere comprar)
- No preguntes cosas irrelevantes para la búsqueda de una propiedad
- No confirmes precios finales ni hagas descuentos
- No hables de temas ajenos a la inmobiliaria
- Después de registrar una visita o marcar un interés, SIEMPRE mandá un mensaje de texto confirmando lo que acabás de hacer. Nunca dejes la conversación sin una respuesta de texto al interesado.
- No termines cada mensaje con una pregunta forzada o genérica (ej: "¿necesitás algo más de la propiedad o de Gutleber?" no tiene sentido como cierre). Si ya quedó todo claro y no hay nada pendiente, cerrá de forma natural y cálida sin forzar una pregunta. Solo preguntá algo si hay un dato concreto que todavía falta.

ESTILO: Amigable, directo, profesional. Español argentino informal (vos, te). Máximo 3-4 líneas por respuesta. Texto plano, sin asteriscos ni markdown.`

    // Excluimos los [IMG] del historial (son registros de fotos enviadas, no texto conversacional)
    // y colapsamos mensajes consecutivos del mismo rol para cumplir con la API de Anthropic
    const mensajesTexto = conv.mensajes.filter(m => !m.mensaje.startsWith('[IMG]'))
    const rawMessages: Anthropic.MessageParam[] = mensajesTexto.map(m => ({
      role: (m.tipo === 'ENTRANTE' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.mensaje,
    }))
    const messages: Anthropic.MessageParam[] = rawMessages.reduce<Anthropic.MessageParam[]>((acc, msg) => {
      const prev = acc[acc.length - 1]
      if (prev && prev.role === msg.role) {
        prev.content = `${prev.content}\n${msg.content}`
      } else {
        acc.push({ ...msg })
      }
      return acc
    }, [])

    const client = new Anthropic({ apiKey: key })

    let response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system,
      messages,
      tools: TOOLS,
    })

    // Loop de tool-use: ejecutar herramientas hasta que el modelo dé una respuesta de texto final
    let vueltas = 0
    while (response.stop_reason === 'tool_use' && vueltas < 4) {
      vueltas++
      const toolUseBlocks = response.content.filter(
        (c): c is Anthropic.ToolUseBlock => c.type === 'tool_use'
      )

      messages.push({ role: 'assistant', content: response.content })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const tu of toolUseBlocks) {
        const resultado = await ejecutarHerramienta(
          tu.name, tu.input as Record<string, unknown>, propiedades, numeroDestino, conversacionId, personaId
        )
        toolResults.push({ type: 'tool_result', tool_use_id: tu.id, content: resultado })
      }
      messages.push({ role: 'user', content: toolResults })

      response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages,
        tools: TOOLS,
      })
    }

    let textBlock = response.content.find((c): c is Anthropic.TextBlock => c.type === 'text')

    // Si se agotaron las vueltas de herramientas sin una respuesta de texto final,
    // forzamos una última llamada sin tools para no dejar la conversación sin respuesta
    if (!textBlock) {
      if (response.content.some(c => c.type === 'tool_use')) {
        messages.push({ role: 'assistant', content: response.content })
        messages.push({ role: 'user', content: 'Continuá la conversación con un mensaje de texto para el interesado.' })
      }
      const fallback = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 400,
        system,
        messages,
        tools: TOOLS,
        tool_choice: { type: 'none' },
      })
      textBlock = fallback.content.find((c): c is Anthropic.TextBlock => c.type === 'text')
    }

    const respuesta = textBlock?.text.trim()
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
