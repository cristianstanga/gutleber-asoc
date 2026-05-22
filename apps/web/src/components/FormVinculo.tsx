import { useState, FormEvent } from 'react'
import { X, AlertCircle } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Propiedad { id: string; direccion: string; tipo: string; enAlquiler: boolean; administrada: boolean }
interface Persona { id: string; nombre: string; apellido: string; tipo: string }

interface Props { onClose: () => void }

const tipoLabel: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Dpto.', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}

export default function FormVinculo({ onClose }: Props) {
  const qc = useQueryClient()

  const [propiedadId, setPropiedadId] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState('ALQUILER')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10))
  const [fechaFin, setFechaFin] = useState('')
  const [alquilerInicial, setAlquilerInicial] = useState('')
  const [indice, setIndice] = useState('ICL')
  const [periodicidad, setPeriodicidad] = useState('3')
  const [honorariosPct, setHonorariosPct] = useState('8')
  const [notas, setNotas] = useState('')

  const { data: propiedades = [] } = useQuery<Propiedad[]>({
    queryKey: ['propiedades'],
    queryFn: () => api.get('/propiedades').then((r) => r.data),
  })

  const { data: personas = [] } = useQuery<Persona[]>({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then((r) => r.data),
  })

  const guardar = useMutation({
    mutationFn: (data: object) => api.post('/vinculos', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['vinculos'] })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      onClose()
    },
  })

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    guardar.mutate({
      propiedadId,
      personaId,
      tipo: tipoVinculo,
      fechaInicio,
      fechaFin: fechaFin || undefined,
      alquilerInicial: alquilerInicial ? Number(alquilerInicial) : undefined,
      indice: tipoVinculo === 'ALQUILER' ? indice : undefined,
      periodicidad: tipoVinculo === 'ALQUILER' ? Number(periodicidad) : undefined,
      honorariosPct: tipoVinculo === 'ALQUILER' ? Number(honorariosPct) : undefined,
      notas: notas || undefined,
    })
  }

  // Calcular próxima actualización para mostrar como info
  const proximaActualizacion = fechaInicio && periodicidad
    ? (() => {
        const d = new Date(fechaInicio)
        d.setMonth(d.getMonth() + Number(periodicidad))
        return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
      })()
    : null

  const propiedadesFiltradas = propiedades.filter((p) =>
    tipoVinculo === 'ALQUILER' ? (p.enAlquiler || p.administrada) :
    tipoVinculo === 'ADMINISTRACION' ? true : true
  )

  const inquilinos = personas.filter((p) =>
    tipoVinculo === 'ALQUILER' ? ['INQUILINO', 'INTERESADO'].includes(p.tipo) :
    tipoVinculo === 'VENTA' ? ['INTERESADO', 'INQUILINO', 'PROPIETARIO'].includes(p.tipo) :
    true
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena sticky top-0 bg-white">
          <h2 className="font-display text-xl text-carbon">Nuevo contrato</h2>
          <button onClick={onClose} className="p-1 hover:bg-crema rounded transition-colors">
            <X size={20} className="text-piedra" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">

          {/* Tipo de contrato */}
          <div>
            <label className="form-label">Tipo de contrato *</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'ALQUILER',       label: 'Alquiler' },
                { value: 'VENTA',          label: 'Venta' },
                { value: 'ADMINISTRACION', label: 'Administración' },
              ].map(({ value, label }) => (
                <label key={value}
                  className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded border cursor-pointer text-sm transition-colors ${
                    tipoVinculo === value
                      ? 'border-piedra bg-crema text-carbon font-semibold'
                      : 'border-arena text-arena hover:border-piedra'
                  }`}
                >
                  <input type="radio" name="tipo" value={value}
                    checked={tipoVinculo === value} onChange={() => setTipoVinculo(value)} className="hidden" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Propiedad */}
          <div>
            <label className="form-label">Propiedad *</label>
            <select className="form-select" value={propiedadId} onChange={(e) => setPropiedadId(e.target.value)} required>
              <option value="">— Seleccioná una propiedad —</option>
              {propiedadesFiltradas.map((p) => (
                <option key={p.id} value={p.id}>
                  {tipoLabel[p.tipo] || p.tipo} — {p.direccion}
                </option>
              ))}
            </select>
            {propiedadesFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> No hay propiedades disponibles para este tipo. Verificá el estado en Propiedades.
              </p>
            )}
          </div>

          {/* Persona */}
          <div>
            <label className="form-label">
              {tipoVinculo === 'ALQUILER' ? 'Inquilino *' : tipoVinculo === 'VENTA' ? 'Comprador *' : 'Propietario *'}
            </label>
            <select className="form-select" value={personaId} onChange={(e) => setPersonaId(e.target.value)} required>
              <option value="">— Seleccioná una persona —</option>
              {inquilinos.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Fecha inicio *</label>
              <input type="date" className="form-input" value={fechaInicio}
                onChange={(e) => setFechaInicio(e.target.value)} required />
            </div>
            <div>
              <label className="form-label">Fecha fin <span className="text-arena font-normal normal-case">(opcional)</span></label>
              <input type="date" className="form-input" value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          {/* Campos específicos de alquiler */}
          {tipoVinculo === 'ALQUILER' && (
            <div className="space-y-4 p-4 bg-crema rounded-lg">
              <p className="text-xs text-piedra uppercase tracking-wide font-semibold">Condiciones económicas</p>

              {/* Monto inicial */}
              <div>
                <label className="form-label">Alquiler inicial (ARS) *</label>
                <input type="number" min="0" className="form-input bg-white"
                  value={alquilerInicial} onChange={(e) => setAlquilerInicial(e.target.value)}
                  placeholder="180000" required={tipoVinculo === 'ALQUILER'} />
              </div>

              {/* Índice + Periodicidad */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Índice de ajuste</label>
                  <select className="form-select bg-white" value={indice} onChange={(e) => setIndice(e.target.value)}>
                    <option value="ICL">ICL — BCRA</option>
                    <option value="IPC">IPC — INDEC</option>
                    <option value="UVA">UVA</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Periodicidad ajuste</label>
                  <select className="form-select bg-white" value={periodicidad} onChange={(e) => setPeriodicidad(e.target.value)}>
                    <option value="3">Cada 3 meses</option>
                    <option value="6">Cada 6 meses</option>
                    <option value="12">Anual</option>
                  </select>
                </div>
              </div>

              {/* Info próximo ajuste */}
              {proximaActualizacion && (
                <div className="flex items-start gap-2 bg-white rounded p-3 border border-arena">
                  <AlertCircle size={14} className="text-piedra mt-0.5 shrink-0" />
                  <div className="text-xs text-carbon">
                    <p className="font-semibold">Primer ajuste programado: {proximaActualizacion}</p>
                    <p className="text-arena mt-0.5">Ley 27.737 / DNU 70/2023 — ajuste por {indice} cada {periodicidad} meses</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Honorarios */}
          {tipoVinculo === 'ALQUILER' && (
            <div>
              <label className="form-label">Honorarios de administración (%)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range" min={0} max={20} step={0.5}
                  value={honorariosPct}
                  onChange={e => setHonorariosPct(e.target.value)}
                  className="flex-1 accent-carbon"
                />
                <div className="flex items-center gap-1">
                  <input
                    type="number" min={0} max={20} step={0.5}
                    value={honorariosPct}
                    onChange={e => setHonorariosPct(e.target.value)}
                    className="form-input w-16 text-center font-semibold text-sm"
                  />
                  <span className="text-sm text-piedra">%</span>
                </div>
              </div>
              <p className="text-xs text-arena mt-1">
                Honorarios negociados con el propietario. Se aplican al generar cada liquidación.
              </p>
            </div>
          )}

          {/* Notas */}
          <div>
            <label className="form-label">Notas del contrato</label>
            <textarea className="form-input resize-none" rows={2}
              value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Condiciones especiales, cláusulas adicionales..." />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-crema">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={guardar.isPending} className="btn-primary px-6">
              {guardar.isPending ? 'Guardando...' : 'Crear contrato'}
            </button>
          </div>

          {guardar.isError && (
            <p className="text-red-600 text-sm text-center">
              {(guardar.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
