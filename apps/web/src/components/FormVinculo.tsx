import { useState, useEffect, FormEvent } from 'react'
import { X, AlertCircle, Building2, User, Calendar, TrendingUp, Settings } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Propietario { id: string; nombre: string; apellido: string }
interface Propiedad {
  id: string
  direccion: string
  tipo: string
  enAlquiler: boolean
  administrada: boolean
  alquilerBase?: number | null
  indiceActual?: string | null
  propietario?: Propietario | null
}
interface Persona { id: string; nombre: string; apellido: string; tipo: string }

interface Props { onClose: () => void }

const tipoLabel: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Dpto.', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}

function sumarMeses(isoDate: string, meses: number): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + meses)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function proximoAjuste(isoDate: string, periodicidad: number): string {
  if (!isoDate) return ''
  const d = new Date(isoDate)
  d.setMonth(d.getMonth() + periodicidad)
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function FormVinculo({ onClose }: Props) {
  const qc = useQueryClient()

  const [tipoVinculo, setTipoVinculo] = useState('ALQUILER')
  const [propiedadId, setPropiedadId] = useState('')
  const [personaId, setPersonaId] = useState('')
  const [fechaInicio, setFechaInicio] = useState(new Date().toISOString().slice(0, 10))
  const [duracionMeses, setDuracionMeses] = useState('24')
  const [alquilerInicial, setAlquilerInicial] = useState('')
  const [indice, setIndice] = useState('ICL')
  const [periodicidad, setPeriodicidad] = useState('3')
  const [administrado, setAdministrado] = useState(false)
  const [honorariosPct, setHonorariosPct] = useState('8')
  const [notas, setNotas] = useState('')
  const [alquilerDesdeProp, setAlquilerDesdeProp] = useState<number | null>(null)
  const [indiceDesdeProp, setIndiceDesdeProp] = useState<string | null>(null)

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

  const propiedadSeleccionada = propiedades.find((p) => p.id === propiedadId) ?? null

  // Pre-poblar valores de la propiedad al seleccionarla
  useEffect(() => {
    if (!propiedadSeleccionada) return
    if (propiedadSeleccionada.alquilerBase) {
      setAlquilerInicial(String(propiedadSeleccionada.alquilerBase))
      setAlquilerDesdeProp(propiedadSeleccionada.alquilerBase)
    } else {
      setAlquilerDesdeProp(null)
    }
    if (propiedadSeleccionada.indiceActual) {
      setIndice(propiedadSeleccionada.indiceActual)
      setIndiceDesdeProp(propiedadSeleccionada.indiceActual)
    } else {
      setIndiceDesdeProp(null)
    }
  }, [propiedadId]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    guardar.mutate({
      propiedadId,
      personaId,
      tipo: tipoVinculo,
      fechaInicio,
      duracionMeses: tipoVinculo === 'ALQUILER' ? Number(duracionMeses) : undefined,
      alquilerInicial: alquilerInicial ? Number(alquilerInicial) : undefined,
      indice: tipoVinculo === 'ALQUILER' ? indice : undefined,
      periodicidad: tipoVinculo === 'ALQUILER' ? Number(periodicidad) : undefined,
      administrado: tipoVinculo === 'ALQUILER' ? administrado : false,
      honorariosPct: administrado && tipoVinculo === 'ALQUILER' ? Number(honorariosPct) : 0,
      notas: notas || undefined,
    })
  }

  const propiedadesFiltradas = propiedades.filter((p) =>
    tipoVinculo === 'ALQUILER' ? (p.enAlquiler || p.administrada) : true
  )

  const personasFiltradas = personas.filter((p) =>
    tipoVinculo === 'ALQUILER' ? ['INQUILINO', 'INTERESADO'].includes(p.tipo) :
    tipoVinculo === 'VENTA' ? ['INTERESADO', 'INQUILINO', 'PROPIETARIO'].includes(p.tipo) :
    true
  )

  const fechaFinCalculada = tipoVinculo === 'ALQUILER' && fechaInicio && duracionMeses
    ? sumarMeses(fechaInicio, Number(duracionMeses))
    : null

  const primerAjuste = tipoVinculo === 'ALQUILER' && fechaInicio && periodicidad
    ? proximoAjuste(fechaInicio, Number(periodicidad))
    : null

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
                    checked={tipoVinculo === value}
                    onChange={() => { setTipoVinculo(value); setPropiedadId(''); setPersonaId('') }}
                    className="hidden" />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Propiedad */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <Building2 size={13} className="text-piedra" /> Propiedad *
            </label>
            <select className="form-select" value={propiedadId}
              onChange={(e) => setPropiedadId(e.target.value)} required>
              <option value="">— Seleccioná una propiedad —</option>
              {propiedadesFiltradas.map((p) => (
                <option key={p.id} value={p.id}>
                  {tipoLabel[p.tipo] || p.tipo} — {p.direccion}
                </option>
              ))}
            </select>
            {propiedadesFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertCircle size={12} /> No hay propiedades disponibles para este tipo.
              </p>
            )}

            {/* Propietario de la propiedad seleccionada */}
            {propiedadSeleccionada && (
              <div className="mt-2 flex items-center gap-2 text-xs text-piedra bg-crema rounded px-3 py-1.5">
                <User size={12} />
                {propiedadSeleccionada.propietario
                  ? <span>Propietario: <strong className="text-carbon">{propiedadSeleccionada.propietario.apellido}, {propiedadSeleccionada.propietario.nombre}</strong></span>
                  : <span className="text-amber-600">Sin propietario asignado — asignalo en la ficha de la propiedad</span>
                }
              </div>
            )}
          </div>

          {/* Persona (inquilino / comprador) */}
          <div>
            <label className="form-label flex items-center gap-1.5">
              <User size={13} className="text-piedra" />
              {tipoVinculo === 'ALQUILER' ? 'Inquilino *' : tipoVinculo === 'VENTA' ? 'Comprador *' : 'Propietario *'}
            </label>
            <select className="form-select" value={personaId}
              onChange={(e) => setPersonaId(e.target.value)} required>
              <option value="">— Seleccioná una persona —</option>
              {personasFiltradas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.apellido}, {p.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Fechas — solo alquiler tiene duración fija */}
          {tipoVinculo === 'ALQUILER' ? (
            <div>
              <label className="form-label flex items-center gap-1.5">
                <Calendar size={13} className="text-piedra" /> Vigencia del contrato *
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] text-muted mb-1">Fecha de inicio</p>
                  <input type="date" className="form-input" value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)} required />
                </div>
                <div>
                  <p className="text-[11px] text-muted mb-1">Duración (meses)</p>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="form-input"
                    value={duracionMeses}
                    onChange={e => setDuracionMeses(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="36"
                  />
                </div>
              </div>
              {fechaFinCalculada && (
                <p className="text-xs text-piedra mt-2 flex items-center gap-1.5">
                  <Calendar size={11} />
                  Vencimiento: <strong className="text-carbon">{fechaFinCalculada}</strong>
                </p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="form-label">Fecha inicio *</label>
                <input type="date" className="form-input" value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)} required />
              </div>
              <div>
                <label className="form-label">Fecha fin <span className="text-muted font-normal normal-case">(opcional)</span></label>
                <input type="date" className="form-input" />
              </div>
            </div>
          )}

          {/* Condiciones económicas — solo alquiler */}
          {tipoVinculo === 'ALQUILER' && (
            <div className="space-y-4 p-4 bg-crema rounded-lg">
              <p className="text-xs text-piedra uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <TrendingUp size={12} /> Condiciones económicas
              </p>

              <div>
                <label className="form-label">Alquiler inicial (ARS) *</label>
                <input type="number" min="0" className="form-input bg-white"
                  value={alquilerInicial} onChange={(e) => { setAlquilerInicial(e.target.value); setAlquilerDesdeProp(null) }}
                  placeholder="180000" required />
                {alquilerDesdeProp != null && Number(alquilerInicial) === alquilerDesdeProp && (
                  <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
                    <TrendingUp size={10} /> Valor de referencia de la propiedad — modificalo si se negoció diferente
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Índice de ajuste</label>
                  <select className="form-select bg-white" value={indice} onChange={(e) => { setIndice(e.target.value); setIndiceDesdeProp(null) }}>
                    <option value="ICL">ICL — BCRA</option>
                    <option value="IPC">IPC — INDEC</option>
                    <option value="UVA">UVA</option>
                  </select>
                  {indiceDesdeProp != null && indice === indiceDesdeProp && (
                    <p className="text-[11px] text-blue-600 mt-1 flex items-center gap-1">
                      <TrendingUp size={10} /> Índice de la propiedad
                    </p>
                  )}
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

              {primerAjuste && (
                <div className="flex items-start gap-2 bg-white rounded p-3 border border-arena">
                  <AlertCircle size={14} className="text-piedra mt-0.5 shrink-0" />
                  <div className="text-xs text-carbon">
                    <p className="font-semibold">Primer ajuste: {primerAjuste}</p>
                    <p className="text-muted mt-0.5">Ley 27.737 / DNU 70/2023 — por {indice} cada {periodicidad} meses</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Administración — solo alquiler */}
          {tipoVinculo === 'ALQUILER' && (
            <div className="space-y-3 p-4 border border-arena rounded-lg">
              <p className="text-xs text-piedra uppercase tracking-wide font-semibold flex items-center gap-1.5">
                <Settings size={12} /> Administración
              </p>

              {/* Toggle administrado */}
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-sm font-medium text-carbon">Administrado por Gutleber</p>
                  <p className="text-xs text-muted">Activá si gestionamos el cobro y la liquidación al propietario</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAdministrado(!administrado)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    administrado ? 'bg-carbon' : 'bg-arena'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    administrado ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </label>

              {/* Honorarios — solo si administrado */}
              {administrado && (
                <div className="pt-2 border-t border-arena">
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
                  <p className="text-xs text-muted mt-1">
                    Se aplican al generar cada liquidación al propietario.
                  </p>
                </div>
              )}
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
