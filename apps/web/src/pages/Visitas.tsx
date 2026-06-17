import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Clock, CheckCircle, XCircle, Phone, Building2, Lock, Unlock } from 'lucide-react'
import { api, formatFecha } from '../lib/api'

interface Visita {
  id: string
  nombreContacto: string
  numeroContacto: string
  fechaPropuesta: string
  fechaSolicitada?: string
  fechaConfirmada?: string
  estado: 'PENDIENTE_CONFIRMACION' | 'CONFIRMADA' | 'REPROGRAMADA' | 'REALIZADA' | 'CANCELADA'
  notas?: string
  propiedad?: { id: string; direccion: string }
  createdAt: string
}

interface TurnoBloqueado {
  id: string
  fecha: string
  motivo?: string
}

interface Disponibilidad {
  fecha: string
  todos: string[]
  disponibles: string[]
}

const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE_CONFIRMACION: 'Pendiente de confirmar',
  CONFIRMADA: 'Confirmada',
  REPROGRAMADA: 'Reprogramada',
  REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada',
}
const ESTADO_COLOR: Record<string, string> = {
  PENDIENTE_CONFIRMACION: 'bg-amber-100 text-amber-700',
  CONFIRMADA: 'bg-green-100 text-green-700',
  REPROGRAMADA: 'bg-blue-100 text-blue-700',
  REALIZADA: 'bg-gray-100 text-gray-600',
  CANCELADA: 'bg-red-100 text-red-500',
}

function formatSlotAR(iso: string) {
  return new Date(iso).toLocaleTimeString('es-AR', {
    hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function labelDiaAR(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: 'America/Argentina/Buenos_Aires',
  })
}

function fechaARFromISO(iso: string) {
  // ISO UTC → YYYY-MM-DD en AR (UTC-3)
  const d = new Date(new Date(iso).getTime() - 3 * 60 * 60 * 1000)
  return d.toISOString().slice(0, 10)
}

function proximosDias(n: number): string[] {
  const dias: string[] = []
  const cursor = new Date()
  while (dias.length < n) {
    if (cursor.getDay() !== 0) {
      dias.push(cursor.toISOString().slice(0, 10))
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

export default function Visitas() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<string>('PENDIENTE_CONFIRMACION')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [fechaConfirm, setFechaConfirm] = useState('')
  const [slotSeleccionado, setSlotSeleccionado] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [tabActiva, setTabActiva] = useState<'visitas' | 'disponibilidad'>('visitas')
  const [fechaBloqueo, setFechaBloqueo] = useState(new Date().toISOString().slice(0, 10))

  const { data: visitas = [], isLoading } = useQuery<Visita[]>({
    queryKey: ['visitas', filtro],
    queryFn: () => api.get('/visitas', { params: filtro ? { estado: filtro } : {} }).then(r => r.data),
    refetchInterval: 15000,
  })

  const { data: dispConfirm } = useQuery<Disponibilidad>({
    queryKey: ['disponibilidad', fechaConfirm],
    queryFn: () => api.get('/visitas/disponibilidad', { params: { fecha: fechaConfirm } }).then(r => r.data),
    enabled: !!fechaConfirm,
  })

  const { data: dispBloqueo } = useQuery<Disponibilidad>({
    queryKey: ['disponibilidad', fechaBloqueo],
    queryFn: () => api.get('/visitas/disponibilidad', { params: { fecha: fechaBloqueo } }).then(r => r.data),
    enabled: !!fechaBloqueo,
  })

  const { data: bloqueados = [] } = useQuery<TurnoBloqueado[]>({
    queryKey: ['bloqueados', fechaBloqueo],
    queryFn: () => api.get('/visitas/bloqueados', { params: { fecha: fechaBloqueo } }).then(r => r.data),
    enabled: !!fechaBloqueo,
  })

  const confirmar = useMutation({
    mutationFn: ({ id, slot }: { id: string; slot: string }) =>
      api.patch(`/visitas/${id}/confirmar`, { fechaConfirmada: slot }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] })
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      setConfirmando(null)
      setFechaConfirm('')
      setSlotSeleccionado(null)
      mostrarToast('Visita confirmada — se le avisó al interesado por WhatsApp')
    },
    onError: () => mostrarToast('Error al confirmar'),
  })

  const cancelar = useMutation({
    mutationFn: (id: string) => api.patch(`/visitas/${id}/cancelar`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] })
      mostrarToast('Visita cancelada')
    },
  })

  const bloquear = useMutation({
    mutationFn: (slot: string) => api.post('/visitas/bloquear', { fecha: slot }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['bloqueados'] })
    },
  })

  const desbloquear = useMutation({
    mutationFn: (id: string) => api.delete(`/visitas/bloquear/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['disponibilidad'] })
      qc.invalidateQueries({ queryKey: ['bloqueados'] })
    },
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  function abrirConfirmar(v: Visita) {
    setConfirmando(v.id)
    setSlotSeleccionado(null)
    if (v.fechaSolicitada) {
      setFechaConfirm(fechaARFromISO(v.fechaSolicitada))
    } else {
      const manana = new Date()
      manana.setDate(manana.getDate() + 1)
      setFechaConfirm(manana.toISOString().slice(0, 10))
    }
  }

  const dias = proximosDias(5)

  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon flex items-center gap-2">
            <CalendarCheck size={22} className="text-piedra" /> Visitas
          </h1>
          <p className="text-piedra text-sm mt-1">Pedidos de visita captados por el agente IA y por el equipo.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg overflow-hidden border border-gray-200">
            <button
              onClick={() => setTabActiva('visitas')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${tabActiva === 'visitas' ? 'bg-carbon text-white' : 'bg-white text-piedra hover:bg-gray-50'}`}
            >
              Visitas
            </button>
            <button
              onClick={() => setTabActiva('disponibilidad')}
              className={`px-4 py-1.5 text-sm font-medium transition-colors ${tabActiva === 'disponibilidad' ? 'bg-carbon text-white' : 'bg-white text-piedra hover:bg-gray-50'}`}
            >
              Disponibilidad
            </button>
          </div>
          {tabActiva === 'visitas' && (
            <select className="form-select text-sm w-56" value={filtro} onChange={e => setFiltro(e.target.value)}>
              <option value="">Todos los estados</option>
              {Object.entries(ESTADO_LABEL).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── TAB: VISITAS ── */}
      {tabActiva === 'visitas' && (
        <>
          {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}
          {!isLoading && visitas.length === 0 && (
            <div className="card p-12 text-center">
              <CalendarCheck size={32} className="text-muted mx-auto mb-3" />
              <p className="text-piedra">Sin visitas en este estado.</p>
            </div>
          )}

          <div className="space-y-3">
            {visitas.map(v => (
              <div key={v.id} className="card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-carbon">{v.nombreContacto}</p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${ESTADO_COLOR[v.estado]}`}>
                        {ESTADO_LABEL[v.estado]}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-piedra mb-0.5">
                      <Building2 size={11} /> {v.propiedad?.direccion || 'Propiedad no identificada'}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-piedra mb-0.5">
                      <Phone size={11} /> {v.numeroContacto}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-piedra">
                      <Clock size={11} /> Solicitado: "{v.fechaPropuesta}"
                    </div>
                    {v.fechaSolicitada && (
                      <p className="text-xs text-blue-700 font-semibold mt-0.5">
                        ★ Slot elegido: {labelDiaAR(v.fechaSolicitada)} a las {formatSlotAR(v.fechaSolicitada)}
                      </p>
                    )}
                    {v.fechaConfirmada && (
                      <p className="text-xs text-green-700 font-semibold mt-1">
                        Confirmada para {formatFecha(v.fechaConfirmada)}
                      </p>
                    )}
                  </div>

                  {v.estado === 'PENDIENTE_CONFIRMACION' && (
                    <div className="flex flex-col gap-2 shrink-0">
                      {confirmando === v.id ? (
                        <div className="flex flex-col items-end gap-2 min-w-[280px]">
                          <div className="w-full">
                            <p className="text-[11px] text-piedra mb-1.5 font-medium">Elegí el día:</p>
                            <div className="flex flex-wrap gap-1.5">
                              {dias.map(dia => (
                                <button
                                  key={dia}
                                  onClick={() => { setFechaConfirm(dia); setSlotSeleccionado(null) }}
                                  className={`text-[11px] px-2.5 py-1 rounded-md font-medium border transition-colors ${
                                    fechaConfirm === dia
                                      ? 'bg-carbon text-white border-carbon'
                                      : 'bg-white text-piedra border-gray-200 hover:border-carbon'
                                  }`}
                                >
                                  {new Date(dia + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'short', day: '2-digit', month: 'short' })}
                                </button>
                              ))}
                            </div>
                          </div>

                          {fechaConfirm && dispConfirm && (
                            <div className="w-full">
                              <p className="text-[11px] text-piedra mb-1.5 font-medium">Turno disponible:</p>
                              <div className="flex flex-wrap gap-1.5">
                                {dispConfirm.todos.map(slot => {
                                  const disponible = dispConfirm.disponibles.includes(slot)
                                  const seleccionado = slotSeleccionado === slot
                                  const esSolicitado = v.fechaSolicitada &&
                                    Math.abs(new Date(slot).getTime() - new Date(v.fechaSolicitada).getTime()) < 60000
                                  return (
                                    <button
                                      key={slot}
                                      onClick={() => disponible && setSlotSeleccionado(slot)}
                                      disabled={!disponible}
                                      className={`text-[11px] px-2.5 py-1 rounded-md font-semibold border transition-colors ${
                                        !disponible
                                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                                          : seleccionado
                                          ? 'bg-green-600 text-white border-green-600'
                                          : esSolicitado
                                          ? 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100'
                                          : 'bg-white text-carbon border-gray-200 hover:border-carbon'
                                      }`}
                                    >
                                      {formatSlotAR(slot)}{esSolicitado && !seleccionado ? ' ★' : ''}
                                    </button>
                                  )
                                })}
                              </div>
                              {slotSeleccionado && (
                                <p className="text-[11px] text-green-700 mt-1.5 font-medium">
                                  ✓ {labelDiaAR(slotSeleccionado)} {formatSlotAR(slotSeleccionado)}
                                </p>
                              )}
                            </div>
                          )}

                          <div className="flex gap-2 w-full justify-end mt-1">
                            <button
                              onClick={() => { setConfirmando(null); setFechaConfirm(''); setSlotSeleccionado(null) }}
                              className="text-xs text-piedra hover:text-carbon px-2 py-1"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => slotSeleccionado && confirmar.mutate({ id: v.id, slot: slotSeleccionado })}
                              disabled={!slotSeleccionado || confirmar.isPending}
                              className="btn-primary text-xs py-1.5 px-3 disabled:opacity-40"
                            >
                              Confirmar turno
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => abrirConfirmar(v)}
                          className="flex items-center gap-1.5 text-xs font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <CheckCircle size={13} /> Confirmar
                        </button>
                      )}
                      <button
                        onClick={() => cancelar.mutate(v.id)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <XCircle size={13} /> Cancelar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── TAB: DISPONIBILIDAD ── */}
      {tabActiva === 'disponibilidad' && (
        <div className="card p-6">
          <h2 className="font-semibold text-carbon mb-1">Gestión de disponibilidad</h2>
          <p className="text-xs text-piedra mb-4">
            Bloqueá turnos en los que no hay disponibilidad (feriados, ausencias, etc.).
            Los bloqueados no se ofrecen al agente IA ni aparecen como disponibles.
          </p>

          <div className="mb-4">
            <p className="text-xs text-piedra mb-2 font-medium">Seleccioná el día:</p>
            <div className="flex flex-wrap gap-2">
              {dias.map(dia => (
                <button
                  key={dia}
                  onClick={() => setFechaBloqueo(dia)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium border transition-colors ${
                    fechaBloqueo === dia
                      ? 'bg-carbon text-white border-carbon'
                      : 'bg-white text-carbon border-gray-200 hover:border-carbon'
                  }`}
                >
                  {new Date(dia + 'T12:00:00').toLocaleDateString('es-AR', {
                    weekday: 'long', day: '2-digit', month: 'short',
                  })}
                </button>
              ))}
            </div>
          </div>

          {dispBloqueo && (
            <div>
              <p className="text-xs text-piedra mb-2 font-medium">Turnos — clic para bloquear/desbloquear:</p>
              <div className="flex flex-wrap gap-2">
                {dispBloqueo.todos.map(slot => {
                  const disponible = dispBloqueo.disponibles.includes(slot)
                  const bloqueado = bloqueados.find(
                    b => Math.abs(new Date(b.fecha).getTime() - new Date(slot).getTime()) < 60000
                  )
                  const ocupadoVisita = !disponible && !bloqueado

                  return (
                    <button
                      key={slot}
                      onClick={() => {
                        if (bloqueado) desbloquear.mutate(bloqueado.id)
                        else if (!ocupadoVisita) bloquear.mutate(slot)
                      }}
                      disabled={ocupadoVisita}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border transition-colors ${
                        ocupadoVisita
                          ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
                          : bloqueado
                          ? 'bg-red-100 text-red-600 border-red-200 hover:bg-red-200'
                          : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                      }`}
                      title={ocupadoVisita ? 'Ocupado por visita confirmada' : bloqueado ? 'Clic para desbloquear' : 'Clic para bloquear'}
                    >
                      {bloqueado ? <Lock size={11} /> : ocupadoVisita ? <Clock size={11} /> : <Unlock size={11} />}
                      {formatSlotAR(slot)}
                      {ocupadoVisita && <span className="text-[9px]">visita</span>}
                      {bloqueado && <span className="text-[9px]">bloqueado</span>}
                    </button>
                  )
                })}
              </div>
              <div className="flex gap-5 mt-3 text-[11px] text-piedra">
                <span className="flex items-center gap-1"><Unlock size={10} className="text-green-600" /> Disponible</span>
                <span className="flex items-center gap-1"><Lock size={10} className="text-red-500" /> Bloqueado</span>
                <span className="flex items-center gap-1"><Clock size={10} /> Con visita confirmada</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
