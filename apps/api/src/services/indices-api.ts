/**
 * Consulta APIs públicas argentinas para obtener valores de índices.
 *
 * ICL  → BCRA API v2  (Índice para Contratos de Locación — Ley 27.551)
 * UVA  → BCRA API v2  (Unidad de Valor Adquisitivo)
 * IPC  → datos.gob.ar (series INDEC)
 */

import axios from 'axios'
import { logger } from '../index'

const BCRA = 'https://api.bcra.gob.ar/estadisticas/v2.0'
const DATOS_GOB = 'https://apis.datos.gob.ar/series/api/series'

// IDs de variables en BCRA
// Fuente: GET /estadisticas/v2.0/principalesvariables
const BCRA_VAR: Record<string, number> = {
  ICL: 40,   // Índice para Contratos de Locación
  UVA: 4,    // Unidad de Valor Adquisitivo
}

// Series de IPC en datos.gob.ar (nivel general nacional, mensual)
const IPC_SERIES = '148.3_INIVELNAL_DICI_M_26'

export interface ValorIndice {
  fecha: string
  valor: number
}

export interface ResultadoIndice {
  indice: string
  valorActual: ValorIndice
  valorAnterior: ValorIndice
  variacionPct: number   // porcentaje redondeado a 2 decimales
  fuente: string
  error?: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatFechaBCRA(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function pct(anterior: number, actual: number): number {
  return Math.round(((actual - anterior) / anterior) * 10000) / 100
}

// ─── BCRA ─────────────────────────────────────────────────────────────────────

async function fetchBCRA(varId: number, desde: Date, hasta: Date): Promise<ValorIndice[]> {
  const url = `${BCRA}/datosvariable/${varId}/${formatFechaBCRA(desde)}/${formatFechaBCRA(hasta)}`
  const { data } = await axios.get(url, { timeout: 8000 })
  // Respuesta: { results: [{ idVariable, fecha, valor }] }
  return (data.results as Array<{ fecha: string; valor: number }>)
    .map((r) => ({ fecha: r.fecha.slice(0, 10), valor: r.valor }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
}

async function calcularBCRA(
  indice: 'ICL' | 'UVA',
  fechaDesde: Date,
  fechaHasta: Date
): Promise<ResultadoIndice> {
  const varId = BCRA_VAR[indice]
  try {
    // Pedir un rango amplio para asegurarnos de tener valor en la fecha de inicio
    const rangoDesde = new Date(fechaDesde)
    rangoDesde.setDate(rangoDesde.getDate() - 10)

    const datos = await fetchBCRA(varId, rangoDesde, fechaHasta)
    if (datos.length < 2) throw new Error('Datos insuficientes de BCRA')

    const valorAnterior = datos[0]
    const valorActual = datos[datos.length - 1]

    return {
      indice,
      valorAnterior,
      valorActual,
      variacionPct: pct(valorAnterior.valor, valorActual.valor),
      fuente: `BCRA — api.bcra.gob.ar (variable ${varId})`,
    }
  } catch (err) {
    logger.warn({ err }, `BCRA API error para ${indice}`)
    return {
      indice,
      valorAnterior: { fecha: formatFechaBCRA(fechaDesde), valor: 0 },
      valorActual: { fecha: formatFechaBCRA(fechaHasta), valor: 0 },
      variacionPct: 0,
      fuente: 'BCRA (sin datos)',
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

// ─── IPC ─────────────────────────────────────────────────────────────────────

async function calcularIPC(fechaDesde: Date, fechaHasta: Date): Promise<ResultadoIndice> {
  try {
    // IPC es mensual — buscamos el valor del mes de inicio y del mes más reciente
    const desdeStr = fechaDesde.toISOString().slice(0, 7)  // YYYY-MM
    const hastaStr = fechaHasta.toISOString().slice(0, 7)

    const { data } = await axios.get(DATOS_GOB, {
      params: {
        ids: IPC_SERIES,
        start_date: desdeStr,
        end_date: hastaStr,
        sort: 'asc',
        limit: 50,
      },
      timeout: 8000,
    })

    const series: Array<[string, number]> = data.data
    if (!series || series.length < 2) throw new Error('Datos insuficientes de IPC')

    const anterior: ValorIndice = { fecha: series[0][0], valor: series[0][1] }
    const actual: ValorIndice   = { fecha: series[series.length - 1][0], valor: series[series.length - 1][1] }

    return {
      indice: 'IPC',
      valorAnterior: anterior,
      valorActual: actual,
      variacionPct: pct(anterior.valor, actual.valor),
      fuente: 'INDEC vía datos.gob.ar (serie 148.3_INIVELNAL_DICI_M_26)',
    }
  } catch (err) {
    logger.warn({ err }, 'datos.gob.ar API error para IPC')
    return {
      indice: 'IPC',
      valorAnterior: { fecha: fechaDesde.toISOString().slice(0, 7), valor: 0 },
      valorActual:   { fecha: fechaHasta.toISOString().slice(0, 7), valor: 0 },
      variacionPct: 0,
      fuente: 'INDEC vía datos.gob.ar (sin datos)',
      error: err instanceof Error ? err.message : 'Error desconocido',
    }
  }
}

// ─── Punto de entrada principal ───────────────────────────────────────────────

/**
 * Calcula la variación de un índice entre dos fechas.
 * @param indice   'ICL' | 'IPC' | 'UVA'
 * @param desde    Fecha del último ajuste (inicio del período)
 * @param hasta    Fecha de hoy (o la fecha del ajuste)
 */
export async function calcularVariacion(
  indice: string,
  desde: Date,
  hasta: Date = new Date()
): Promise<ResultadoIndice> {
  switch (indice.toUpperCase()) {
    case 'ICL': return calcularBCRA('ICL', desde, hasta)
    case 'UVA': return calcularBCRA('UVA', desde, hasta)
    case 'IPC': return calcularIPC(desde, hasta)
    default:
      return {
        indice,
        valorAnterior: { fecha: '', valor: 0 },
        valorActual:   { fecha: '', valor: 0 },
        variacionPct: 0,
        fuente: 'Desconocido',
        error: `Índice ${indice} no reconocido`,
      }
  }
}
