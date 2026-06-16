import { Router } from 'express'
import { prisma, logger } from '../index'
import { Indice } from '@prisma/client'
import { calcularVariacion } from '../services/indices-api'
import { sendText } from '../services/whatsapp-meta'

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const router = Router()

/**
 * GET /api/indices/:indice/preview
 *
 * Consulta las APIs públicas y devuelve, para cada contrato activo
 * con ese índice, el porcentaje de variación real del período
 * transcurrido desde el último ajuste hasta hoy.
 */
router.get('/:indice/preview', async (req, res) => {
  const indice = req.params.indice.toUpperCase() as Indice

  const vinculos = await prisma.vinculo.findMany({
    where: { activo: true, indice },
    include: { propiedad: true, persona: true },
  })

  if (vinculos.length === 0) {
    return res.json({ contratos: [], indice, mensaje: 'Sin contratos activos para este índice' })
  }

  // Para cada contrato calculamos la variación desde su último ajuste
  const contratos = await Promise.all(
    vinculos.map(async (v) => {
      // Fecha de inicio del período: proximaActualizacion - periodicidad meses
      // = cuándo se hizo el último ajuste
      const proximaAct = v.proximaActualizacion ? new Date(v.proximaActualizacion) : new Date()
      const ultimoAjuste = new Date(proximaAct)
      ultimoAjuste.setMonth(ultimoAjuste.getMonth() - (v.periodicidad || 3))

      const resultado = await calcularVariacion(indice, ultimoAjuste)

      const nuevoMonto = v.alquilerActual
        ? Math.round(v.alquilerActual * (1 + resultado.variacionPct / 100))
        : null

      const diasParaAjuste = v.proximaActualizacion
        ? Math.ceil((new Date(v.proximaActualizacion).getTime() - Date.now()) / 86400000)
        : null

      return {
        vinculoId: v.id,
        propiedad: { id: v.propiedadId, direccion: v.propiedad.direccion },
        persona: { id: v.personaId, nombre: v.persona.nombre, apellido: v.persona.apellido },
        alquilerActual: v.alquilerActual,
        nuevoMonto,
        ultimoAjuste: ultimoAjuste.toISOString().slice(0, 10),
        proximaActualizacion: v.proximaActualizacion?.toISOString().slice(0, 10),
        diasParaAjuste,
        vencido: diasParaAjuste !== null && diasParaAjuste < 0,
        resultado,
      }
    })
  )

  // El porcentaje "oficial" para esta pasada es el promedio de los contratos
  // (en la práctica todos tienen el mismo índice así que es igual)
  const pctOficial = contratos[0]?.resultado.variacionPct ?? 0

  res.json({ indice, contratos, pctOficial, fuente: contratos[0]?.resultado.fuente })
})

/**
 * POST /api/indices/:indice/ajustar
 *
 * Aplica el ajuste a todos los contratos del índice.
 * Acepta porcentaje manual (override) o usa el calculado automáticamente.
 */
router.post('/:indice/ajustar', async (req, res) => {
  const indice = req.params.indice.toUpperCase() as Indice
  const { porcentaje, proximaActualizacion } = req.body as {
    porcentaje: number
    proximaActualizacion?: string
  }

  if (!porcentaje || porcentaje <= 0) {
    return res.status(400).json({ error: 'Porcentaje debe ser mayor a 0' })
  }

  const vinculos = await prisma.vinculo.findMany({ where: { activo: true, indice } })

  const actualizados = await Promise.all(
    vinculos.map(async (v) => {
      const nuevoMonto = Math.round((v.alquilerActual || 0) * (1 + porcentaje / 100))

      // Calcular próxima actualización: si no se pasa, se suma la periodicidad desde hoy
      let proxAct: Date
      if (proximaActualizacion) {
        proxAct = new Date(proximaActualizacion)
      } else {
        proxAct = new Date()
        proxAct.setMonth(proxAct.getMonth() + (v.periodicidad || 3))
      }

      const vinculo = await prisma.vinculo.update({
        where: { id: v.id },
        data: { alquilerActual: nuevoMonto, proximaActualizacion: proxAct },
        include: { propiedad: true, persona: true },
      })

      // Actualizar pagos pendientes futuros de este contrato
      await prisma.pago.updateMany({
        where: { vinculoId: v.id, estado: 'PENDIENTE', fechaVencimiento: { gt: new Date() } },
        data: { monto: nuevoMonto },
      })

      if (vinculo.persona.whatsapp) {
        const msg =
          `Hola ${vinculo.persona.nombre}! 📈\n\n` +
          `Tu alquiler en *${vinculo.propiedad.direccion}* se actualiza por índice ${indice}:\n` +
          `Monto anterior: ${formatARS(v.alquilerActual || 0)}\n` +
          `Nuevo monto: *${formatARS(nuevoMonto)}*\n` +
          `Variación: +${porcentaje}%\n\n` +
          `Este valor aplica a partir del próximo vencimiento.\n` +
          `— *Gutleber & Asoc.*`
        try {
          await sendText(vinculo.persona.whatsapp, msg)
        } catch (err) {
          logger.warn({ err, vinculoId: v.id }, '⚠️ No se pudo notificar ajuste de índice por WA')
        }
      }

      return {
        vinculoId: v.id,
        persona: `${vinculo.persona.nombre} ${vinculo.persona.apellido}`,
        propiedad: vinculo.propiedad.direccion,
        montoAnterior: v.alquilerActual,
        nuevoMonto,
        proximaActualizacion: proxAct.toISOString().slice(0, 10),
      }
    })
  )

  res.json({
    ok: true,
    indice,
    porcentaje,
    actualizados: actualizados.length,
    detalle: actualizados,
  })
})

/**
 * GET /api/indices/resumen
 * Devuelve el estado de los 3 índices con contratos activos.
 */
router.get('/resumen', async (_req, res) => {
  const indices = ['ICL', 'IPC', 'UVA'] as const
  const resumen = await Promise.all(
    indices.map(async (ind) => {
      const count = await prisma.vinculo.count({ where: { activo: true, indice: ind } })
      // Próximo ajuste más cercano
      const proximo = await prisma.vinculo.findFirst({
        where: { activo: true, indice: ind, proximaActualizacion: { not: null } },
        orderBy: { proximaActualizacion: 'asc' },
        select: { proximaActualizacion: true },
      })
      const diasProximo = proximo?.proximaActualizacion
        ? Math.ceil((new Date(proximo.proximaActualizacion).getTime() - Date.now()) / 86400000)
        : null

      return { indice: ind, contratos: count, diasProximoAjuste: diasProximo }
    })
  )
  res.json(resumen)
})

export default router
