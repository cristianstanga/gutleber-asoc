/**
 * Agente de ventas digital de Gutleber & Asoc.
 *
 * Máquina de estados conversacional:
 * NUEVO → CONSULTANDO → INTERESADO → RECOPILANDO → VISITA_PENDIENTE → CLIENTE
 *
 * v2: sin recursión, detección contextual de nombre, fallbacks variados por etapa.
 */

import { prisma } from '../index'
import { EtapaConversacion } from '@prisma/client'

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
  | 'SELECCIONA_NUMERO'
  | 'CONFIRMA'
  | 'NIEGA'
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

export function detectarIntent(
  texto: string,
  ctx?: ConvContext
): { intent: Intent; datos: Record<string, unknown> } {
  const t = texto.toLowerCase().trim()

  // Despedida (antes que saludos para evitar falsos positivos)
  if (/\b(chau|hasta luego|bye|adios|adiós|nos vemos|hasta pronto)\b/.test(t))
    return { intent: 'DESPEDIDA', datos: {} }

  // Agradecimiento
  if (/\b(gracias|muchas gracias|muy amable|mil gracias|ok gracias|genial gracias)\b/.test(t))
    return { intent: 'AGRADECE', datos: {} }

  // Saludos
  if (/^(hola|buenas?|buen\s?(d[ií]a|tarde|noche)|hey|hi|buenos|saludos|que tal|cómo están|como estan|como estas|buenas tardes|buenas noches|buenos dias)/.test(t))
    return { intent: 'SALUDO', datos: {} }

  // Confirmación
  if (/^(s[íi]|dale|ok|okay|claro|perfecto|exacto|correcto|de acuerdo|genial|okey|s[íi] por favor|va|vamos|anda|andá)$/.test(t))
    return { intent: 'CONFIRMA', datos: {} }

  // Negación
  if (/^(no|no gracias|nope|paso|por ahora no|no por ahora|todav[ií]a no)$/.test(t))
    return { intent: 'NIEGA', datos: {} }

  // Número solo (selección de propiedad del menú)
  const numSolo = t.match(/^(\d+)$/)
  if (numSolo) return { intent: 'SELECCIONA_NUMERO', datos: { numero: parseInt(numSolo[1]) } }

  // Busca alquiler
  if (/\b(alquil[ao]r?|alquilo|busco\s+alquiler|necesito\s+alquiler|rent[ao]|para\s+alquilar)\b/.test(t))
    return { intent: 'BUSCA_ALQUILER', datos: {} }

  // Busca venta/compra
  if (/\b(comprar?|compro|venta|quiero\s+comprar|busco.+(casa|dpto|departamento|local|terreno|propiedad).+venta|para\s+comprar)\b/.test(t))
    return { intent: 'BUSCA_VENTA', datos: {} }

  // Pide visita
  if (/\b(visita|visitar|ver\s+(en\s+)?persona|recorrer|ir\s+a\s+ver|cuando\s+puedo|puedo\s+ir|agendar|turno|coordinar)\b/.test(t))
    return { intent: 'PIDE_VISITA', datos: {} }

  // Pide fotos/videos
  if (/\b(foto|fotos|imagen|imágenes|ver\s+(la\s+)?propiedad|mand[aá](me)?|video|videos|material)\b/.test(t))
    return { intent: 'PREGUNTA_FOTOS', datos: {} }

  // Pregunta ubicación
  if (/\b(d[oó]nde\s+(est[aá]|queda)|ubicaci[oó]n|barrio|zona|direcci[oó]n|c[oó]mo llego|acceso)\b/.test(t))
    return { intent: 'PREGUNTA_UBICACION', datos: {} }

  // Pregunta precio (después de alquiler/venta para no confundir)
  if (/\b(cu[aá]nto|precio|valor|costo|monto|tarifa|cu[aá]nto\s+sale|cu[aá]nto\s+es|cu[aá]nto\s+pide)\b/.test(t))
    return { intent: 'PREGUNTA_PRECIO', datos: {} }

  // Da presupuesto — detecta antes que nombre para evitar confusión con números
  const presupMatch = t.match(/(\d[\d.,]*)\s*(mil|k|millones?|pesos?|usd|\$)?/)
  if (presupMatch && /presupuesto|tengo|dispongo|puedo\s+pagar|hasta|cuento\s+con/.test(t)) {
    let monto = parseFloat(presupMatch[1].replace(/\./g, '').replace(',', '.'))
    if (/mil|k/.test(presupMatch[2] || '')) monto *= 1000
    if (/millon/.test(presupMatch[2] || '')) monto *= 1000000
    return { intent: 'DA_PRESUPUESTO', datos: { monto } }
  }

  // Da nombre — con prefijo explícito
  const nombreConPrefijo = t.match(/(?:soy|me llamo|mi nombre es|les habla|habla|se llama)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,2})/i)
  if (nombreConPrefijo) return { intent: 'DA_NOMBRE', datos: { nombre: capitalizar(nombreConPrefijo[1]) } }

  // Detección contextual de nombre: si estamos pidiendo datos y el mensaje es solo palabras (1-3),
  // sin números ni símbolos → muy probablemente es el nombre
  if (
    ctx &&
    (ctx.etapa === EtapaConversacion.RECOPILANDO || ctx.etapa === EtapaConversacion.VISITA_PENDIENTE) &&
    !ctx.nombreCapturado &&
    /^[a-záéíóúüñ\s]+$/i.test(t) &&
    t.split(/\s+/).length <= 3 &&
    t.length >= 2 &&
    t.length <= 40
  ) {
    return { intent: 'DA_NOMBRE', datos: { nombre: capitalizar(t) } }
  }

  return { intent: 'DESCONOCIDO', datos: {} }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function capitalizar(s: string) {
  return s.trim().split(/\s+/).map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
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
    orderBy: { createdAt: 'desc' },
    take: 6,
  })
}

function listarPropiedades(props: Awaited<ReturnType<typeof getPropiedades>>) {
  if (props.length === 0) return ''
  return props.map((p, i) => {
    const lineas = [`*${i + 1}.* ${TIPO_LABEL[p.tipo] || p.tipo} — ${p.direccion}`]
    if (p.superficie) lineas.push(`   📐 ${p.superficie} m²`)
    if (p.enAlquiler && p.alquilerBase) lineas.push(`   💰 ${formatARS(p.alquilerBase)} / mes`)
    if (p.enVenta && p.valorVenta) lineas.push(`   💰 USD ${p.valorVenta.toLocaleString('es-AR')}`)
    if (p.descripcion) lineas.push(`   ℹ️ ${p.descripcion.substring(0, 80)}`)
    return lineas.join('\n')
  }).join('\n\n')
}

// Respuesta de fallback según la etapa actual (no repite siempre el mismo menú)
function fallbackPorEtapa(ctx: ConvContext, nombre: string): string {
  const sal = nombre ? `${nombre}, n` : 'N'
  switch (ctx.etapa) {
    case EtapaConversacion.NUEVO:
      return (
        `¡Buen día! 👋 Soy el asistente virtual de *Gutleber & Asoc.*\n\n` +
        `¿Qué estás buscando?\n` +
        `1️⃣ Alquiler\n2️⃣ Comprar propiedad\n3️⃣ Administrar mi propiedad\n\n` +
        `Respondé con el número o contanos directamente.`
      )
    case EtapaConversacion.CONSULTANDO:
      if (!ctx.tipoInteres)
        return `${sal}o entendí bien. ¿Estás buscando para *alquiler* o *compra*? 🏠`
      return `¿Querés ver más opciones de ${ctx.tipoInteres === 'ALQUILER' ? 'alquiler' : 'venta'}? Respondé con el número de la propiedad que te interesa.`
    case EtapaConversacion.INTERESADO:
      return `${sal}o estoy seguro de lo que necesitás. ¿Querés:\n📸 Ver fotos\n📍 Ver la ubicación\n📅 Coordinar una visita`
    case EtapaConversacion.RECOPILANDO:
      if (!ctx.nombreCapturado)
        return `Para continuar, solo necesito tu nombre completo. 😊`
      return `Ya tenemos tus datos. Nuestra asesora se comunicará a la brevedad para confirmar.`
    case EtapaConversacion.VISITA_PENDIENTE:
      return `Ya registramos tu consulta. Nuestra asesora *Cintia Gutleber* se comunicará con vos pronto para confirmar el horario. ¡Gracias por tu paciencia! 🙏`
    default:
      return (
        `Disculpá, no estoy seguro de entender tu consulta. 🤔\n\n` +
        `Nuestra asesora puede ayudarte mejor:\n` +
        `📞 *Gutleber & Asoc.* — Posadas, Misiones\n` +
        `Lunes a viernes, 9 a 18 hs.`
      )
  }
}

// ─── Procesador principal ─────────────────────────────────────────────────────

export async function procesarMensaje(
  numero: string,
  textoOriginal: string
): Promise<string> {
  const texto = textoOriginal.trim()

  // Obtener o crear conversación
  let conv = await prisma.conversacion.findUnique({ where: { numero } })
  if (!conv) {
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

  // Detectar intent con contexto (necesario para nombre contextual)
  const { intent, datos } = detectarIntent(texto, ctx)

  const nombre = ctx.nombreCapturado?.split(' ')[0] || ''
  const saludo = nombre ? `Hola ${nombre}` : 'Hola'

  let respuesta = ''
  let update: Partial<{
    etapa: EtapaConversacion
    tipoInteres: string
    propiedadInteresId: string | null
    nombreCapturado: string
    presupuesto: number
    ultimoMensaje: Date
  }> = { ultimoMensaje: new Date() }

  // ── Máquina de estados ──────────────────────────────────────────────────────

  switch (intent) {

    // ── SALUDO ──────────────────────────────────────────────────────────────
    case 'SALUDO': {
      if (ctx.etapa === EtapaConversacion.NUEVO || ctx.etapa === EtapaConversacion.INACTIVO) {
        respuesta =
          `¡Buen día! 👋 Bienvenido/a a *Gutleber & Asoc.*\n` +
          `_GESTIÓN · INVERSIÓN · PATRIMONIO_\n\n` +
          `Somos una inmobiliaria boutique de Posadas, Misiones.\n` +
          `¿En qué le puedo ayudar hoy?\n\n` +
          `1️⃣ Busco propiedad en *alquiler*\n` +
          `2️⃣ Busco propiedad para *comprar*\n` +
          `3️⃣ Quiero *informarme* sobre una propiedad\n` +
          `4️⃣ Soy propietario y quiero *administrar* mi propiedad\n\n` +
          `Respondé con el número de opción o contame directamente. 😊`
        update.etapa = EtapaConversacion.CONSULTANDO
      } else {
        respuesta = `${saludo}! 😊 ¿En qué te puedo ayudar?`
      }
      break
    }

    // ── SELECCIONA NÚMERO ────────────────────────────────────────────────────
    case 'SELECCIONA_NUMERO': {
      const n = datos.numero as number

      if (!ctx.tipoInteres) {
        // Menú principal (1-4)
        if (n === 1) {
          update.tipoInteres = 'ALQUILER'
          update.etapa = EtapaConversacion.CONSULTANDO
          const props = await getPropiedades('ALQUILER')
          if (props.length === 0) {
            respuesta = `${saludo}, en este momento no contamos con propiedades en alquiler disponibles. Te contactamos cuando tengamos novedades. 📞`
          } else {
            respuesta =
              `🏠 *Propiedades disponibles para alquiler en Posadas:*\n\n` +
              listarPropiedades(props) + '\n\n' +
              `_Respondé con el número de la propiedad para más detalles._`
          }
        } else if (n === 2) {
          update.tipoInteres = 'VENTA'
          update.etapa = EtapaConversacion.CONSULTANDO
          const props = await getPropiedades('VENTA')
          if (props.length === 0) {
            respuesta = `${saludo}, actualmente no tenemos propiedades en venta publicadas. Dejanos tu contacto y te avisamos ante nuevas incorporaciones. 📞`
          } else {
            respuesta =
              `🏡 *Propiedades disponibles para la venta:*\n\n` +
              listarPropiedades(props) + '\n\n' +
              `_Respondé con el número de la propiedad que te interesa._`
          }
        } else if (n === 3) {
          update.etapa = EtapaConversacion.CONSULTANDO
          respuesta = `Con gusto te brindamos información. ¿Tenés alguna dirección o zona específica en mente?`
        } else if (n === 4) {
          update.etapa = EtapaConversacion.RECOPILANDO
          respuesta =
            `Perfecto. Para administrar tu propiedad con nosotros contamos con un servicio integral:\n\n` +
            `✅ Cobro y gestión de alquileres\n` +
            `✅ Seguimiento de inquilinos y mantenimiento\n` +
            `✅ Ajustes de índice y renovaciones\n` +
            `✅ Liquidaciones mensuales transparentes\n\n` +
            `¿Me podés dejar tu nombre para coordinar una consulta?`
        } else {
          respuesta = `Por favor elegí una opción del 1 al 4. 😊`
        }
      } else {
        // Está eligiendo una propiedad de la lista
        const props = await getPropiedades(ctx.tipoInteres as 'ALQUILER' | 'VENTA')
        const elegida = props[n - 1]
        if (elegida) {
          update.propiedadInteresId = elegida.id
          update.etapa = EtapaConversacion.INTERESADO
          const precio =
            ctx.tipoInteres === 'ALQUILER' && elegida.alquilerBase
              ? `*${formatARS(elegida.alquilerBase)} / mes*`
              : elegida.valorVenta
              ? `*USD ${elegida.valorVenta.toLocaleString('es-AR')}*`
              : 'A consultar'
          respuesta =
            `Excelente elección! 🏠\n\n` +
            `*${TIPO_LABEL[elegida.tipo] || elegida.tipo} — ${elegida.direccion}*\n` +
            (elegida.superficie ? `📐 ${elegida.superficie} m²\n` : '') +
            `💰 ${precio}\n` +
            (elegida.descripcion ? `\n${elegida.descripcion}\n` : '') +
            `\n¿Qué querés hacer?\n` +
            `📸 Ver fotos\n` +
            `📍 Ver la ubicación\n` +
            `📅 Coordinar una visita\n\n` +
            `Respondé lo que necesites 😊`
        } else {
          const max = props.length
          respuesta = max > 0
            ? `No encontré esa opción. Por favor elegí un número del *1 al ${max}*.`
            : `No hay propiedades disponibles en este momento.`
        }
      }
      break
    }

    // ── BUSCA ALQUILER ───────────────────────────────────────────────────────
    case 'BUSCA_ALQUILER': {
      update.tipoInteres = 'ALQUILER'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('ALQUILER')
      if (props.length === 0) {
        respuesta = `${saludo}, actualmente no tenemos propiedades en alquiler disponibles. ¿Querés que te avisemos cuando tengamos?`
      } else {
        respuesta =
          `${saludo}! 🏠 Tenemos las siguientes propiedades disponibles para alquiler en Posadas:\n\n` +
          listarPropiedades(props) + '\n\n' +
          `_Respondé con el número de la propiedad para más detalles._`
      }
      break
    }

    // ── BUSCA VENTA ──────────────────────────────────────────────────────────
    case 'BUSCA_VENTA': {
      update.tipoInteres = 'VENTA'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('VENTA')
      if (props.length === 0) {
        respuesta = `${saludo}, actualmente no tenemos propiedades en venta publicadas. Te podemos avisar ante nuevas incorporaciones. ¿Te interesa?`
      } else {
        respuesta =
          `${saludo}! 🏡 Propiedades disponibles para la venta:\n\n` +
          listarPropiedades(props) + '\n\n' +
          `_Respondé con el número de la propiedad que te interesa._`
      }
      break
    }

    // ── PREGUNTA PRECIO ──────────────────────────────────────────────────────
    case 'PREGUNTA_PRECIO': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({ where: { id: ctx.propiedadInteresId } })
        if (prop) {
          const alq = prop.alquilerBase ? `🏠 Alquiler: *${formatARS(prop.alquilerBase)} / mes*` : ''
          const vta = prop.valorVenta ? `🏡 Venta: *USD ${prop.valorVenta.toLocaleString('es-AR')}*` : ''
          respuesta =
            `Para *${prop.direccion}*:\n${[alq, vta].filter(Boolean).join('\n')}\n\n` +
            `El precio no incluye sellado de contrato ni expensas. ¿Querés agendar una visita?`
        } else {
          respuesta = fallbackPorEtapa(ctx, nombre)
        }
      } else if (ctx.tipoInteres) {
        const props = await getPropiedades(ctx.tipoInteres as 'ALQUILER' | 'VENTA')
        if (props.length === 0) {
          respuesta = `No tenemos propiedades disponibles en este momento. 📞 Consultanos directamente.`
        } else {
          respuesta =
            `Acá los precios disponibles:\n\n` +
            listarPropiedades(props) + '\n\n' +
            `Respondé con el número para ver más detalles.`
        }
      } else {
        respuesta = `Los precios varían según la propiedad. ¿Estás buscando para *alquiler* o *compra*?`
      }
      break
    }

    // ── PREGUNTA FOTOS ───────────────────────────────────────────────────────
    case 'PREGUNTA_FOTOS': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({
          where: { id: ctx.propiedadInteresId },
          include: {
            imagenes: { orderBy: { orden: 'asc' } },
            videos: { orderBy: { orden: 'asc' } },
          } as any,
        })
        if (prop) {
          const imgs = (prop as any).imagenes?.length || 0
          const vids = (prop as any).videos?.length || 0
          if (imgs === 0 && vids === 0) {
            respuesta = `Estamos actualizando el material de *${prop.direccion}*. En breve le enviamos las fotos. 📷`
          } else {
            respuesta =
              `📸 ${imgs > 0 ? `${imgs} foto${imgs > 1 ? 's' : ''}` : ''}` +
              `${imgs > 0 && vids > 0 ? ' y ' : ''}` +
              `${vids > 0 ? `${vids} video${vids > 1 ? 's' : ''}` : ''}` +
              ` de *${prop.direccion}* a continuación.`
          }
        } else {
          respuesta = fallbackPorEtapa(ctx, nombre)
        }
      } else {
        respuesta = `Primero decime qué propiedad te interesa. ¿Buscás para *alquiler* o *compra*? 🏠`
      }
      break
    }

    // ── PREGUNTA UBICACIÓN ───────────────────────────────────────────────────
    case 'PREGUNTA_UBICACION': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({ where: { id: ctx.propiedadInteresId } })
        if (prop) {
          respuesta =
            `📍 *${prop.direccion}*\nPosadas, Misiones, Argentina.\n\n` +
            `¿Querés coordinar una visita para conocerla en persona?`
          update.etapa = EtapaConversacion.INTERESADO
        } else {
          respuesta = fallbackPorEtapa(ctx, nombre)
        }
      } else {
        respuesta = `Todas nuestras propiedades están en Posadas, Misiones. ¿Te interesa alguna zona en particular: centro, costanera, barrios residenciales?`
      }
      break
    }

    // ── PIDE VISITA ──────────────────────────────────────────────────────────
    case 'PIDE_VISITA': {
      if (!ctx.nombreCapturado) {
        update.etapa = EtapaConversacion.RECOPILANDO
        respuesta =
          `¡Perfecto! Con mucho gusto coordinamos una visita. 📅\n\n` +
          `Para agendarla necesito tu nombre. ¿Me lo podés decir?`
      } else {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `Perfecto ${nombre}! 📅\n\n` +
          `Voy a pasarle tu consulta a nuestra asesora *Cintia Gutleber*, ` +
          `quien se comunicará con vos a la brevedad para confirmar el horario.\n\n` +
          `*Gutleber & Asoc.* — Lunes a viernes, 9 a 18 hs.`
      }
      break
    }

    // ── DA NOMBRE ────────────────────────────────────────────────────────────
    case 'DA_NOMBRE': {
      const nombreDado = datos.nombre as string
      update.nombreCapturado = nombreDado

      // Actualizar o crear persona en el sistema
      const personaExiste = await prisma.persona.findFirst({ where: { whatsapp: numero } })
      if (!personaExiste) {
        const partes = nombreDado.split(' ')
        const nuevaPersona = await prisma.persona.create({
          data: {
            nombre: partes[0],
            apellido: partes.slice(1).join(' ') || '(pendiente)',
            whatsapp: numero,
            tipo: 'INTERESADO',
          },
        })
        // Vincular persona a la conversación
        update = { ...update, ...({ personaId: nuevaPersona.id } as any) }
      }

      if (ctx.etapa === EtapaConversacion.RECOPILANDO) {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `¡Muchas gracias, ${nombreDado}! 😊\n\n` +
          `Nuestra asesora *Cintia Gutleber* se comunicará con vos a la brevedad para confirmar el horario de la visita.\n\n` +
          `¿Hay algo más en lo que te pueda ayudar mientras tanto?`
      } else {
        respuesta = `¡Mucho gusto, ${nombreDado}! ¿En qué te puedo ayudar?`
      }
      break
    }

    // ── DA PRESUPUESTO ───────────────────────────────────────────────────────
    case 'DA_PRESUPUESTO': {
      const monto = datos.monto as number
      update.presupuesto = monto
      const tipo = (ctx.tipoInteres as 'ALQUILER' | 'VENTA' | undefined) || undefined
      const props = await getPropiedades(tipo)
      const filtradas = props.filter((p) => {
        if (tipo === 'ALQUILER') return p.alquilerBase && p.alquilerBase <= monto * 1.1
        if (tipo === 'VENTA') return p.valorVenta && p.valorVenta <= monto * 1.1
        return true
      })
      if (filtradas.length > 0) {
        respuesta =
          `Entendido, trabajamos con un presupuesto de aprox. ${tipo === 'VENTA' ? `USD ${monto.toLocaleString('es-AR')}` : formatARS(monto)}.\n\n` +
          `Opciones que se ajustan:\n\n` +
          listarPropiedades(filtradas) + '\n\n' +
          `Respondé con el número de la que te interesa.`
      } else {
        respuesta =
          `Entendido. Actualmente no tenemos propiedades en ese rango exacto, ` +
          `pero podemos orientarte hacia opciones similares o avisarte ante nuevas incorporaciones. ` +
          `¿Querés que te contacte nuestra asesora?`
      }
      break
    }

    // ── CONFIRMA ─────────────────────────────────────────────────────────────
    case 'CONFIRMA': {
      if (ctx.etapa === EtapaConversacion.INTERESADO) {
        update.etapa = EtapaConversacion.RECOPILANDO
        respuesta = `Perfecto. Para agendar la visita necesito tu nombre completo. ¿Me lo podés indicar?`
      } else if (ctx.etapa === EtapaConversacion.RECOPILANDO && ctx.nombreCapturado) {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `¡Listo ${nombre}! Nuestra asesora *Cintia Gutleber* te contacta a la brevedad. 📅\n\n` +
          `*Gutleber & Asoc.* — Lunes a viernes, 9 a 18 hs.`
      } else {
        respuesta = `¡Excelente! ¿En qué más te puedo ayudar?`
      }
      break
    }

    // ── NIEGA ────────────────────────────────────────────────────────────────
    case 'NIEGA': {
      respuesta =
        `Entendido. ¿Hay algo más en lo que te pueda orientar?\n\n` +
        `Recordá que también podés consultarnos sobre:\n` +
        `🏠 Alquiler o venta de propiedades\n` +
        `📊 Administración de tu propiedad\n` +
        `💼 Asesoría en inversiones inmobiliarias`
      break
    }

    // ── AGRADECE ─────────────────────────────────────────────────────────────
    case 'AGRADECE': {
      respuesta =
        `¡A vos! 😊 Estamos a tu disposición.\n` +
        `Ante cualquier consulta no dudes en escribirnos.\n` +
        `*Gutleber & Asoc.* — Posadas, Misiones 🏘️`
      break
    }

    // ── DESPEDIDA ────────────────────────────────────────────────────────────
    case 'DESPEDIDA': {
      update.etapa = EtapaConversacion.INACTIVO
      respuesta =
        `¡Hasta luego${nombre ? `, ${nombre}` : ''}! 👋 Fue un placer atenderte.\n` +
        `Recordá que estamos disponibles para cualquier consulta.\n` +
        `*Gutleber & Asoc.* — GESTIÓN · INVERSIÓN · PATRIMONIO`
      break
    }

    // ── DESCONOCIDO — respuesta contextual, nunca el mismo loop ─────────────
    default: {
      respuesta = fallbackPorEtapa(ctx, nombre)
      // Si está NUEVO, moverlo a CONSULTANDO para que la próxima vez varíe
      if (ctx.etapa === EtapaConversacion.NUEVO) {
        update.etapa = EtapaConversacion.CONSULTANDO
      }
    }
  }

  // Guardar actualización de la conversación
  await prisma.conversacion.update({ where: { id: conv.id }, data: update })

  return respuesta || fallbackPorEtapa(ctx, nombre)
}
