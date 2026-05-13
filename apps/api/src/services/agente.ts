/**
 * Agente de ventas digital de Gutleber & Asoc.
 *
 * Máquina de estados conversacional:
 * NUEVO → CONSULTANDO → INTERESADO → RECOPILANDO → VISITA_PENDIENTE → CLIENTE
 *
 * v4: Nuevo sistema de intents multicanal
 *   - Búsqueda por dirección ("la casa de mitre", "el dpto de alcazar")
 *   - Flujo propietario: consultas de cobro/depósito
 *   - Flujo inquilino: reclamos y problemas
 *   - Detección sin saludo inicial (cliente llega directo desde cartel/red social)
 *   - Respuestas más naturales y variadas
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
  | 'PROPIETARIO_CONSULTA'   // "soy propietario", "cuando me depositan"
  | 'INQUILINO_RECLAMO'      // "soy inquilino", "tengo un problema"
  | 'BUSCA_DIRECCION'        // texto contiene nombre de calle/dirección
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

// Cada item de media a enviar por WhatsApp
export interface MediaItem {
  tipo: 'imagen' | 'video'
  url: string
  caption?: string
}

// Lo que devuelve el agente: texto principal + media opcional
export interface RespuestaAgente {
  texto: string
  media?: MediaItem[]
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

// ─── Búsqueda de propiedad por dirección ──────────────────────────────────────

/** Busca si el texto del usuario menciona alguna propiedad conocida por dirección. */
async function buscarPropiedadEnTexto(texto: string) {
  const todas = await prisma.propiedad.findMany({
    include: { imagenes: { orderBy: { orden: 'asc' }, take: 1 } },
  })
  const t = texto.toLowerCase()
  // Buscar por palabras significativas de la dirección (≥ 4 letras)
  const encontrada = todas.find((p) => {
    const palabrasDir = p.direccion.toLowerCase().split(/[\s,]+/).filter(w => w.length >= 4)
    return palabrasDir.some(w => t.includes(w))
  })
  return encontrada || null
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

function descripcionPropiedad(p: { tipo: string; direccion: string; superficie: number | null; descripcion: string | null; alquilerBase: number | null; valorVenta: number | null; enAlquiler: boolean; enVenta: boolean }) {
  const precio =
    p.enAlquiler && p.alquilerBase
      ? `💰 *${formatARS(p.alquilerBase)} / mes*`
      : p.enVenta && p.valorVenta
      ? `💰 *USD ${p.valorVenta.toLocaleString('es-AR')}*`
      : ''
  return [
    `*${TIPO_LABEL[p.tipo] || p.tipo} — ${p.direccion}*`,
    p.superficie ? `📐 ${p.superficie} m²` : '',
    precio,
    p.descripcion ? `\n${p.descripcion}` : '',
  ].filter(Boolean).join('\n')
}

function fallbackPorEtapa(ctx: ConvContext, nombre: string): string {
  const sal = nombre ? `${nombre}, n` : 'N'
  switch (ctx.etapa) {
    case EtapaConversacion.NUEVO:
      return (
        `¡Hola! 👋 Soy el asistente de *Gutleber & Asoc.*\n\n` +
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
      return `Ya registramos tu consulta. Nuestra asesora *Cintia Gutleber* se comunicará con vos pronto. ¡Gracias! 🙏`
    default:
      return (
        `Disculpá, no estoy seguro de entender tu consulta. 🤔\n\n` +
        `*Gutleber & Asoc.* — Posadas, Misiones\n` +
        `Lunes a viernes, 9 a 18 hs.`
      )
  }
}

// ─── Detección de intent ──────────────────────────────────────────────────────

export function detectarIntent(
  texto: string,
  ctx?: ConvContext
): { intent: Intent; datos: Record<string, unknown> } {
  const t = texto.toLowerCase().trim()

  // Despedida / agradecimiento
  if (/\b(chau|hasta luego|bye|adios|adiós|nos vemos|hasta pronto)\b/.test(t))
    return { intent: 'DESPEDIDA', datos: {} }

  if (/\b(gracias|muchas gracias|muy amable|mil gracias|ok gracias|genial gracias)\b/.test(t))
    return { intent: 'AGRADECE', datos: {} }

  // Saludos
  if (/^(hola|buenas?|buen\s?(d[ií]a|tarde|noche)|hey|hi|buenos|saludos|que tal|cómo están|como estan|como estas|buenas tardes|buenas noches|buenos dias)/.test(t))
    return { intent: 'SALUDO', datos: {} }

  // Propietario
  if (/\b(soy\s+(propietaria?|el\s+due[ñn]o|la\s+due[ñn]a)|due[ñn]o|propietaria?|cuando\s+(me\s+)?depositan|cuando\s+cobro|mi\s+(cobro|alquiler\s+de\s+mi|pago)|cu[aá]ndo\s+me\s+pagan|mis\s+cobros|cobr[aé]\s+el|ingres[ao]\s+de\s+mi)\b/.test(t))
    return { intent: 'PROPIETARIO_CONSULTA', datos: {} }

  // Inquilino con problema
  if (/\b(soy\s+inquilina?|tengo\s+un\s+problema|hay\s+un\s+problema|reclamo|se\s+rompi[oó]|se\s+pinch[oó]|no\s+funciona|gotea|cañ[eé]r[ií]a|calef[oó]n|electricidad|gas|falla|filtraci[oó]n|humedad|pe[ñn]o\s+de|hace\s+falta\s+arregl)\b/.test(t))
    return { intent: 'INQUILINO_RECLAMO', datos: {} }

  // Sí / No simples
  if (/^(s[íi]|dale|ok|okay|claro|perfecto|exacto|correcto|de acuerdo|genial|okey|s[íi] por favor|va|vamos|anda|andá)$/.test(t))
    return { intent: 'CONFIRMA', datos: {} }

  if (/^(no|no gracias|nope|paso|por ahora no|no por ahora|todav[ií]a no)$/.test(t))
    return { intent: 'NIEGA', datos: {} }

  // Número solo (selección de lista)
  const numSolo = t.match(/^(\d+)$/)
  if (numSolo) return { intent: 'SELECCIONA_NUMERO', datos: { numero: parseInt(numSolo[1]) } }

  // Alquiler
  if (/\b(alquil[ao]r?|alquilo|busco\s+alquiler|necesito\s+alquiler|rent[ao]|para\s+alquilar)\b/.test(t))
    return { intent: 'BUSCA_ALQUILER', datos: {} }

  // Venta
  if (/\b(comprar?|compro|venta|quiero\s+comprar|busco.+(casa|dpto|departamento|local|terreno|propiedad).+venta|para\s+comprar)\b/.test(t))
    return { intent: 'BUSCA_VENTA', datos: {} }

  // Visita
  if (/\b(visita|visitar|ver\s+(en\s+)?persona|recorrer|ir\s+a\s+ver|cuando\s+puedo|puedo\s+ir|agendar|turno|coordinar)\b/.test(t))
    return { intent: 'PIDE_VISITA', datos: {} }

  // Fotos / videos
  if (/\b(foto|fotos|imagen|imágenes|ver\s+(la\s+)?propiedad|mand[aá](me)?|video|videos|material|galería|galeria)\b/.test(t))
    return { intent: 'PREGUNTA_FOTOS', datos: {} }

  // Ubicación
  if (/\b(d[oó]nde\s+(est[aá]|queda)|ubicaci[oó]n|barrio|zona|direcci[oó]n|c[oó]mo llego|acceso)\b/.test(t))
    return { intent: 'PREGUNTA_UBICACION', datos: {} }

  // Precio
  if (/\b(cu[aá]nto|precio|valor|costo|monto|tarifa|cu[aá]nto\s+sale|cu[aá]nto\s+es|cu[aá]nto\s+pide)\b/.test(t))
    return { intent: 'PREGUNTA_PRECIO', datos: {} }

  // Presupuesto declarado
  const presupMatch = t.match(/(\d[\d.,]*)\s*(mil|k|millones?|pesos?|usd|\$)?/)
  if (presupMatch && /presupuesto|tengo|dispongo|puedo\s+pagar|hasta|cuento\s+con/.test(t)) {
    let monto = parseFloat(presupMatch[1].replace(/\./g, '').replace(',', '.'))
    if (/mil|k/.test(presupMatch[2] || '')) monto *= 1000
    if (/millon/.test(presupMatch[2] || '')) monto *= 1000000
    return { intent: 'DA_PRESUPUESTO', datos: { monto } }
  }

  // Nombre con prefijo explícito
  const nombreConPrefijo = t.match(/(?:soy|me llamo|mi nombre es|les habla|habla|se llama)\s+([a-záéíóúüñ]+(?:\s+[a-záéíóúüñ]+){0,2})/i)
  if (nombreConPrefijo) return { intent: 'DA_NOMBRE', datos: { nombre: capitalizar(nombreConPrefijo[1]) } }

  // Detección contextual de nombre (agente lo preguntó)
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

  // Dirección en el texto (ej: "por la casa de la avenida mitre", "el terreno de alcazar")
  if (/\b(calle|av(enida)?|bulevar|blvd|ruta|pasaje|pje|mitre|alcaz[aá]r|corrientes|sarmiento|san\s+mart[ií]n|rivadavia|bartolom[eé]|belgrano|tucum[aá]n|entre\s+r[ií]os|c[oó]rdoba|mendoza|la\s+rioja|jujuy)\b/.test(t))
    return { intent: 'BUSCA_DIRECCION', datos: {} }

  return { intent: 'DESCONOCIDO', datos: {} }
}

// ─── Procesador principal ─────────────────────────────────────────────────────

export async function procesarMensaje(
  numero: string,
  textoOriginal: string
): Promise<RespuestaAgente> {
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

  const { intent, datos } = detectarIntent(texto, ctx)

  const nombre = ctx.nombreCapturado?.split(' ')[0] || ''
  const saludo = nombre ? `Hola ${nombre}` : 'Hola'

  let respuesta = ''
  let media: MediaItem[] = []
  let update: Partial<{
    etapa: EtapaConversacion
    tipoInteres: string
    propiedadInteresId: string | null
    personaId: string
    nombreCapturado: string
    presupuesto: number
    ultimoMensaje: Date
  }> = { ultimoMensaje: new Date() }

  // ── Máquina de estados ──────────────────────────────────────────────────────

  switch (intent) {

    // ── SALUDO ────────────────────────────────────────────────────────────────
    case 'SALUDO': {
      if (ctx.etapa === EtapaConversacion.NUEVO || ctx.etapa === EtapaConversacion.INACTIVO) {
        respuesta =
          `¡Buen día! 👋 Bienvenido/a a *Gutleber & Asoc.*\n` +
          `_GESTIÓN · INVERSIÓN · PATRIMONIO_\n\n` +
          `Somos una inmobiliaria boutique de Posadas, Misiones.\n` +
          `¿En qué te puedo ayudar?\n\n` +
          `1️⃣ Busco propiedad en *alquiler*\n` +
          `2️⃣ Busco propiedad para *comprar*\n` +
          `3️⃣ Consulta sobre una propiedad específica\n` +
          `4️⃣ Soy propietario y quiero *administrar* mi propiedad\n\n` +
          `Respondé con el número o contame directamente. 😊`
        update.etapa = EtapaConversacion.CONSULTANDO
      } else {
        respuesta = `${saludo}! 😊 ¿En qué te puedo ayudar?`
      }
      break
    }

    // ── PROPIETARIO ───────────────────────────────────────────────────────────
    case 'PROPIETARIO_CONSULTA': {
      update.etapa = EtapaConversacion.CONSULTANDO

      // Intentar identificar la persona por número
      const persona = await prisma.persona.findFirst({
        where: { whatsapp: numero },
        include: {
          vinculos: {
            where: { activo: true, tipo: 'ALQUILER' },
            include: {
              propiedad: true,
              pagos: {
                orderBy: { fechaVencimiento: 'desc' },
                take: 3,
              },
            },
          },
        },
      })

      if (persona && persona.vinculos.length > 0) {
        // Propietario conocido con contratos activos
        const lineas = [`${saludo || `Hola ${persona.nombre}`}! 👋 Te identifico como propietario/a.\n`]
        for (const v of persona.vinculos) {
          const ultimoPago = v.pagos[0]
          lineas.push(`🏠 *${v.propiedad.direccion}*`)
          if (v.alquilerActual) lineas.push(`   Alquiler actual: *${formatARS(v.alquilerActual)} / mes*`)
          if (ultimoPago) {
            const estado = ultimoPago.estado === 'PAGADO' ? '✅ Cobrado' : ultimoPago.estado === 'PENDIENTE' ? '⏳ Pendiente' : '⚠️ Vencido'
            lineas.push(`   Último período: ${estado} — ${ultimoPago.periodo || 'sin período'}`)
          }
        }
        lineas.push(`\nSi necesitás hablar con la administración, uno de nuestros asesores se comunicará con vos.\n¿Hay algo específico que quieras consultar?`)
        respuesta = lineas.join('\n')
      } else {
        // Propietario no identificado
        respuesta =
          `Hola! 👋 Para propietarios, manejamos:\n\n` +
          `✅ Cobro y seguimiento de alquileres\n` +
          `✅ Liquidaciones mensuales\n` +
          `✅ Ajustes de índice (ICL/IPC/UVA)\n` +
          `✅ Gestión de contratos y renovaciones\n\n` +
          `Para consultas sobre tu propiedad, necesito identificarte. ¿Tu nombre completo?`
        update.etapa = EtapaConversacion.RECOPILANDO
      }
      break
    }

    // ── INQUILINO RECLAMO ─────────────────────────────────────────────────────
    case 'INQUILINO_RECLAMO': {
      update.etapa = EtapaConversacion.RECOPILANDO

      const persona = await prisma.persona.findFirst({ where: { whatsapp: numero } })

      if (persona) {
        respuesta =
          `${saludo || `Hola ${persona.nombre}`}! Registré tu consulta. 📋\n\n` +
          `¿Podés contarme brevemente cuál es el problema? Lo registramos y notificamos a la administración de inmediato.`
      } else {
        respuesta =
          `Hola! Entiendo que hay un inconveniente. 🔧\n\n` +
          `Para atenderte correctamente necesito:\n` +
          `1. Tu *nombre completo*\n` +
          `2. *Dirección* de la propiedad\n` +
          `3. Descripción del *problema*\n\n` +
          `Podés escribirlo todo junto y lo derivamos de inmediato.`
      }
      break
    }

    // ── BUSCA POR DIRECCIÓN ───────────────────────────────────────────────────
    case 'BUSCA_DIRECCION': {
      const propEncontrada = await buscarPropiedadEnTexto(texto)

      if (propEncontrada) {
        update.propiedadInteresId = propEncontrada.id
        update.etapa = EtapaConversacion.INTERESADO

        const precio =
          propEncontrada.enAlquiler && propEncontrada.alquilerBase
            ? `*${formatARS(propEncontrada.alquilerBase)} / mes*`
            : propEncontrada.enVenta && propEncontrada.valorVenta
            ? `*USD ${propEncontrada.valorVenta.toLocaleString('es-AR')}*`
            : 'A consultar'

        respuesta =
          `Sí, tenemos información sobre esa propiedad! 🏠\n\n` +
          `${descripcionPropiedad(propEncontrada)}\n\n` +
          `💰 Precio: ${precio}\n\n` +
          `¿Qué querés hacer?\n` +
          `📸 Ver fotos y videos\n` +
          `📍 Ver la ubicación exacta\n` +
          `📅 Coordinar una visita`
      } else {
        // No encontrada → mostrar todo el catálogo
        const todas = await getPropiedades()
        if (todas.length > 0) {
          respuesta =
            `No tenemos una propiedad exacta con esa dirección, pero podría interesarte:\n\n` +
            `${listarPropiedades(todas)}\n\n` +
            `Respondé con el número para más info, o contactanos directamente. 😊`
          update.etapa = EtapaConversacion.CONSULTANDO
        } else {
          respuesta =
            `No encontré propiedades con esa dirección. ¿Podés darme más detalles o preferís que te llame una asesora?`
        }
      }
      break
    }

    // ── SELECCIONA NÚMERO ─────────────────────────────────────────────────────
    case 'SELECCIONA_NUMERO': {
      const n = datos.numero as number
      if (!ctx.tipoInteres) {
        if (n === 1) {
          update.tipoInteres = 'ALQUILER'
          update.etapa = EtapaConversacion.CONSULTANDO
          const props = await getPropiedades('ALQUILER')
          respuesta = props.length === 0
            ? `${saludo}, en este momento no contamos con propiedades en alquiler. Te avisamos ante novedades. 📞`
            : `🏠 *Propiedades disponibles para alquiler en Posadas:*\n\n${listarPropiedades(props)}\n\n_Respondé con el número para ver más detalles._`
        } else if (n === 2) {
          update.tipoInteres = 'VENTA'
          update.etapa = EtapaConversacion.CONSULTANDO
          const props = await getPropiedades('VENTA')
          respuesta = props.length === 0
            ? `${saludo}, actualmente no tenemos propiedades en venta publicadas. Dejanos tu contacto y te avisamos. 📞`
            : `🏡 *Propiedades disponibles para la venta:*\n\n${listarPropiedades(props)}\n\n_Respondé con el número que te interesa._`
        } else if (n === 3) {
          update.etapa = EtapaConversacion.CONSULTANDO
          respuesta = `Con gusto te brindamos información. ¿Tenés alguna dirección o zona específica en mente? Podés decirme, por ejemplo: "me interesa la casa de Alcázar" o "busco dpto en el centro".`
        } else if (n === 4) {
          update.etapa = EtapaConversacion.RECOPILANDO
          respuesta =
            `Perfecto. Nuestro servicio de administración incluye:\n\n` +
            `✅ Cobro y gestión de alquileres\n` +
            `✅ Seguimiento de inquilinos y mantenimiento\n` +
            `✅ Ajustes de índice y renovaciones\n` +
            `✅ Liquidaciones mensuales\n\n` +
            `¿Me podés dejar tu nombre para coordinar una consulta?`
        } else {
          respuesta = `Por favor elegí una opción del 1 al 4. 😊`
        }
      } else {
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
            `${descripcionPropiedad(elegida)}\n` +
            `💰 ${precio}\n\n` +
            `¿Qué querés hacer?\n` +
            `📸 Ver fotos y videos\n` +
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

    // ── BUSCA ALQUILER ────────────────────────────────────────────────────────
    case 'BUSCA_ALQUILER': {
      update.tipoInteres = 'ALQUILER'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('ALQUILER')
      respuesta = props.length === 0
        ? `${saludo}, actualmente no tenemos propiedades en alquiler. ¿Querés que te avisemos cuando tengamos?`
        : `${saludo}! 🏠 Propiedades disponibles para alquiler en Posadas:\n\n${listarPropiedades(props)}\n\n_Respondé con el número para más detalles._`
      break
    }

    // ── BUSCA VENTA ───────────────────────────────────────────────────────────
    case 'BUSCA_VENTA': {
      update.tipoInteres = 'VENTA'
      update.etapa = EtapaConversacion.CONSULTANDO
      const props = await getPropiedades('VENTA')
      respuesta = props.length === 0
        ? `${saludo}, actualmente no tenemos propiedades en venta publicadas. Te podemos avisar ante nuevas incorporaciones.`
        : `${saludo}! 🏡 Propiedades disponibles para la venta:\n\n${listarPropiedades(props)}\n\n_Respondé con el número que te interesa._`
      break
    }

    // ── PREGUNTA PRECIO ───────────────────────────────────────────────────────
    case 'PREGUNTA_PRECIO': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({ where: { id: ctx.propiedadInteresId } })
        if (prop) {
          const alq = prop.alquilerBase ? `🏠 Alquiler: *${formatARS(prop.alquilerBase)} / mes*` : ''
          const vta = prop.valorVenta ? `🏡 Venta: *USD ${prop.valorVenta.toLocaleString('es-AR')}*` : ''
          respuesta =
            `Para *${prop.direccion}*:\n${[alq, vta].filter(Boolean).join('\n')}\n\n` +
            `El precio no incluye sellado ni expensas. ¿Querés coordinar una visita?`
        } else {
          respuesta = fallbackPorEtapa(ctx, nombre)
        }
      } else if (ctx.tipoInteres) {
        const props = await getPropiedades(ctx.tipoInteres as 'ALQUILER' | 'VENTA')
        respuesta = props.length === 0
          ? `No tenemos propiedades disponibles en este momento. Consultanos directamente. 📞`
          : `Acá los precios disponibles:\n\n${listarPropiedades(props)}\n\nRespondé con el número para más detalles.`
      } else {
        respuesta = `Los precios varían según la propiedad. ¿Estás buscando para *alquiler* o *compra*?`
      }
      break
    }

    // ── PREGUNTA FOTOS ────────────────────────────────────────────────────────
    case 'PREGUNTA_FOTOS': {
      if (ctx.propiedadInteresId) {
        const prop = await prisma.propiedad.findUnique({
          where: { id: ctx.propiedadInteresId },
          include: {
            imagenes: { orderBy: { orden: 'asc' } },
            videos: { orderBy: { orden: 'asc' } },
          },
        })
        if (prop) {
          const imgs = prop.imagenes || []
          const vids = prop.videos || []

          if (imgs.length === 0 && vids.length === 0) {
            respuesta = `Estamos actualizando el material de *${prop.direccion}*. En breve te enviamos las fotos. 📷`
          } else {
            imgs.forEach((img, i) => {
              media.push({
                tipo: 'imagen',
                url: img.url,
                caption: i === 0 ? `📍 *${prop.direccion}*` : undefined,
              })
            })
            vids.forEach((vid, i) => {
              media.push({
                tipo: 'video',
                url: vid.url,
                caption: i === 0 && imgs.length === 0 ? `📍 *${prop.direccion}*` : undefined,
              })
            })

            const partes = []
            if (imgs.length > 0) partes.push(`${imgs.length} foto${imgs.length > 1 ? 's' : ''}`)
            if (vids.length > 0) partes.push(`${vids.length} video${vids.length > 1 ? 's' : ''}`)
            respuesta = `📸 Te envío ${partes.join(' y ')} de *${prop.direccion}*:`
          }
        } else {
          respuesta = fallbackPorEtapa(ctx, nombre)
        }
      } else {
        // Intentar encontrar propiedad por dirección en el texto
        const propEnTexto = await buscarPropiedadEnTexto(texto)
        if (propEnTexto) {
          update.propiedadInteresId = propEnTexto.id
          update.etapa = EtapaConversacion.INTERESADO
          const prop = await prisma.propiedad.findUnique({
            where: { id: propEnTexto.id },
            include: { imagenes: true, videos: true },
          })
          if (prop && (prop.imagenes.length > 0 || prop.videos.length > 0)) {
            prop.imagenes.forEach((img, i) => media.push({ tipo: 'imagen', url: img.url, caption: i === 0 ? `📍 *${prop.direccion}*` : undefined }))
            prop.videos.forEach((vid, i) => media.push({ tipo: 'video', url: vid.url, caption: i === 0 && prop.imagenes.length === 0 ? `📍 *${prop.direccion}*` : undefined }))
            respuesta = `📸 Acá el material de *${prop.direccion}*:`
          } else {
            respuesta = `Estamos actualizando el material de *${propEnTexto.direccion}*. En breve te enviamos. 📷`
          }
        } else {
          respuesta = `Primero decime qué propiedad te interesa. ¿Buscás para *alquiler* o *compra*? 🏠`
        }
      }
      break
    }

    // ── PREGUNTA UBICACIÓN ────────────────────────────────────────────────────
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
        respuesta = `Todas nuestras propiedades están en Posadas, Misiones. ¿Te interesa alguna zona: centro, costanera, barrios residenciales?`
      }
      break
    }

    // ── PIDE VISITA ───────────────────────────────────────────────────────────
    case 'PIDE_VISITA': {
      if (!ctx.nombreCapturado) {
        update.etapa = EtapaConversacion.RECOPILANDO
        respuesta =
          `¡Perfecto! Con gusto coordinamos una visita. 📅\n\n` +
          `Para agendarla solo necesito tu nombre. ¿Me lo decís?`
      } else {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `Perfecto ${nombre}! 📅\n\n` +
          `Te paso con nuestra asesora *Cintia Gutleber*, quien se comunica con vos a la brevedad para confirmar el horario.\n\n` +
          `*Gutleber & Asoc.* — Lunes a viernes, 9 a 18 hs.`
      }
      break
    }

    // ── DA NOMBRE ─────────────────────────────────────────────────────────────
    case 'DA_NOMBRE': {
      const nombreDado = datos.nombre as string
      update.nombreCapturado = nombreDado

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
        update.personaId = nuevaPersona.id
      }

      if (ctx.etapa === EtapaConversacion.RECOPILANDO) {
        update.etapa = EtapaConversacion.VISITA_PENDIENTE
        respuesta =
          `¡Muchas gracias, ${nombreDado}! 😊\n\n` +
          `Nuestra asesora *Cintia Gutleber* se comunica con vos a la brevedad para confirmar el horario de la visita.\n\n` +
          `¿Hay algo más en lo que te pueda ayudar?`
      } else {
        respuesta = `¡Mucho gusto, ${nombreDado}! ¿En qué te puedo ayudar?`
      }
      break
    }

    // ── DA PRESUPUESTO ────────────────────────────────────────────────────────
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
          `Opciones que se ajustan:\n\n${listarPropiedades(filtradas)}\n\nRespondé con el número que te interesa.`
      } else {
        respuesta =
          `Entendido. Actualmente no tenemos propiedades en ese rango exacto, ` +
          `pero podemos orientarte. ¿Querés que te contacte nuestra asesora?`
      }
      break
    }

    // ── CONFIRMA ──────────────────────────────────────────────────────────────
    case 'CONFIRMA': {
      if (ctx.etapa === EtapaConversacion.INTERESADO) {
        update.etapa = EtapaConversacion.RECOPILANDO
        respuesta = `Perfecto. Para agendar la visita necesito tu nombre completo. ¿Me lo decís?`
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

    // ── NIEGA ─────────────────────────────────────────────────────────────────
    case 'NIEGA': {
      respuesta =
        `Entendido. ¿Hay algo más en lo que te pueda orientar?\n\n` +
        `Podés consultarnos sobre:\n` +
        `🏠 Alquiler o venta de propiedades\n` +
        `📊 Administración de tu propiedad\n` +
        `💼 Asesoría en inversiones inmobiliarias`
      break
    }

    // ── AGRADECE ──────────────────────────────────────────────────────────────
    case 'AGRADECE': {
      respuesta =
        `¡A vos! 😊 Estamos a tu disposición.\n` +
        `*Gutleber & Asoc.* — Posadas, Misiones 🏘️`
      break
    }

    // ── DESPEDIDA ─────────────────────────────────────────────────────────────
    case 'DESPEDIDA': {
      update.etapa = EtapaConversacion.INACTIVO
      respuesta =
        `¡Hasta luego${nombre ? `, ${nombre}` : ''}! 👋 Fue un placer atenderte.\n` +
        `*Gutleber & Asoc.* — GESTIÓN · INVERSIÓN · PATRIMONIO`
      break
    }

    // ── DESCONOCIDO ───────────────────────────────────────────────────────────
    default: {
      // Último intento: buscar propiedad por dirección en el texto
      const propEnTexto = await buscarPropiedadEnTexto(texto)
      if (propEnTexto) {
        update.propiedadInteresId = propEnTexto.id
        update.etapa = EtapaConversacion.INTERESADO
        const precio =
          propEnTexto.enAlquiler && propEnTexto.alquilerBase
            ? `*${formatARS(propEnTexto.alquilerBase)} / mes*`
            : propEnTexto.enVenta && propEnTexto.valorVenta
            ? `*USD ${propEnTexto.valorVenta.toLocaleString('es-AR')}*`
            : 'A consultar'
        respuesta =
          `Encontré información sobre esa propiedad 🏠\n\n` +
          `${descripcionPropiedad(propEnTexto)}\n` +
          `💰 ${precio}\n\n` +
          `¿Querés ver fotos, ubicación o coordinar una visita?`
      } else {
        respuesta = fallbackPorEtapa(ctx, nombre)
        if (ctx.etapa === EtapaConversacion.NUEVO) {
          update.etapa = EtapaConversacion.CONSULTANDO
        }
      }
    }
  }

  await prisma.conversacion.update({ where: { id: conv.id }, data: update })

  return {
    texto: respuesta || fallbackPorEtapa(ctx, nombre),
    media: media.length > 0 ? media : undefined,
  }
}
