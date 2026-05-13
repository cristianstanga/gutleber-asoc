import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TrendingUp, RefreshCw, CheckCircle, AlertTriangle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'

type Indice = 'ICL' | 'IPC' | 'UVA'

interface ContratoPreview {
  vinculoId: string
  propiedad: { id: string; direccion: string }
  persona: { id: string; nombre: string; apellido: string }
  alquilerActual: number
  nuevoMonto: number
  ultimoAjuste: string
  proximaActualizacion: string
  diasParaAjuste: number | null
  vencido: boolean
  resultado: {
    valorAnterior: { fecha: string; valor: number }
    valorActual: { fecha: string; valor: number }
    variacionPct: number
    fuente: string
    error?: string
  }
}

interface Preview {
  indice: Indice
  contratos: ContratoPreview[]
  pctOficial: number
  fuente: string
}

interface Resumen { indice: Indice; contratos: number; diasProximoAjuste: number | null }

const INDICE_INFO: Record<Indice, { label: string; desc: string; color: string; fuente: string }> = {
  ICL: {
    label: 'ICL',
    desc: 'Índice para Contratos de Locación',
    color: 'border-l-piedra',
    fuente: 'BCRA — api.bcra.gob.ar',
  },
  IPC: {
    label: 'IPC',
    desc: 'Índice de Precios al Consumidor',
    color: 'border-l-blue-400',
    fuente: 'INDEC vía datos.gob.ar',
  },
  UVA: {
    label: 'UVA',
    desc: 'Unidad de Valor Adquisitivo',
    color: 'border-l-green-400',
    fuente: 'BCRA — api.bcra.gob.ar',
  },
}

export default function AjusteIndices() {
  const qc = useQueryClient()
  const [indiceAbierto, setIndiceAbierto] = useState<Indice | null>(null)
  const [pctOverride, setPctOverride] = useState<Record<Indice, string>>({ ICL: '', IPC: '', UVA: '' })
  const [toast, setToast] = useState('')
  const [aplicado, setAplicado] = useState<Indice | null>(null)

  const { data: resumen = [], isLoading: cargandoResumen } = useQuery<Resumen[]>({
    queryKey: ['indices-resumen'],
    queryFn: () => api.get('/indices/resumen').then((r) => r.data),
  })

  const { data: preview, isLoading: cargandoPreview, refetch: recargar } = useQuery<Preview>({
    queryKey: ['indices-preview', indiceAbierto],
    queryFn: () => api.get(`/indices/${indiceAbierto}/preview`).then((r) => r.data),
    enabled: !!indiceAbierto,
  })

  const aplicar = useMutation({
    mutationFn: ({ indice, porcentaje }: { indice: Indice; porcentaje: number }) =>
      api.post(`/indices/${indice}/ajustar`, { porcentaje }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['vinculos'] })
      qc.invalidateQueries({ queryKey: ['indices-resumen'] })
      qc.invalidateQueries({ queryKey: ['indices-preview'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setAplicado(vars.indice)
      mostrarToast(`✅ Ajuste ${vars.indice} aplicado correctamente`)
      setPctOverride((p) => ({ ...p, [vars.indice]: '' }))
    },
    onError: () => mostrarToast('Error al aplicar el ajuste'),
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function toggleIndice(ind: Indice) {
    setIndiceAbierto((prev) => (prev === ind ? null : ind))
    setAplicado(null)
  }

  function getPorcentaje(ind: Indice): number {
    const override = pctOverride[ind]
    if (override && !isNaN(Number(override))) return Number(override)
    return preview?.pctOficial ?? 0
  }

  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <div className="mb-6">
        <h1 className="font-display text-2xl text-carbon">Ajuste de índices</h1>
        <p className="text-piedra text-sm mt-1">
          Valores consultados en tiempo real desde BCRA e INDEC
        </p>
      </div>

      {/* Ley vigente */}
      <div className="card p-4 mb-6 flex items-start gap-3 border-l-4 border-l-arena">
        <Info size={16} className="text-piedra mt-0.5 shrink-0" />
        <p className="text-xs text-carbon">
          <span className="font-semibold">Marco legal:</span> Ley 27.737 / DNU 70/2023 — Los contratos de alquiler
          se actualizan según el índice pactado (ICL, IPC o UVA) cada 3, 6 o 12 meses.
          El sistema consulta el valor publicado por BCRA e INDEC para el período exacto de cada contrato.
        </p>
      </div>

      {cargandoResumen && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="space-y-3">
        {(['ICL', 'IPC', 'UVA'] as Indice[]).map((ind) => {
          const info = INDICE_INFO[ind]
          const res = resumen.find((r) => r.indice === ind)
          const abierto = indiceAbierto === ind
          const sinContratos = !res || res.contratos === 0

          return (
            <div key={ind} className={`card overflow-hidden border-l-4 ${info.color}`}>
              {/* Header del índice */}
              <button
                onClick={() => !sinContratos && toggleIndice(ind)}
                disabled={sinContratos}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-crema/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-display text-lg text-carbon">{info.label}</span>
                      <span className="text-xs text-piedra">{info.desc}</span>
                    </div>
                    <p className="text-[11px] text-arena text-left">{info.fuente}</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-carbon">
                      {res?.contratos ?? 0} contratos activos
                    </p>
                    {res?.diasProximoAjuste !== null && res?.diasProximoAjuste !== undefined && (
                      <p className={`text-xs ${
                        (res.diasProximoAjuste ?? 0) < 0 ? 'text-red-600 font-semibold' :
                        (res.diasProximoAjuste ?? 0) <= 30 ? 'text-amber-600 font-semibold' :
                        'text-arena'
                      }`}>
                        {(res.diasProximoAjuste ?? 0) < 0
                          ? `⚠️ Vencido hace ${Math.abs(res.diasProximoAjuste ?? 0)} días`
                          : `Próx. ajuste en ${res.diasProximoAjuste} días`}
                      </p>
                    )}
                  </div>
                  {sinContratos
                    ? <span className="text-xs text-arena">Sin contratos</span>
                    : abierto ? <ChevronUp size={18} className="text-piedra" /> : <ChevronDown size={18} className="text-piedra" />
                  }
                </div>
              </button>

              {/* Panel expandido */}
              {abierto && (
                <div className="border-t border-arena px-5 py-4">
                  {cargandoPreview ? (
                    <div className="flex items-center gap-3 py-4 text-piedra text-sm">
                      <RefreshCw size={16} className="animate-spin" />
                      Consultando APIs de BCRA / INDEC...
                    </div>
                  ) : preview && preview.indice === ind ? (
                    <>
                      {/* Datos del índice */}
                      {preview.contratos[0]?.resultado && !preview.contratos[0].resultado.error ? (
                        <div className="grid grid-cols-3 gap-4 mb-5 p-4 bg-crema rounded-lg">
                          <div>
                            <p className="text-xs text-piedra uppercase tracking-wide mb-1">Valor período inicio</p>
                            <p className="text-lg font-bold text-carbon">
                              {preview.contratos[0].resultado.valorAnterior.valor.toLocaleString('es-AR', { maximumFractionDigits: 4 })}
                            </p>
                            <p className="text-xs text-arena">{formatFecha(preview.contratos[0].resultado.valorAnterior.fecha)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-piedra uppercase tracking-wide mb-1">Valor actual</p>
                            <p className="text-lg font-bold text-carbon">
                              {preview.contratos[0].resultado.valorActual.valor.toLocaleString('es-AR', { maximumFractionDigits: 4 })}
                            </p>
                            <p className="text-xs text-arena">{formatFecha(preview.contratos[0].resultado.valorActual.fecha)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-piedra uppercase tracking-wide mb-1">Variación del período</p>
                            <p className="text-2xl font-bold text-green-700">
                              +{preview.pctOficial}%
                            </p>
                            <p className="text-[11px] text-arena">{preview.fuente}</p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                          <AlertTriangle size={16} className="text-amber-500 shrink-0" />
                          <div>
                            <p className="text-sm font-semibold text-amber-800">No se pudo obtener datos de la API</p>
                            <p className="text-xs text-amber-700">{preview.contratos[0]?.resultado.error}</p>
                            <p className="text-xs text-amber-700 mt-1">Ingresá el porcentaje manualmente.</p>
                          </div>
                        </div>
                      )}

                      {/* Tabla de contratos */}
                      <div className="mb-5">
                        <h3 className="text-sm font-semibold text-carbon mb-2">
                          Contratos a actualizar ({preview.contratos.length})
                        </h3>
                        <div className="card overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-crema border-b border-arena">
                              <tr>
                                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
                                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                                <th className="text-right px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Actual</th>
                                <th className="text-right px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Nuevo monto</th>
                                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Próx. ajuste</th>
                              </tr>
                            </thead>
                            <tbody>
                              {preview.contratos.map((c) => (
                                <tr key={c.vinculoId} className="border-b border-crema last:border-0">
                                  <td className="px-4 py-2.5 text-carbon font-semibold">
                                    {c.persona.nombre} {c.persona.apellido}
                                    {c.vencido && (
                                      <span className="ml-1 text-[10px] text-red-500 font-bold">VENCIDO</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-carbon text-xs hidden md:table-cell">
                                    {c.propiedad.direccion}
                                  </td>
                                  <td className="px-4 py-2.5 text-right text-arena">
                                    {c.alquilerActual ? formatARS(c.alquilerActual) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-bold text-green-700">
                                    {c.nuevoMonto ? formatARS(
                                      Math.round((c.alquilerActual || 0) * (1 + getPorcentaje(ind) / 100))
                                    ) : '—'}
                                  </td>
                                  <td className="px-4 py-2.5 text-xs text-arena hidden lg:table-cell">
                                    {c.proximaActualizacion ? formatFecha(c.proximaActualizacion) : '—'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Aplicar ajuste */}
                      {aplicado === ind ? (
                        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                          <CheckCircle size={20} className="text-green-600" />
                          <div>
                            <p className="font-semibold text-green-800">Ajuste aplicado correctamente</p>
                            <p className="text-sm text-green-700">
                              Todos los contratos {ind} fueron actualizados al nuevo monto.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-end gap-4 p-4 bg-crema rounded-lg">
                          <div className="flex-1">
                            <label className="form-label">
                              Porcentaje a aplicar
                              {!pctOverride[ind] && preview.pctOficial > 0 && (
                                <span className="text-arena font-normal ml-1">(precargado desde {ind})</span>
                              )}
                            </label>
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                className="form-input bg-white w-36"
                                placeholder={preview.pctOficial > 0 ? `${preview.pctOficial}` : 'Ej: 25.5'}
                                value={pctOverride[ind]}
                                onChange={(e) => setPctOverride((p) => ({ ...p, [ind]: e.target.value }))}
                              />
                              <span className="text-carbon font-semibold text-lg">%</span>
                              <button
                                onClick={() => recargar()}
                                className="btn-ghost flex items-center gap-1 text-xs"
                                title="Recargar datos de la API"
                              >
                                <RefreshCw size={13} /> Actualizar
                              </button>
                            </div>
                            <p className="text-[11px] text-arena mt-1">
                              Podés editar el porcentaje si querés usar un valor diferente al oficial.
                            </p>
                          </div>
                          <button
                            onClick={() => {
                              const pct = getPorcentaje(ind)
                              if (!pct || pct <= 0) { mostrarToast('Ingresá un porcentaje válido'); return }
                              if (!confirm(`¿Aplicar ajuste ${ind} de ${pct}% a ${preview.contratos.length} contratos?`)) return
                              aplicar.mutate({ indice: ind, porcentaje: pct })
                            }}
                            disabled={aplicar.isPending}
                            className="btn-primary flex items-center gap-2 whitespace-nowrap"
                          >
                            <TrendingUp size={16} />
                            {aplicar.isPending ? 'Aplicando...' : `Aplicar +${getPorcentaje(ind)}%`}
                          </button>
                        </div>
                      )}
                    </>
                  ) : null}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
