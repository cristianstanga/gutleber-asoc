import cron from 'node-cron'
import { prisma, logger } from '../index'
import { EstadoPago, TipoPago, Moneda } from '@prisma/client'
import { sendText } from './whatsapp'

export function initCron() {
  // Día 1 de cada mes — generar pagos del mes
  cron.schedule('0 8 1 * *', async () => {
    logger.info('⏰ Cron: generando pagos del mes...')
    await generarPagosMensuales()
  })

  // Día 25 — recordatorio de vencimiento próximo
  cron.schedule('0 9 25 * *', async () => {
    logger.info('⏰ Cron: enviando recordatorios...')
    await enviarRecordatorios()
  })

  // Día 10 — alertar mora (venció el 5 y no pagó)
  cron.schedule('0 9 10 * *', async () => {
    logger.info('⏰ Cron: marcando mora...')
    await marcarMora()
  })

  // Lunes — alertar contratos por vencer en 60 días
  cron.schedule('0 9 * * 1', async () => {
    logger.info('⏰ Cron: contratos por vencer...')
    await alertarContratosVencer()
  })

  logger.info('📅 Cron jobs iniciados')
}

async function generarPagosMensuales() {
  const hoy = new Date()
  const mesStr = hoy.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' }).replace(' ', '-').toLowerCase()

  const vinculos = await prisma.vinculo.findMany({
    where: { activo: true, tipo: 'ALQUILER' },
    include: { propiedad: true, persona: true },
  })

  for (const v of vinculos) {
    const yaExiste = await prisma.pago.findFirst({ where: { vinculoId: v.id, periodo: mesStr } })
    if (yaExiste) continue

    const venc = new Date(hoy.getFullYear(), hoy.getMonth(), 5)
    await prisma.pago.create({
      data: {
        tipo: TipoPago.ALQUILER,
        concepto: `Alquiler ${mesStr} — ${v.propiedad?.direccion}`,
        monto: v.alquilerActual || 0,
        moneda: Moneda.ARS,
        periodo: mesStr,
        estado: EstadoPago.PENDIENTE,
        fechaVencimiento: venc,
        propiedadId: v.propiedadId,
        personaId: v.personaId,
        vinculoId: v.id,
      },
    })
    logger.info(`✅ Pago generado para ${v.persona?.nombre} — ${mesStr}`)
  }
}

async function enviarRecordatorios() {
  const hoy = new Date()
  const proxMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1)
  const finProxMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 10)

  const pagos = await prisma.pago.findMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      fechaVencimiento: { gte: proxMes, lte: finProxMes },
    },
    include: { persona: true, propiedad: true },
  })

  for (const p of pagos) {
    if (!p.persona?.whatsapp) continue
    const monto = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(p.monto)
    const msg = `Hola ${p.persona.nombre}, le recordamos que el próximo ${p.fechaVencimiento.toLocaleDateString('es-AR')} vence el alquiler de ${p.propiedad?.direccion || ''} por ${monto}. — Gutleber & Asoc.`
    await sendText(p.persona.whatsapp, msg)
    logger.info(`📨 Recordatorio enviado a ${p.persona.nombre}`)
  }
}

async function marcarMora() {
  const hoy = new Date()
  const result = await prisma.pago.updateMany({
    where: { estado: EstadoPago.PENDIENTE, fechaVencimiento: { lt: hoy } },
    data: { estado: EstadoPago.MORA },
  })
  if (result.count > 0) logger.info(`⚠️  ${result.count} pagos marcados en mora`)
}

async function alertarContratosVencer() {
  const hoy = new Date()
  const en60dias = new Date(hoy.getTime() + 60 * 24 * 60 * 60 * 1000)

  const contratos = await prisma.vinculo.findMany({
    where: { activo: true, fechaFin: { gte: hoy, lte: en60dias } },
    include: { propiedad: true, persona: true },
  })

  for (const c of contratos) {
    const diasRestantes = Math.round(((c.fechaFin?.getTime() || 0) - hoy.getTime()) / (24 * 60 * 60 * 1000))
    logger.warn(`⚠️  Contrato por vencer: ${c.persona?.nombre} — ${c.propiedad?.direccion} (${diasRestantes} días)`)
  }
}
