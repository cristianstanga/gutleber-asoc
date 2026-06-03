import { useQuery } from '@tanstack/react-query'
import { Building2, User, Calendar, TrendingUp, CheckCircle2, Clock, AlertCircle, DollarSign } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import { useAuthStore } from '../store/auth'

interface Pago {
  id: string; concepto: string; monto: number; estado: string
  fechaVencimiento: string; fechaPago?: string; pagadoAlPropietario: boolean; fechaPagoPropietario?: string
}
interface Persona { id: string; nombre: string; apellido: string; whatsapp?: string }
interface Vinculo { id: string; tipo: string; alquilerActual: number; fechaInicio: string; fechaFin?: string; persona: Persona }
interface Propiedad {
  id: string; direccion: string; tipo: string; alquilerBase?: number
  administrada: boolean; imagenes: { url: string }[]
  vinculos: Vinculo[]; pagos: Pago[]; propietario: Persona | null
}

const estadoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDIENTE: { label: 'Pendiente', icon: <Clock size={12} />, color: 'text-yellow-600 bg-yellow-50' },
  PAGADO:    { label: 'Cobrado',   icon: <CheckCircle2 size={12} />, color: 'text-green-600 bg-green-50' },
  VENCIDO:   { label: 'Vencido',   icon: <AlertCircle size={12} />, color: 'text-red-600 bg-red-50' },
  MORA:      { label: 'En mora',   icon: <AlertCircle size={12} />, color: 'text-red-700 bg-red-50' },
}

export default function MisPropiedades() {
  const usuario = useAuthStore((s) => s.usuario)

  const { data: propiedades = [], isLoading } = useQuery<Propiedad[]>({
    queryKey: ['mis-propiedades'],
    queryFn: async () => (await api.get('/propiedades/mis')).data,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-piedra">Cargando...</div>
  )

  // Totales
  const totalAlquiler = propiedades.reduce((acc, p) => {
    const v = p.vinculos.find((v) => v.tipo === 'ALQUILER')
    return acc + (v?.alquilerActual ?? 0)
  }, 0)
  const pagosDisponibles = propiedades.flatMap((p) =>
    p.pagos.filter((pago) => pago.estado === 'PAGADO' && !pago.pagadoAlPropietario)
  )
  const montoDisponible = pagosDisponibles.reduce((acc, p) => acc + p.monto, 0)

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-carbon text-2xl">Mis propiedades</h1>
        <p className="text-piedra text-sm mt-0.5">Hola, {usuario?.nombre} — resumen de tu cartera</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Propiedades</p>
          <p className="font-display text-2xl text-carbon">{propiedades.length}</p>
          <p className="text-xs text-piedra mt-1">{propiedades.filter((p) => p.vinculos.length > 0).length} alquiladas</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Alquiler mensual</p>
          <p className="font-display text-2xl text-carbon">{formatARS(totalAlquiler)}</p>
          <p className="text-xs text-piedra mt-1">suma de contratos activos</p>
        </div>
        <div className="card p-4 border-l-4 border-green-400">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Disponible para cobrar</p>
          <p className="font-display text-2xl text-green-600">{formatARS(montoDisponible)}</p>
          <p className="text-xs text-piedra mt-1">{pagosDisponibles.length} pago{pagosDisponibles.length !== 1 ? 's' : ''} cobrado{pagosDisponibles.length !== 1 ? 's' : ''} por Gutleber</p>
        </div>
      </div>

      {/* Propiedades */}
      {propiedades.map((prop) => {
        const vinculoActivo = prop.vinculos.find((v) => v.tipo === 'ALQUILER')
        const pagosOrdenados = [...prop.pagos].sort(
          (a, b) => new Date(b.fechaVencimiento).getTime() - new Date(a.fechaVencimiento).getTime()
        )

        return (
          <div key={prop.id} className="card overflow-hidden">
            {/* Cabecera propiedad */}
            <div className="flex gap-4 p-4 border-b border-crema">
              {prop.imagenes[0] ? (
                <img src={prop.imagenes[0].url} alt="" className="w-20 h-20 object-cover rounded-lg flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-crema rounded-lg flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} className="text-piedra" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="font-medium text-carbon truncate">{prop.direccion}</h2>
                <p className="text-sm text-piedra capitalize">{prop.tipo.toLowerCase()}</p>
                {vinculoActivo ? (
                  <div className="flex items-center gap-4 mt-2 text-sm">
                    <span className="flex items-center gap-1 text-carbon">
                      <User size={12} className="text-piedra" />
                      {vinculoActivo.persona.nombre} {vinculoActivo.persona.apellido}
                    </span>
                    <span className="flex items-center gap-1 text-carbon font-medium">
                      <DollarSign size={12} className="text-piedra" />
                      {formatARS(vinculoActivo.alquilerActual)}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Building2 size={10} /> Sin inquilino
                  </span>
                )}
              </div>
              {vinculoActivo && (
                <div className="text-right text-xs text-piedra flex-shrink-0">
                  <div className="flex items-center gap-1 justify-end">
                    <Calendar size={10} />
                    Desde {formatFecha(vinculoActivo.fechaInicio)}
                  </div>
                  {vinculoActivo.fechaFin && (
                    <div className="mt-0.5">Hasta {formatFecha(vinculoActivo.fechaFin)}</div>
                  )}
                </div>
              )}
            </div>

            {/* Últimos pagos */}
            <div className="p-4">
              <p className="text-xs font-medium text-piedra uppercase tracking-wide mb-3">
                Últimos movimientos
              </p>
              {pagosOrdenados.length === 0 ? (
                <p className="text-sm text-piedra">Sin movimientos registrados</p>
              ) : (
                <div className="space-y-2">
                  {pagosOrdenados.slice(0, 4).map((pago) => {
                    const cfg = estadoConfig[pago.estado] ?? estadoConfig.PENDIENTE
                    return (
                      <div key={pago.id} className="flex items-center gap-3">
                        <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${cfg.color}`}>
                          {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-sm text-carbon flex-1 truncate">{pago.concepto}</span>
                        <span className="text-sm font-medium text-carbon">{formatARS(pago.monto)}</span>
                        <span className="text-xs text-piedra w-24 text-right">
                          {formatFecha(pago.fechaVencimiento)}
                        </span>
                        {pago.pagadoAlPropietario && (
                          <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle2 size={10} /> Transferido
                          </span>
                        )}
                        {pago.estado === 'PAGADO' && !pago.pagadoAlPropietario && (
                          <span className="flex items-center gap-1 text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
                            <TrendingUp size={10} /> En proceso
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )
      })}

      {propiedades.length === 0 && (
        <div className="card p-10 text-center text-piedra">
          <Building2 size={32} className="mx-auto mb-3 text-crema" />
          <p>No tenés propiedades asignadas. Contactá a Gutleber &amp; Asoc.</p>
        </div>
      )}
    </div>
  )
}
