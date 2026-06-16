import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CalendarCheck, Clock, CheckCircle, XCircle, Phone, Building2 } from 'lucide-react'
import { api, formatFecha } from '../lib/api'

interface Visita {
  id: string
  nombreContacto: string
  numeroContacto: string
  fechaPropuesta: string
  fechaConfirmada?: string
  estado: 'PENDIENTE_CONFIRMACION' | 'CONFIRMADA' | 'REPROGRAMADA' | 'REALIZADA' | 'CANCELADA'
  notas?: string
  propiedad?: { id: string; direccion: string }
  createdAt: string
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

export default function Visitas() {
  const qc = useQueryClient()
  const [filtro, setFiltro] = useState<string>('PENDIENTE_CONFIRMACION')
  const [confirmando, setConfirmando] = useState<string | null>(null)
  const [fechaInput, setFechaInput] = useState('')
  const [toast, setToast] = useState('')

  const { data: visitas = [], isLoading } = useQuery<Visita[]>({
    queryKey: ['visitas', filtro],
    queryFn: () => api.get('/visitas', { params: filtro ? { estado: filtro } : {} }).then(r => r.data),
    refetchInterval: 15000,
  })

  // Turnos ya confirmados — para que el operador no pise horarios (hasta sincronizar con Google Calendar)
  const { data: confirmadas = [] } = useQuery<Visita[]>({
    queryKey: ['visitas', 'CONFIRMADA'],
    queryFn: () => api.get('/visitas', { params: { estado: 'CONFIRMADA' } }).then(r => r.data),
  })

  const fechaSeleccionada = fechaInput ? fechaInput.slice(0, 10) : null
  const turnosDelDia = fechaSeleccionada
    ? confirmadas
        .filter(v => v.fechaConfirmada?.slice(0, 10) === fechaSeleccionada)
        .sort((a, b) => (a.fechaConfirmada! < b.fechaConfirmada! ? -1 : 1))
    : []

  const confirmar = useMutation({
    mutationFn: ({ id, fecha }: { id: string; fecha: string }) =>
      api.patch(`/visitas/${id}/confirmar`, { fechaConfirmada: fecha }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['visitas'] })
      setConfirmando(null)
      setFechaInput('')
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

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

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
        <select className="form-select text-sm w-56" value={filtro} onChange={e => setFiltro(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_LABEL).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </div>

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
                  <Clock size={11} /> Propuesto: "{v.fechaPropuesta}"
                </div>
                {v.fechaConfirmada && (
                  <p className="text-xs text-green-700 font-semibold mt-1">
                    Confirmada para {formatFecha(v.fechaConfirmada)}
                  </p>
                )}
              </div>

              {v.estado === 'PENDIENTE_CONFIRMACION' && (
                <div className="flex flex-col gap-2 shrink-0">
                  {confirmando === v.id ? (
                    <div className="flex flex-col items-end gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="datetime-local"
                          className="form-input text-xs py-1.5"
                          value={fechaInput}
                          onChange={e => setFechaInput(e.target.value)}
                        />
                        <button
                          onClick={() => fechaInput && confirmar.mutate({ id: v.id, fecha: fechaInput })}
                          disabled={!fechaInput || confirmar.isPending}
                          className="btn-primary text-xs py-1.5 px-3"
                        >
                          Confirmar
                        </button>
                      </div>
                      {turnosDelDia.length > 0 && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 max-w-xs">
                          <p className="font-semibold mb-0.5">Ya hay {turnosDelDia.length} turno(s) ese día:</p>
                          {turnosDelDia.map(t => (
                            <p key={t.id}>
                              {new Date(t.fechaConfirmada!).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} — {t.nombreContacto}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmando(v.id)}
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
    </div>
  )
}
