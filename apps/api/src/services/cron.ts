/**
 * Cron jobs automáticos — Gutleber & Asoc.
 *
 * Schedules:
 *   Día 1 08:00  → generar pagos del mes
 *   Día 2 09:00  → recordatorio vencimiento al inquilino (vence día 5)
 *   Día 6 09:00  → notificar mora al propietario
 *   Día 10 09:00 → marcar pagos pendientes como MORA
 *   Lunes 09:00  → alertar contratos por vencer (30 y 7 días)
 */

import cron from 'node-cron'
import { prisma, logger } from '../index'
import { EstadoPago, TipoPago, Moneda } from '@prisma/client'
import { sendText } from './whatsapp'
import { enviarCatalogoWA } from './catalogo-wa'

// Espera aleatoria entre mensajes para parecer humano (5–12 segundos)
const pausaEntreEnvios = () =>
  new Promise((r) => setTimeout(r, 5000 + Math.floor(Math.random() * 7000)))

// ─── Init ─────────────────────────────────────────────────────────────────────

export function initCron() {
  // Día 1 — generar pagos del mes
  cron.schedule('0 8 1 * *', async () => {
    logger.info('⏰ Cron: generando pagos del mes...')
    await generarPagosMensuales()
  })

  // Día 2 — recordatorio al inquilino (vence el 5)
  cron.schedule('0 9 2 * *', async () => {
    logger.info('⏰ Cron: recordatorio de vencimiento a inquilinos...')
    await recordatorioInquilinoVencimiento()
  })

  // Día 6 — avisar al propietario que el inquilino aún no pagó
  cron.schedule('0 9 6 * *', async () => {
    logger.info('⏰ Cron: aviso mora a propietarios...')
    await avisarPropietarioMora()
  })

  // Día 10 — marcar mora oficialmente
  cron.schedule('0 9 10 * *', async () => {
    logger.info('⏰ Cron: marcando mora...')
    await marcarMora()
  })

  // Lunes — revisar contratos por vencer
  cron.schedule('0 9 * * 1', async () => {
    logger.info('⏰ Cron: contratos por vencer...')
    await alertarContratosVencer()
  })

  // Lunes 09:30 — sincronizar catálogo WA (solo si hay número configurado)
  cron.schedule('30 9 * * 1', async () => {
    if (!process.env.CATALOGO_WA_NUMERO) return
    logger.info('⏰ Cron: sincronizando catálogo WA...')
    try {
      const n = await enviarCatalogoWA()
      logger.info(`✅ Catálogo WA enviado: ${n} propiedades`)
    } catch (err) {
      logger.error({ err }, 'Error en cron catálogo WA')
    }
  })

  logger.info('📅 Cron jobs iniciados (6 schedules)')
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const mesStr = () => {
  const hoy = new Date()
  return hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
}

async function enviarWA(numero: string | null | undefined, mensaje: string, contexto: string) {
  if (!numero) {
    logger.warn(`⚠️  Sin WhatsApp para ${contexto} — mensaje no enviado`)
    return
  }
  try {
    await sendText(numero, mensaje)
    logger.info(`📨 WA enviado a ${contexto}`)
  } catch (err) {
    logger.error({ err }, `Error enviando WA a ${contexto}`)
  }
}

// ─── Generar pagos del mes ────────────────────────────────────────────────────

async function generarPagosMensuales() {
  const hoy = new Date()
  const periodo = hoy.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
    .replace(' ', '-').toLowerCase()

  const vinculos = await prisma.vinculo.findMany({
    where: { activo: true, tipo: 'ALQUILER' },
    include: { propiedad: true, persona: true },
  })

  let generados = 0
  for (const v of vinculos) {
    const yaExiste = await prisma.pago.findFirst({ where: { vinculoId: v.id, periodo } })
    if (yaExiste) continue

    const venc = new Date(hoy.getFullYear(), hoy.getMonth(), 5)
    await prisma.pago.create({
      data: {
        tipo: TipoPago.ALQUILER,
        concepto: `Alquiler ${periodo} — ${v.propiedad?.direccion}`,
        monto: v.alquilerActual || 0,
        moneda: Moneda.ARS,
        periodo,
        estado: EstadoPago.PENDIENTE,
        fechaVencimiento: venc,
        propiedadId: v.propiedadId,
        personaId: v.personaId,
        vinculoId: v.id,
      },
    })
    generados++
    logger.info(`✅ Pago generado: ${v.persona?.nombre} — ${periodo}`)
  }
  logger.info(`📊 ${generados} pagos generados para ${periodo}`)
}

// ─── Recordatorio al inquilino (vence en 3 días — día 2 del mes) ──────────────

async function recordatorioInquilinoVencimiento() {
  const hoy = new Date()
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth(), 10) // busca vencimientos hasta el 10

  const pagos = await prisma.pago.findMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      tipo: TipoPago.ALQUILER,
      fechaVencimiento: { lte: finMes },
    },
    include: { persona: true, propiedad: true },
  })

  for (const p of pagos) {
    const monto = formatARS(p.monto)
    const msg =
      `Hola ${p.persona?.nombre}! 👋\n\n` +
      `Le recordamos que el *5 de ${mesStr()}* vence el alquiler de:\n` +
      `📍 *${p.propiedad?.direccion}*\n` +
      `💰 *${monto}*\n\n` +
      `Ante cualquier consulta, estamos a disposición.\n` +
      `— *Gutleber & Asoc.* 🏢`
    await enviarWA(p.persona?.whatsapp, msg, `inquilino ${p.persona?.nombre}`)
    await pausaEntreEnvios()
  }
}

// ─── Avisar al propietario que el inquilino no pagó (día 6) ───────────────────

async function avisarPropietarioMora() {
  const hoy = new Date()
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const hoy5 = new Date(hoy.getFullYear(), hoy.getMonth(), 5)

  // Pagos de este mes que vencieron el 5 y siguen PENDIENTE
  const pagosImpagos = await prisma.pago.findMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      tipo: TipoPago.ALQUILER,
      fechaVencimiento: { gte: inicioMes, lte: hoy5 },
    },
    include: {
      persona: true,       // inquilino
      propiedad: true,
      vinculo: {
        include: {
          // Buscar si la propiedad tiene un vínculo de administración con propietario
        },
      },
    },
  })

  for (const p of pagosImpagos) {
    if (!p.propiedadId) continue

    // Buscar propietario: primero por propietarioId directo, luego fallback a ADMINISTRACION
    const propConProp = await prisma.propiedad.findUnique({
      where: { id: p.propiedadId },
      include: { propietario: true },
    })
    const propietario = propConProp?.propietario ?? (
      await prisma.vinculo.findFirst({
        where: { propiedadId: p.propiedadId, tipo: 'ADMINISTRACION', activo: true },
        include: { persona: true },
      })
    )?.persona

    if (propietario?.whatsapp) {
      const monto = formatARS(p.monto)
      const msg =
        `Hola ${propietario.nombre}! 📋\n\n` +
        `Le informamos que el alquiler de *${p.propiedad?.direccion}* ` +
        `correspondiente a *${mesStr()}* (${monto}) aún figura como impago.\n\n` +
        `Estamos gestionando el cobro con el inquilino. Le mantendremos informado.\n` +
        `— *Gutleber & Asoc.* 🏢`
      await enviarWA(propietario.whatsapp, msg, `propietario ${propietario.nombre}`)
      await pausaEntreEnvios()
    }
  }
}

// ─── Marcar mora (día 10 — venció el 5 y no pagaron) ─────────────────────────

async function marcarMora() {
  const hoy = new Date()
  const result = await prisma.pago.updateMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      tipo: TipoPago.ALQUILER,
      fechaVencimiento: { lt: hoy },
    },
    data: { estado: EstadoPago.MORA },
  })

  if (result.count > 0) {
    logger.warn(`⚠️  ${result.count} pagos marcados en MORA`)

    // Buscar los pagos que acaban de quedar en mora para notificar a inquilinos
    const pagosEnMora = await prisma.pago.findMany({
      where: {
        estado: EstadoPago.MORA,
        tipo: TipoPago.ALQUILER,
        fechaVencimiento: {
          gte: new Date(hoy.getFullYear(), hoy.getMonth(), 1),
          lt: hoy,
        },
      },
      include: { persona: true, propiedad: true },
    })

    for (const p of pagosEnMora) {
      const monto = formatARS(p.monto)
      const msg =
        `⚠️ Hola ${p.persona?.nombre},\n\n` +
        `El alquiler de *${p.propiedad?.direccion}* por *${monto}* ` +
        `se encuentra en mora desde el ${p.fechaVencimiento.toLocaleDateString('es-AR')}.\n\n` +
        `Le pedimos que regularice la situación a la brevedad.\n` +
        `*Gutleber & Asoc.* — Tel: 376 4XXX-XXXX`
      await enviarWA(p.persona?.whatsapp, msg, `inquilino en mora ${p.persona?.nombre}`)
      await pausaEntreEnvios()
    }
  }
}

// ─── Alertar contratos por vencer (cada lunes) ───────────────────────────────

async function alertarContratosVencer() {
  const hoy = new Date()

  const UMBRALES = [
    { dias: 30, label: '30 días' },
    { dias: 7,  label: '7 días'  },
  ]

  for (const { dias, label } of UMBRALES) {
    const desde = new Date(hoy.getTime() + (dias - 3) * 24 * 60 * 60 * 1000)
    const hasta = new Date(hoy.getTime() + (dias + 3) * 24 * 60 * 60 * 1000)

    const contratos = await prisma.vinculo.findMany({
      where: { activo: true, fechaFin: { gte: desde, lte: hasta } },
      include: { propiedad: true, persona: true },
    })

    for (const c of contratos) {
      const venc = c.fechaFin!.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

      // Notificar al inquilino
      const msgInquilino =
        `📋 Hola ${c.persona.nombre},\n\n` +
        `Le informamos que su contrato de alquiler en *${c.propiedad.direccion}* ` +
        `vence el *${venc}* (en aprox. ${label}).\n\n` +
        `Si desea renovarlo, comuníquese con nosotros a la brevedad para coordinar.\n` +
        `— *Gutleber & Asoc.* 🏢`
      await enviarWA(c.persona.whatsapp, msgInquilino, `inquilino ${c.persona.nombre} (contrato)`)
      await pausaEntreEnvios()

      // Notificar al propietario — primero propietarioId directo, luego fallback ADMINISTRACION
      const propConProp = await prisma.propiedad.findUnique({
        where: { id: c.propiedadId },
        include: { propietario: true },
      })
      const propietario = propConProp?.propietario ?? (
        await prisma.vinculo.findFirst({
          where: { propiedadId: c.propiedadId, tipo: 'ADMINISTRACION', activo: true },
          include: { persona: true },
        })
      )?.persona

      if (propietario?.whatsapp) {
        const msgProp =
          `📋 Hola ${propietario.nombre},\n\n` +
          `El contrato de alquiler de *${c.propiedad.direccion}* ` +
          `vence el *${venc}* (en aprox. ${label}).\n\n` +
          `Estamos coordinando la renovación con el inquilino. Le mantendremos informado.\n` +
          `— *Gutleber & Asoc.* 🏢`
        await enviarWA(propietario.whatsapp, msgProp, `propietario ${propietario.nombre} (contrato)`)
        await pausaEntreEnvios()
      }

      logger.info(`📅 Alerta ${label}: contrato ${c.persona.nombre} — ${c.propiedad.direccion}`)
    }
  }
}
