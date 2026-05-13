/**
 * Agente de ventas digital de Gutleber & Asoc.
 *
 * Máquina de estados conversacional:
 * NUEVO → CONSULTANDO → INTERESADO → RECOPILANDO → VISITA_PENDIENTE → CLIENTE
 *
 * Cada mensaje entrante pasa por:
 *  1. detectarIntent()     → qué quiere decir el usuario
 *  2. procesarMensaje()    → genera respuesta + actualiza etapa + guarda datos
 */

import { prisma } from '../index'
import { EtapaConversacion, TipoPropiedad } from '@prisma/client'

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Intent =
  | 'SALUDO'
  | 'BUSCA_ALQUILER'
  | 'BUSCA_VENTA'
  | 'PREGUNTA_PRECIO'
  | 'PREGUNTA_FOTOS'
  | 'PIDE_VISITA'
  | 'DA_NOMBRE'
  | 'DA_PRESUPUESTO'
  | 'SELECCIONA_NUMERO'     // cuando manda "1", "2", "3" para elegir propiedad
  | 'CONFIRMA'              // sí, dale, ok
  | 'NIEGA'                 // no, paso
  | 'PREGUNTA_UBICACION'
  | 'AGRADECE'
  | 'DESPEDIDA'
  | 'DESCONOCIDO'

interface ConvContext {
  id: string
  numero: string
  etapa: EtapaConversacion
  tipoInteres: string | null
  propiedadInteresId: string | null
  nombreCapturado: string | null
  presupuesto: number | null
}

// ─── Detección de intent ──────────────────────────────────────────────────────

export function detectarIntent(texto: string): { intent: Intent; datos: Record<string, unknown> } {
  const t = texto.toLowerCase().trim()

  // Saludos
  if (/^(hola|buenas?|buen\s?(d[ií]a|tarde|noche)|hey|hi|buenos|saludos|que tal|cómo están)/.test(t))
    return { intent: 'SALUDO', datos: {} }

  // Despedida
  if (/\b(chau|hasta luego|bye|adios|adiós|nos vemos)\b/.test(t))
    return { intent: 'DESPEDIDA', datos: {} }

  // Agradecimiento
  if (/\b(gracias|muchas gracias|muy amable|perfecto gracias|ok gracias)\b/.test(t))
    return { intent: 'AGRADECE', datos: {} }

  // Confirmación
  if (/^(sí|si|dale|ok|okay|claro|perfecto|exacto|correcto|de acuerdo|genial|okey|s[íi] por favor)$/.test(t))
    return { intent: 'CONFIRMA', datos: {} }

  // Negación
  if (/^(no|no gracias|nope|paso|por ahora no|no por ahora)$/.test(t))
    return { intent: 'NIEGA', datos: {} }

  // Número solo (selección de propiedad del menú)
  const numSolo = t.match(/^(\d+)$/)
  if (numSolo) return { intent: 'SELECCIONA_NUMERO', datos: { numero: parseInt(numSolo[1]) } }

  // Busca alquiler
  if (/\b(alquil[ao]r?|alquilo|busco\s+alquiler|necesito\s+alquiler|rent[ao])\b/.test(t))
    return { intent: 'BUSCA_ALQUILER', datos: {} }

  // Busca venta/compra
  if (/\b(comprar?|compro|venta|quiero\s+comprar|busco\s+(casa|dpto|departamento|local|terreno|propiedad)\s+en\s+venta)\b/.test(t))
    return { intent: 'BUSCA_VENTA', datos: {} }

  // Pregunta precio
  if (/\b(cu[aá]nto|precio|valor|costo|monto|tarifa|cuánto\s+sale|cuánto\s+es)\b/.test(t))
    return { intent: 'PREGUNTA_PRECIO', datos: {} }

  // Pide fotos
  if (/\b(foto|fotos|imagen|imágenes|ver\s+(la\s+)?propiedad|podés\s+mandar|mandame)\b/.test(t))
    return { intent: 'PREGUNTA_FOTOS', datos: {} }

  // Pide visita
  if (/\b(visita|visitar|ver\s+(en\s+)?persona|recorrer|ir\s+a\s+ver|cuando\s+puedo|puedo\s+ir|agendar|turno)\b/.test(t))
    return { intent: 'PIDE_VISITA', datos: {} }

  // Pregunta ubicación
  if (/\b(d[oó]nde\s+(est[aá]|queda)|ubicaci[oó]n|barrio|zona|direcci[oó]n)\b/.test(t))
    return { intent: 'PREGUNTA_UBICACION', datos: {} }

  // Da su nombre
  const nombreMatch = t.match(/(?:soy|me llamo|mi nombre es|les habla|habla)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+)?)/i)
  if (nombreMatch) return { intent: 'DA_NOMBRE', datos: { nombre: capitalizar(nombreMatch[1]) } }

  // Da presupuesto
  const presupMatch = t.match(/(\d[\d.,]*)\s*(mil|k|millones?|pesos?|usd|\$)?/)
  if (presupMatch && /presupuesto|tengo|dispongo|puedo\s+pagar|hasta/.test(t)) {
    let monto = parseFloat(presupMatch[1].replace(/[.,]/g, ''))
    if (/mil|k/.test(presupMatch[2] || '')) monto *= 1000
    if (/millon/.test(presupMatch[2] || '')) monto *= 1000000
    return { intent: 'DA_PRESUPUESTO', datos: { monto } }
  }

  return { intent: 'DESCONOCIDO', datos: {} }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalizar(s: string) {
  return s.split(' ').map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const TIPO_LABEL: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local comercial',
  TERRENO: 'Terreno', OFICINA: 'Oficina',
}

async function getPropiedades(tipo?: 'ALQUILER' | 'VENTA') {
  return prisma.propiedad.findMany({
    where: {
      ...(tipo === 'ALQUILER' ? { enAlquiler: true } : {}),
      ...(tipo === 'VENTA' ? { enVenta: true } : {}),
    },
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
    take: 5,
  })
}

function listarPropiedades(props: Awaited<ReturnType<typeof getPropiedades>>) {
  return props.map((p, i) => {
    const lineas = [`*${i + 1}. ${TIPO_LABEL[p.tipo] || p.tipo}* — ${p.direccion}`]
    if (p.superficie) lineas.push(`   📐 ${p.superficie} m²`)
    if (p.enAlquiler && p.alquilerBase) lineas.push(`   💰 ${formatARS(p.alquilerBase)} / mes`)
    if (p.enVenta && p.valorVenta) lineas.push(`   💰 USD ${p.valorVenta.toLocaleString('es-AR')}`)
    if (p.descripcion) lineas.push(`   ℹ️ ${p.descripcion.substring(0, 70)}`)
    return lineas.join('\n')
  }).join('\n\n')
}

// ─── Procesador principal ─────────────────────────────────────────────────────

export async function procesarMensaje(
  numero: string,
  textoOriginal: string
): Promise<string> {
  const texto = textoOriginal.trim()
  const { intent, datos } = detectarIntent(texto)

  // Obtener o crear conversación
  let conv = await prisma.conversacion.findUnique({ where: { numero } })
  if (!conv) {
    // Buscar si existe persona con ese número
    const persona = await prisma.persona.findFirst({ where: { whatsapp: numero } })
    conv = await prisma.conversacion.create({
      data: {
        numero,
        personaId: persona?.id,
        nombreCapturado: persona ? `${persona.nombre} ${persona.apellido}` : null,
        etapa: EtapaConversacion.NUEVO,
        ultimoMensaje: new Date(),
      },
    })
  }

  const ctx: ConvContext = {
    id: conv.id,
    numero,
    etapa: conv.etapa,
    tipoInteres: conv.tipoInteres,
    propiedadInteresId: conv.propiedadInteresId,
    nombreCapturado: conv.nombreCapturado,
    presupuesto: conv.presupuesto,
  }

  const nombre = ctx.nombreCapturado?.split(' ')[0] || ''
  const saludo = nombre ? `Hola ${nombre}` : 'Hola'

  let respuesta = ''
  let update: Partial<{
    etapa: EtapaConversacion
    tipoInteres: string
    propiedadInteresId: string
    nombreCapturado: string
    presupuesto: number
    ultimoMensaje: Date
  }> = { ultimoMensaje: new Date() }

  // ── Máquina de estados ──────────────────────────────────────────────────────

  switch (intent) {

    case 'SALUDO': {
      if (ctx.etapa === EtapaConversacion.NUEVO) {
        respuesta =
          `¡Buen día! 👋 Bienvenido/a a *Gutleber & Asoc.*\n` +
          `_GESTIÓN · INVERSIÓN · PATRIMONIO_\n\n` +
          `Somos una inmobiliaria boutique de Posadas, Misiones. ` +
          `¿En qué le puedo ayudar hoy?\n\n` +
          `1️⃣ Busco una propiedad en *alquiler*\n` +
          `2️⃣ Busco una propiedad para *comprar*\n` +
          `3️⃣ Quiero *informarme* sobre una propiedad\n` +
          `4️⃣ Soy propietario y quiero *administrar* mi propiedad\n\n` +
          `Respondé con el número de opción o contame directamente qué necesitás. 😊`
        update.etapa = EtapaConversacion.CONSULTANDO
      } else {
        respuesta = `${saludo}! ¿En qué le puedo ayudar? 😊`
      }
      break
    }

    case 'SELECCIONA_NUMERO': {
      const n = datos.numero as number
      if (ctx.etapa === EtapaConversacion.CONSULTANDO && !ctx.tipoInteres) {
        // Menú principal
        if (n === 1) { intent === 'SELECCIONA_NUMERO'; return procesarMensaje(numero, 'alquiler') }
        if (n === 2) { return procesarMensaje(numero, 'comprar') }
        if (n === 3) {
          respuesta = `Con gusto le brindamos información. ¿Tiene alguna dirección o zona específica en mente?`
        }
        if (n === 4) {
          respuesta =
            `Perfecto. Para administrar su propiedad con nosotros contamos con un servicio integral:\n\n` +
            `✅ Cobro y gestión de alquileres\n` +
            `✅ Mantenimiento y seguimiento de inquilinos\n` +
            `✅ Ajustes de índice y renovaciones\n` +
            `✅ Liquidaciones mensuales\n\n` +
            `¿Me puede dejar su nombre para coordinar una consulta?`
          update.etapa = EtapaConversacion.RECOPILANDO
        }
      } else if (ctx.tipoInteres) {
        // Está eligiendo una propiedad de la lista
        const props = await getPropiedades(ctx.tipoInteres as 'ALQUILER' | 'VENTA')
        const elegida = props[n - 1]
        if (elegida) {
          update.propiedadInteresId = elegida.id
          update.etapa = EtapaConversacion.INTERESADO
          const precio = ctx.tipoInteres === 'ALQUILER' && elegida.alquilerBase
            ? formatARS(elegida.alquilerBase)
            : elegida.valorVenta ? `USD ${elegida.valorVenta.toLocaleString('es-AR')}` : 'Consultar'
          respuesta =
            `Excelente elección! 🏠\n\n` +
            `*${TIPO_LABEL[elegida.tipo]} — ${elegida.direccion}*\n` +
            `${elegida.superficie ? `📐 ${elegida.superficie} m²\n` : ''}` +
            `💰 ${precio}\n` +
            `${elegida.descripcion ? `\n${elegida.descripcion}\n` : ''}\n` +
            `¿Le gustaría:\n` +
            `📸 Ver las fotos\n` +
            `📍 Más información de la ubicación\n` +
            `📅 Agendar una visita\n\n` +
            `Responda lo que necesite 😊`
        } else {
          respuesta = `No encontré esa opción. ¿Puede indicarme el número de la propiedad que le interesa?`
        }
      }
      break
    }

    case 'BUSCA_ALQUILER': {
      update.tipoInteres = 'ALQUILER'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('ALQUILER')
      if (props.length === 0) {
        respuesta = `${saludo}, en este momento no contamos con propiedades en alquiler disponibles. Lo contactamos en cuanto tengamos novedades. 📞`
      } else {
        respuesta =
          `${saludo}! 🏠 Tenemos las siguientes propiedades disponibles para alquiler en Posadas:\n\n` +
          listarPropiedades(props) + '\n\n' +
          `_Respondá con el número de la propiedad que le interesa para más detalles._`
      }
      break
    }

    case 'BUSCA_VENTA': {
      update.tipoInteres = 'VENTA'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('VENTA')
      if (props.length === 0) {
        respuesta = `${saludo}, actualmente no tenemos propiedades en venta publicadas. Dejenos su contacto y lo avisamos ante nuevas incorporaciones. 📞`
      } else {
        respuesta =
          `${saludo}! 🏡 Propiedades disponibles para la venta:\n\n` +
          listarPropiedades(props) + '\n\n' +
          `_Respondá con el número de la propiedad que le interesa._`
      }
      break
    }

    case 'PREGUNTA_PRECIO': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({ where: { id: ctx.propiedadInteresId } })
        if (prop) {
          const alq = prop.alquilerBase ? `Alquiler: *${formatARS(prop.alquilerBase)} / mes*` : ''
          const vta = prop.valorVenta ? `Venta: *USD ${prop.valorVenta.toLocaleString('es-AR')}*` : ''
          respuesta = `Para ${prop.direccion}:\n${[alq, vta].filter(Boolean).join('\n')}\n\nEl precio incluye impuestos inmobiliarios. Expensas aparte según corresponda.`
        }
      } else if (ctx.tipoInteres) {
        return procesarMensaje(numero, ctx.tipoInteres === 'ALQUILER' ? 'alquiler' : 'comprar')
      } else {
        respuesta =
          `Los precios varían según la propiedad. ¿Está buscando para *alquiler* o *compra*?\n\n` +
          `Le comparto las opciones disponibles con sus valores.`
      }
      break
    }

    case 'PREGUNTA_FOTOS': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({
          where: { id: ctx.propiedadInteresId },
          include: { imagenes: { orderBy: { orden: 'asc' } } },
        })
        if (prop && prop.imagenes.length > 0) {
          respuesta =
            `📸 Aquí tiene las fotos de ${prop.direccion}.\n` +
            `Le enviamos ${prop.imagenes.length} imagen${prop.imagenes.length > 1 ? 'es' : ''} a continuación.`
          // Las imágenes se envían desde el servicio de WhatsApp después
        } else {
          respuesta = `Disculpe, aún no tenemos fotos cargadas de esa propiedad. Estamos actualizando el material. Le avisamos en breve. 📷`
        }
      } else {
        respuesta = `¿Sobre cuál propiedad le gustaría ver las fotos? Primero dígame si busca para *alquiler* o *compra* y le muestro las opciones disponibles.`
      }
      break
    }

    case 'PREGUNTA_UBICACION': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({ where: { id: ctx.propiedadInteresId } })
        if (prop) {
          respuesta =
            `📍 La propiedad se encuentra en:\n*${prop.direccion}*\n\n` +
            `Posadas, Misiones, Argentina.\n\n` +
            `¿Desea coordinar una visita para conocerla en persona?`
          update.etapa = EtapaConversacion.INTERESADO
        }
      } else {
        respuesta = `Todas nuestras propiedades se encuentran en Posadas, Misiones. ¿Le interesa alguna zona en particular? Por ejemplo: centro, costanera, barrios residenciales.`
      }
      break
    }

    case 'PIDE_VISITA': {
      update.etapa = EtapaConversacion.RECOPILANDO
      if (!ctx.nombreCapturado) {
        respuesta =
          `¡Perfecto! Con mucho gusto coordinamos una visita. 📅\n\n` +
          `Para agendarla necesito algunos datos:\n` +
          `👤 ¿Me puede decir su nombre?`
      } else {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `Perfecto ${nombre}! 📅\n\n` +
          `Voy a pasarle su consulta a nuestra asesora Cintia Gutleber quien se comunicará con usted a la brevedad para confirmar el horario de visita.\n\n` +
          `*Gutleber & Asoc.* — Tel.: +54 9 376 XXX-XXXX\n` +
          `Lunes a viernes de 9 a 18 hs.`
      }
      break
    }

    case 'DA_NOMBRE': {
      const nombreDado = datos.nombre as string
      update.nombreCapturado = nombreDado
      update.etapa = ctx.etapa === EtapaConversacion.RECOPILANDO
        ? EtapaConversacion.VISITA_PENDIENTE
        : ctx.etapa

      // Actualizar o crear persona
      const personaExiste = await prisma.persona.findFirst({ where: { whatsapp: numero } })
      if (!personaExiste) {
        const partes = nombreDado.split(' ')
        await prisma.persona.create({
          data: {
            nombre: partes[0],
            apellido: partes.slice(1).join(' ') || '(sin apellido)',
            whatsapp: numero,
            tipo: 'INTERESADO',
          },
        })
      }

      if (ctx.etapa === EtapaConversacion.RECOPILANDO) {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `Muchas gracias, ${nombreDado}! 😊\n\n` +
          `Nuestra asesora se comunicará con usted a la brevedad para confirmar el horario de la visita.\n\n` +
          `¿Hay algo más en lo que le pueda ayudar?`
      } else {
        respuesta = `¡Mucho gusto, ${nombreDado}! ¿En qué le puedo ayudar hoy?`
      }
      break
    }

    case 'DA_PRESUPUESTO': {
      const monto = datos.monto as number
      update.presupuesto = monto
      respuesta =
        `Entendido, trabajo con un presupuesto de aproximadamente ${formatARS(monto)}. ` +
        `Le muestro las opciones que se ajustan a eso:`
      // Re-procesar como búsqueda con filtro
      const tipo = ctx.tipoInteres as 'ALQUILER' | 'VENTA' | undefined
      const props = await getPropiedades(tipo)
      const filtradas = props.filter((p) => {
        if (tipo === 'ALQUILER') return p.alquilerBase && p.alquilerBase <= monto
        if (tipo === 'VENTA') return p.valorVenta && p.valorVenta <= monto
        return true
      })
      if (filtradas.length > 0) {
        respuesta += '\n\n' + listarPropiedades(filtradas)
      } else {
        respuesta += '\n\nActualmente no tenemos propiedades en ese rango exacto, pero podemos orientarlo hacia opciones similares. ¿Le parece si conversamos con nuestra asesora?'
      }
      break
    }

    case 'AGRADECE': {
      respuesta =
        `¡A usted! 😊 Estamos a su disposición.\n` +
        `Ante cualquier consulta no dude en escribirnos.\n` +
        `*Gutleber & Asoc.* — Posadas, Misiones 🏘️`
      break
    }

    case 'DESPEDIDA': {
      update.etapa = EtapaConversacion.INACTIVO
      respuesta =
        `¡Hasta luego! 👋 Fue un placer atenderle.\n` +
        `Recuerde que estamos disponibles ante cualquier consulta.\n` +
        `*Gutleber & Asoc.* — GESTIÓN · INVERSIÓN · PATRIMONIO`
      break
    }

    case 'CONFIRMA': {
      if (ctx.etapa === EtapaConversacion.INTERESADO) {
        respuesta =
          `Perfecto! Para coordinar la visita necesito su nombre completo. ` +
          `¿Me lo puede indicar?`
        update.etapa = EtapaConversacion.RECOPILANDO
      } else {
        respuesta = `¡Excelente! ¿En qué más le puedo ayudar?`
      }
      break
    }

    case 'NIEGA': {
      respuesta =
        `Entendido. ¿Hay algo más en lo que le pueda orientar?\n\n` +
        `Recuerde que también puede consultarnos sobre:\n` +
        `🏠 Propiedades en alquiler o venta\n` +
        `📊 Administración de propiedades\n` +
        `💼 Asesoría en inversiones inmobiliarias`
      break
    }

    default: {
      // Intent DESCONOCIDO — respuesta educada + redirige
      if (ctx.etapa === EtapaConversacion.NUEVO || ctx.etapa === EtapaConversacion.CONSULTANDO) {
        respuesta =
          `${saludo}! Recibí su mensaje. 😊\n\n` +
          `Para orientarle mejor, ¿está buscando:\n\n` +
          `1️⃣ Propiedad en *alquiler*\n` +
          `2️⃣ Propiedad para *comprar*\n` +
          `3️⃣ Administración de su propiedad\n\n` +
          `Responda con el número o escríbame directamente.`
        update.etapa = EtapaConversacion.CONSULTANDO
      } else {
        respuesta =
          `Disculpe, no estoy seguro de entender su consulta. 🤔\n\n` +
          `Para una atención personalizada, nuestras asesoras se comunicarán con usted a la brevedad.\n` +
          `También puede llamarnos directamente.\n\n` +
          `*Gutleber & Asoc.* — Posadas, Misiones`
      }
    }
  }

  // Guardar actualización de la conversación
  await prisma.conversacion.update({ where: { id: conv.id }, data: update })

  return respuesta
}
