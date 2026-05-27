/**
 * Consulta APIs públicas argentinas para obtener valores de índices.
 *
 * IPC  → datos.gob.ar (INDEC) — ACTIVO ✅
 * ICL  → BCRA API v2 deprecada. Sin API oficial disponible → fallback manual.
 * UVA  → BCRA API v2 deprecada. Sin API oficial disponible → fallback manual.
 *
 * Estado API BCRA (mayo 2026): /estadisticas/v2.0/datosvariable/* devuelve 410.
 * No existe endpoint v3 público. El ajuste ICL/UVA se ingresa manualmente.
 */

import axios from 'axios'
import { logger } from '../index'

const DATOS_GOB = 'https://apis.datos.gob.ar/series/api/series'

// Serie IPC nivel general nacional, mensual (INDEC vía datos.gob.ar)
const IPC_SERIES = '148.3_INIVELNAL_DICI_M_26'

export interface ValorIndice {
  fecha: string
  valor: number
}

export interface ResultadoIndice {
  indice: string
  valorActual: ValorIndice
  valorAnterior: ValorIndice
  variacionPct: number
  fuente: string
  error?: string
  requiereManual?: boolean
}

function pct(anterior: number, actual: number): number {
  if (!anterior || !actual) return 0
  return Math.round(((actual - anterior) / anterior) * 10000) / 100
}

// ─── IPC (INDEC vía datos.gob.ar) ────────────────────────────────────────────

async function calcularIPC(fechaDesde: Date, fechaHasta: Date): Promise<ResultadoIndice> {
  try {
    const desdeStr = fechaDesde.toISOString().slice(0, 7)
    const hastaStr = fechaHasta.toISOString().slice(0, 7)

    const { data } = await axios.get(DATOS_GOB, {
      params: {
        ids:        IPC_SERIES,
        start_date: desdeStr,
        end_date:   hastaStr,
        sort:       'asc',
        limit:      50,
      },
      timeout:      12000,
      maxRedirects: 5,
    })

    const series: Array<[string, number]> = data.data
    if (!series || series.length < 2) throw new Error('Datos insuficientes de IPC')

    const anterior: ValorIndice = { fecha: series[0][0],                  valor: series[0][1] }
    const actual: ValorIndice   = { fecha: series[series.length - 1][0],  valor: series[series.length - 1][1] }

    return {
      indice: 'IPC',
      valorAnterior: anterior,
      valorActual:   actual,
      variacionPct:  pct(anterior.valor, actual.valor),
      fuente:        'INDEC vía datos.gob.ar (serie 148.3_INIVELNAL_DICI_M_26)',
    }
  } catch (err) {
    logger.warn({ err }, 'datos.gob.ar error para IPC')
    return {
      indice:        'IPC',
      valorAnterior: { fecha: fechaDesde.toISOString().slice(0, 7), valor: 0 },
      valorActual:   { fecha: fechaHasta.toISOString().slice(0, 7), valor: 0 },
      variacionPct:  0,
      fuente:        'INDEC vía datos.gob.ar (sin datos)',
      error:         err instanceof Error ? err.message : 'Error desconocido',
      requiereManual: true,
    }
  }
}

// ─── ICL / UVA — API BCRA deprecada, entrada manual requerida ─────────────────

function fallbackManual(indice: 'ICL' | 'UVA', desde: Date, hasta: Date): ResultadoIndice {
  const links: Record<string, string> = {
    ICL: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Indice_para_Contratos_de_Locacion.asp',
    UVA: 'https://www.bcra.gob.ar/PublicacionesEstadisticas/Cuadros_estadisticos.asp',
  }
  const descripciones: Record<string, string> = {
    ICL: 'Índice para Contratos de Locación (Ley 27.551)',
    UVA: 'Unidad de Valor Adquisitivo',
  }
  return {
    indice,
    valorAnterior: { fecha: desde.toISOString().slice(0, 10), valor: 0 },
    valorActual:   { fecha: hasta.toISOString().slice(0, 10), valor: 0 },
    variacionPct:  0,
    fuente:        `BCRA — ${descripciones[indice]} (API deprecada — ingreso manual requerido)`,
    error:         `La API del BCRA para ${indice} fue deprecada. Consultá el valor actual en ${links[indice]} e ingresalo manualmente.`,
    requiereManual: true,
  }
}

// ─── Punto de entrada ─────────────────────────────────────────────────────────

export async function calcularVariacion(
  indice: string,
  desde:  Date,
  hasta:  Date = new Date()
): Promise<ResultadoIndice> {
  switch (indice.toUpperCase()) {
    case 'IPC': return calcularIPC(desde, hasta)
    case 'ICL': return fallbackManual('ICL', desde, hasta)
    case 'UVA': return fallbackManual('UVA', desde, hasta)
    default:
      return {
        indice,
        valorAnterior:  { fecha: '', valor: 0 },
        valorActual:    { fecha: '', valor: 0 },
        variacionPct:   0,
        fuente:         'Desconocido',
        error:          `Índice ${indice} no reconocido`,
        requiereManual: true,
      }
  }
}
