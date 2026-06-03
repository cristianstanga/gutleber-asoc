import { useQuery } from '@tanstack/react-query'
import { Building2, Calendar, CheckCircle2, Clock, AlertCircle, TrendingUp } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import { useAuthStore } from '../store/auth'

interface Pago {
  id: string; concepto: string; monto: number; estado: string
  fechaVencimiento: string; fechaPago?: string
}
interface Propiedad {
  id: string; direccion: string; tipo: string
  imagenes: { url: string }[]
  propietario: { nombre: string; apellido: string } | null
}
interface Vinculo {
  id: string; alquilerActual: number; alquilerInicial: number
  fechaInicio: string; fechaFin?: string; indice?: string; periodicidad?: number
  propiedad: Propiedad
}

const estadoConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  PENDIENTE: { label: 'Pendiente', icon: <Clock size={12} />, color: 'text-yellow-600 bg-yellow-50' },
  PAGADO:    { label: 'Pagado',    icon: <CheckCircle2 size={12} />, color: 'text-green-600 bg-green-50' },
  VENCIDO:   { label: 'Vencido',  icon: <AlertCircle size={12} />, color: 'text-red-600 bg-red-50' },
  MORA:      { label: 'En mora',  icon: <AlertCircle size={12} />, color: 'text-red-700 bg-red-50' },
}

export default function MiContrato() {
  const usuario = useAuthStore((s) => s.usuario)

  const { data, isLoading, error } = useQuery<{ vinculo: Vinculo; pagos: Pago[] }>({
    queryKey: ['mi-contrato'],
    queryFn: async () => (await api.get('/vinculos/mi-contrato')).data,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-64 text-piedra">Cargando...</div>
  )

  if (error || !data) return (
    <div className="flex flex-col items-center justify-center h-64 text-piedra gap-3">
      <Building2 size={32} className="text-crema" />
      <p>No tenés un contrato activo. Contactá a Gutleber &amp; Asoc.</p>
    </div>
  )

  const { vinculo, pagos } = data
  const prop = vinculo.propiedad

  const pendiente = pagos.find((p) => p.estado === 'PENDIENTE' || p.estado === 'VENCIDO')
  const pagosOrdenados = [...pagos].sort(
    (a, b) => new Date(b.fechaVencimiento).getTime() - new Date(a.fechaVencimiento).getTime()
  )

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-carbon text-2xl">Mi contrato</h1>
        <p className="text-piedra text-sm mt-0.5">Hola, {usuario?.nombre}</p>
      </div>

      {/* Propiedad */}
      <div className="card overflow-hidden">
        <div className="flex gap-4 p-4">
          {prop.imagenes[0] ? (
            <img src={prop.imagenes[0].url} alt="" className="w-24 h-24 object-cover rounded-lg flex-shrink-0" />
          ) : (
            <div className="w-24 h-24 bg-crema rounded-lg flex items-center justify-center flex-shrink-0">
              <Building2 size={28} className="text-piedra" />
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-medium text-carbon">{prop.direccion}</h2>
            <p className="text-sm text-piedra capitalize">{prop.tipo.toLowerCase()}</p>
            {prop.propietario && (
              <p className="text-xs text-piedra mt-1">
                Propietario: {prop.propietario.nombre} {prop.propietario.apellido}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px bg-crema border-t border-crema">
          {[
            { label: 'Alquiler actual', value: formatARS(vinculo.alquilerActual) },
            { label: 'Alquiler inicial', value: formatARS(vinculo.alquilerInicial ?? 0) },
            { label: 'Inicio del contrato', value: formatFecha(vinculo.fechaInicio) },
            { label: 'Vencimiento', value: vinculo.fechaFin ? formatFecha(vinculo.fechaFin) : 'Indefinido' },
          ].map(({ label, value }) => (
            <div key={label} className="bg-white p-3">
              <p className="text-xs text-piedra">{label}</p>
              <p className="font-medium text-carbon text-sm mt-0.5">{value}</p>
            </div>
          ))}
        </div>

        {vinculo.indice && (
          <div className="px-4 py-3 bg-blue-50 border-t border-blue-100 flex items-center gap-2 text-sm text-blue-700">
            <TrendingUp size={14} />
            Ajuste por {vinculo.indice} cada {vinculo.periodicidad} meses
          </div>
        )}
      </div>

      {/* Próximo pago */}
      {pendiente && (
        <div className={`card p-4 flex items-center gap-4 border-l-4 ${
          pendiente.estado === 'VENCIDO' || pendiente.estado === 'MORA'
            ? 'border-red-400' : 'border-yellow-400'
        }`}>
          <div className="flex-1">
            <p className="text-xs text-piedra uppercase tracking-wide mb-0.5">Próximo pago</p>
            <p className="font-medium text-carbon">{pendiente.concepto}</p>
            <p className="text-xs text-piedra flex items-center gap-1 mt-0.5">
              <Calendar size={10} /> Vence {formatFecha(pendiente.fechaVencimiento)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl text-carbon">{formatARS(pendiente.monto)}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 mt-1 ${estadoConfig[pendiente.estado]?.color}`}>
              {estadoConfig[pendiente.estado]?.icon} {estadoConfig[pendiente.estado]?.label}
            </span>
          </div>
        </div>
      )}

      {/* Historial */}
      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-crema">
          <p className="text-sm font-medium text-carbon">Historial de pagos</p>
        </div>
        <div className="divide-y divide-crema">
          {pagosOrdenados.map((pago) => {
            const cfg = estadoConfig[pago.estado] ?? estadoConfig.PENDIENTE
            return (
              <div key={pago.id} className="px-4 py-3 flex items-center gap-3">
                <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
                <span className="text-sm text-carbon flex-1 truncate">{pago.concepto}</span>
                <span className="text-sm font-medium text-carbon">{formatARS(pago.monto)}</span>
                <span className="text-xs text-piedra w-24 text-right flex-shrink-0">
                  {formatFecha(pago.fechaVencimiento)}
                </span>
              </div>
            )
          })}
          {pagos.length === 0 && (
            <p className="p-4 text-sm text-piedra">Sin pagos registrados aún</p>
          )}
        </div>
      </div>
    </div>
  )
}
