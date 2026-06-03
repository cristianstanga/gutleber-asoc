import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { FileText, Plus, TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import FormVinculo from '../components/FormVinculo'

interface Vinculo {
  id: string
  tipo: string
  activo: boolean
  fechaInicio: string
  fechaFin?: string
  alquilerInicial?: number
  alquilerActual?: number
  indice?: string
  periodicidad?: number
  proximaActualizacion?: string
  notas?: string
  propiedad: { id: string; direccion: string; tipo: string }
  persona: { id: string; nombre: string; apellido: string; whatsapp?: string }
}

const tipoLabel: Record<string, string> = { ALQUILER: 'Alquiler', VENTA: 'Venta', ADMINISTRACION: 'Administración' }
const tipoBadge: Record<string, string> = { ALQUILER: 'badge-piedra', VENTA: 'badge-blue', ADMINISTRACION: 'badge-green' }

function diasHastaVencimiento(fecha?: string) {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function diasHastaAjuste(fecha?: string) {
  if (!fecha) return null
  const diff = new Date(fecha).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export default function Contratos() {
  const qc = useQueryClient()
  const [modalForm, setModalForm] = useState(false)
  const [soloActivos, setSoloActivos] = useState(true)

  const { data: vinculos = [], isLoading } = useQuery<Vinculo[]>({
    queryKey: ['vinculos', soloActivos],
    queryFn: () => api.get('/vinculos', { params: soloActivos ? { activo: true } : {} }).then((r) => r.data),
  })

  const cerrar = useMutation({
    mutationFn: (id: string) => api.patch(`/vinculos/${id}/cerrar`, { fechaFin: new Date().toISOString() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vinculos'] })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  function confirmarFinalizar(v: Vinculo) {
    if (confirm(
      `¿Finalizar el contrato de ${v.persona.nombre} ${v.persona.apellido}?\n\n` +
      `Propiedad: ${v.propiedad.direccion}\n\n` +
      `El contrato quedará marcado como Finalizado con fecha de hoy. ` +
      `Todos los pagos, recibos y liquidaciones históricos se conservan para auditoría.`
    )) {
      cerrar.mutate(v.id)
    }
  }

  const alquileres = vinculos.filter((v) => v.tipo === 'ALQUILER')
  const otrosContratos = vinculos.filter((v) => v.tipo !== 'ALQUILER')

  // Alertas: próx. vencimiento en 60 días o próx. ajuste en 30 días
  const alertasVencimiento = alquileres.filter((v) => {
    const d = diasHastaVencimiento(v.fechaFin)
    return d !== null && d <= 60 && d >= 0
  })
  const alertasAjuste = alquileres.filter((v) => {
    const d = diasHastaAjuste(v.proximaActualizacion)
    return d !== null && d <= 30 && d >= 0
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Contratos</h1>
          <p className="text-piedra text-sm mt-1">{vinculos.length} contratos {soloActivos ? 'activos' : 'en total'}</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-piedra cursor-pointer">
            <input type="checkbox" checked={soloActivos} onChange={(e) => setSoloActivos(e.target.checked)}
              className="rounded border-arena accent-piedra" />
            Solo activos
          </label>
          <button onClick={() => setModalForm(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo contrato
          </button>
        </div>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      {/* Alertas */}
      {(alertasVencimiento.length > 0 || alertasAjuste.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
          {alertasVencimiento.map((v) => (
            <div key={`venc-${v.id}`} className="card p-4 border-l-4 border-l-amber-400 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-carbon">
                  Contrato por vencer — {diasHastaVencimiento(v.fechaFin)} días
                </p>
                <p className="text-xs text-piedra">{v.persona.nombre} {v.persona.apellido} · {v.propiedad.direccion}</p>
                <p className="text-xs text-muted">Vence el {formatFecha(v.fechaFin!)}</p>
              </div>
            </div>
          ))}
          {alertasAjuste.map((v) => (
            <div key={`adj-${v.id}`} className="card p-4 border-l-4 border-l-blue-400 flex items-start gap-3">
              <TrendingUp size={18} className="text-blue-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-carbon">
                  Ajuste de índice próximo — {diasHastaAjuste(v.proximaActualizacion)} días
                </p>
                <p className="text-xs text-piedra">{v.persona.nombre} {v.persona.apellido} · {v.propiedad.direccion}</p>
                <p className="text-xs text-muted">
                  Índice {v.indice} el {formatFecha(v.proximaActualizacion!)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Contratos de alquiler */}
      {alquileres.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg text-carbon mb-3">Alquileres</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema border-b border-arena">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden md:table-cell">Inicio</th>
                  <th className="text-right px-4 py-3 text-xs text-piedra uppercase tracking-wide">Monto actual</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Índice</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Próx. ajuste</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {alquileres.map((v) => {
                  const diasAjuste = diasHastaAjuste(v.proximaActualizacion)
                  const diasVenc = diasHastaVencimiento(v.fechaFin)
                  return (
                    <tr key={v.id} className="border-b border-crema last:border-0 hover:bg-crema/40">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-carbon text-xs leading-snug">{v.propiedad.direccion}</p>
                      </td>
                      <td className="px-4 py-3 text-carbon">
                        {v.persona.nombre} {v.persona.apellido}
                      </td>
                      <td className="px-4 py-3 text-muted hidden md:table-cell">
                        {formatFecha(v.fechaInicio)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-carbon">{v.alquilerActual ? formatARS(v.alquilerActual) : '—'}</p>
                        {v.alquilerInicial && v.alquilerActual && v.alquilerInicial !== v.alquilerActual && (
                          <p className="text-[10px] text-muted">Inicial: {formatARS(v.alquilerInicial)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {v.indice ? <span className="badge-gray">{v.indice}</span> : <span className="text-muted">—</span>}
                        {v.periodicidad && <span className="text-[10px] text-muted ml-1">c/{v.periodicidad}m</span>}
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        {v.proximaActualizacion ? (
                          <div>
                            <p className="text-xs text-carbon">{formatFecha(v.proximaActualizacion)}</p>
                            {diasAjuste !== null && diasAjuste <= 30 && (
                              <p className="text-[10px] text-blue-600 font-semibold">{diasAjuste} días</p>
                            )}
                          </div>
                        ) : <span className="text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {v.activo ? (
                          <div>
                            <span className="badge-green flex items-center gap-1 w-fit">
                              <CheckCircle size={10} /> Activo
                            </span>
                            {diasVenc !== null && diasVenc <= 60 && (
                              <p className="text-[10px] text-amber-600 mt-0.5">{diasVenc}d hasta vencer</p>
                            )}
                          </div>
                        ) : (
                          <span className="badge-gray flex items-center gap-1 w-fit">
                            <XCircle size={10} /> Finalizado
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {v.activo && (
                          <button
                            onClick={() => confirmarFinalizar(v)}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors whitespace-nowrap"
                          >
                            Finalizar
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Otros contratos */}
      {otrosContratos.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-carbon mb-3">Venta y Administración</h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema border-b border-arena">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Persona</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inicio</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {otrosContratos.map((v) => (
                  <tr key={v.id} className="border-b border-crema last:border-0 hover:bg-crema/40">
                    <td className="px-4 py-3">
                      <span className={tipoBadge[v.tipo] || 'badge-gray'}>{tipoLabel[v.tipo]}</span>
                    </td>
                    <td className="px-4 py-3 text-carbon text-xs">{v.propiedad.direccion}</td>
                    <td className="px-4 py-3 text-carbon">{v.persona.nombre} {v.persona.apellido}</td>
                    <td className="px-4 py-3 text-muted">{formatFecha(v.fechaInicio)}</td>
                    <td className="px-4 py-3">
                      <span className={v.activo ? 'badge-green' : 'badge-gray'}>
                        {v.activo ? 'Activo' : 'Finalizado'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {v.activo && (
                        <button
                          onClick={() => confirmarFinalizar(v)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors"
                        >
                          Finalizar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {vinculos.length === 0 && !isLoading && (
        <div className="card p-12 text-center">
          <FileText size={32} className="text-muted mx-auto mb-3" />
          <p className="text-piedra mb-4">No hay contratos registrados</p>
          <button onClick={() => setModalForm(true)} className="btn-primary">Crear primer contrato</button>
        </div>
      )}

      {modalForm && <FormVinculo onClose={() => setModalForm(false)} />}
    </div>
  )
}
