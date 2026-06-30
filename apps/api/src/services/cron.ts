/**
 * Cron jobs automáticos — Gutleber & Asoc.
 *
 * Schedules:
 *   Día 1 08:00  → generar pagos del mes
 *   Día 2 09:00  → recordatorio vencimiento al inquilino (vence día 10)
 *   Día 6 09:00  → notificar mora al propietario
 *   Día 10 09:00 → marcar pagos pendientes como MORA
 *   Lunes 09:00  → alertar contratos por vencer (30 y 7 días)
 */

import cron from 'node-cron'
import { prisma, logger } from '../index'
import { EstadoPago, TipoPago, Moneda } from '@prisma/client'
import { sendText } from './whatsapp-meta'
import { enviarCatalogoWA } from './catalogo-wa'
import { exec } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'

const execAsync = promisify(exec)

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

  // Día 2 — recordatorio al inquilino (vence el 10)
  cron.schedule('0 9 2 * *', async () => {
    logger.info('⏰ Cron: recordatorio de vencimiento a inquilinos...')
    await recordatorioInquilinoVencimiento()
  })

  // Día 11 — marcar mora oficialmente (vencimiento es el 10)
  cron.schedule('0 9 11 * *', async () => {
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

  // Diario 03:00 — backup de base de datos
  cron.schedule('0 3 * * *', async () => {
    logger.info('⏰ Cron: backup de base de datos...')
    await hacerBackup()
  })

  logger.info('📅 Cron jobs iniciados (7 schedules)')
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

    const venc = new Date(hoy.getFullYear(), hoy.getMonth(), 10)
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
      `Le recordamos que el *10 de ${mesStr()}* vence el alquiler de:\n` +
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
  const hoy10 = new Date(hoy.getFullYear(), hoy.getMonth(), 10)

  // Pagos de este mes que vencieron el 10 y siguen PENDIENTE
  const pagosImpagos = await prisma.pago.findMany({
    where: {
      estado: EstadoPago.PENDIENTE,
      tipo: TipoPago.ALQUILER,
      fechaVencimiento: { gte: inicioMes, lte: hoy10 },
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

// ─── Marcar mora (día 11 — venció el 10 y no pagaron) ────────────────────────

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

// ─── Backup de base de datos ─────────────────────────────────────────────────

async function hacerBackup() {
  const dbUrl = process.env.DATABASE_URL
  if (!dbUrl) {
    logger.error('❌ Backup: DATABASE_URL no configurada')
    return
  }

  const BACKUPS_DIR = path.join(process.cwd(), 'backups')
  const RETENER_DIAS = 7

  try {
    // Crear carpeta si no existe
    if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true })

    const fecha = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
    const archivo = path.join(BACKUPS_DIR, `gutleber_${fecha}.sql.gz`)

    // pg_dump comprimido con gzip
    await execAsync(`pg_dump "${dbUrl}" | gzip > "${archivo}"`, { shell: '/bin/sh' })

    const tamaño = Math.round(fs.statSync(archivo).size / 1024)
    logger.info(`✅ Backup completado: gutleber_${fecha}.sql.gz (${tamaño} KB)`)

    // Rotar: eliminar backups con más de RETENER_DIAS días
    const archivos = fs.readdirSync(BACKUPS_DIR)
      .filter(f => f.startsWith('gutleber_') && f.endsWith('.sql.gz'))
      .map(f => ({ nombre: f, mtime: fs.statSync(path.join(BACKUPS_DIR, f)).mtime }))
      .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())

    const limite = new Date(Date.now() - RETENER_DIAS * 24 * 60 * 60 * 1000)
    for (const f of archivos) {
      if (f.mtime < limite) {
        fs.unlinkSync(path.join(BACKUPS_DIR, f.nombre))
        logger.info(`🗑️  Backup antiguo eliminado: ${f.nombre}`)
      }
    }

    // Notificar a operadores si está configurado
    const operadores = (process.env.NOTIF_OPERADORES ?? '').split(',').map(n => n.trim()).filter(Boolean)
    for (const num of operadores) {
      try {
        await sendText(num, `✅ *Backup automático completado*\n📁 gutleber_${fecha}.sql.gz (${tamaño} KB)\n🗄️ Retención: últimos ${RETENER_DIAS} días`)
      } catch { /* no crítico */ }
    }
  } catch (err) {
    logger.error({ err }, '❌ Error en backup de base de datos')
    // Notificar error a operadores
    const operadores = (process.env.NOTIF_OPERADORES ?? '').split(',').map(n => n.trim()).filter(Boolean)
    for (const num of operadores) {
      try {
        await sendText(num, `❌ *Error en backup automático*\nRevisá los logs del servidor.`)
      } catch { /* no crítico */ }
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
