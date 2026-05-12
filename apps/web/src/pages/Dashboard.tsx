import { useQuery } from '@tanstack/react-query'
import { Building2, Users, CreditCard, AlertTriangle, TrendingUp, MessageSquare, Clock, Home } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'

interface Kpis {
  totalPropiedades: number
  propEnAlquiler: number
  propEnVenta: number
  totalInquilinos: number
  pagosPendientes: number
  pagosEnMora: number
  recaudadoMes: number
  contratosVencer: number
  inboxNoLeidos: number
}

interface PagoAlerta {
  id: string
  concepto: string
  monto: number
  estado: string
  fechaVencimiento: string
  persona?: { nombre: string; apellido: string }
  propiedad?: { direccion: string }
}

const estadoBadge: Record<string, string> = {
  PENDIENTE: 'badge-yellow',
  PAGADO: 'badge-green',
  VENCIDO: 'badge-red',
  MORA: 'badge-red',
  ANULADO: 'badge-gray',
}

const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente',
  PAGADO: 'Pagado',
  VENCIDO: 'Vencido',
  MORA: 'En mora',
  ANULADO: 'Anulado',
}

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return (
      <div className="p-8 text-piedra text-sm animate-pulse">Cargando dashboard...</div>
    )
  }

  const kpis: Kpis = data.kpis

  const kpiCards = [
    { label: 'Propiedades', value: kpis.totalPropiedades, sub: `${kpis.propEnAlquiler} en alquiler · ${kpis.propEnVenta} en venta`, Icon: Building2, color: 'text-piedra' },
    { label: 'Inquilinos activos', value: kpis.totalInquilinos, sub: `${kpis.contratosVencer} contratos vencen pronto`, Icon: Users, color: 'text-piedra' },
    { label: 'Pagos pendientes', value: kpis.pagosPendientes, sub: `${kpis.pagosEnMora} en mora`, Icon: CreditCard, color: kpis.pagosEnMora > 0 ? 'text-red-600' : 'text-piedra' },
    { label: 'Recaudado este mes', value: formatARS(kpis.recaudadoMes), sub: '', Icon: TrendingUp, color: 'text-green-700' },
    { label: 'Inbox no leídos', value: kpis.inboxNoLeidos, sub: 'mensajes nuevos', Icon: MessageSquare, color: kpis.inboxNoLeidos > 0 ? 'text-blue-600' : 'text-piedra' },
  ]

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-carbon">Dashboard</h1>
        <p className="text-piedra text-sm mt-1">Resumen del estado actual del portfolio</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {kpiCards.map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-piedra uppercase tracking-wide">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            {sub && <p className="text-[11px] text-arena mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Alertas */}
      {data.alertas.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display text-lg text-carbon mb-3 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" /> Alertas de pagos
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema border-b border-arena">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Monto</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Vencimiento</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.alertas.map((p: PagoAlerta) => (
                  <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/50">
                    <td className="px-4 py-3 text-carbon">{p.persona ? `${p.persona.nombre} ${p.persona.apellido}` : '—'}</td>
                    <td className="px-4 py-3 text-carbon text-xs">{p.propiedad?.direccion || '—'}</td>
                    <td className="px-4 py-3 text-carbon font-semibold">{formatARS(p.monto)}</td>
                    <td className="px-4 py-3 text-carbon">{formatFecha(p.fechaVencimiento)}</td>
                    <td className="px-4 py-3">
                      <span className={estadoBadge[p.estado] || 'badge-gray'}>{estadoLabel[p.estado] || p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Últimos pagos */}
      {data.ultimosPagos.length > 0 && (
        <div>
          <h2 className="font-display text-lg text-carbon mb-3 flex items-center gap-2">
            <Clock size={18} className="text-piedra" /> Últimos movimientos
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema border-b border-arena">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Concepto</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
                  <th className="text-right px-4 py-3 text-xs text-piedra uppercase tracking-wide">Monto</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.ultimosPagos.map((p: PagoAlerta) => (
                  <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/50">
                    <td className="px-4 py-3 text-carbon text-xs">{p.concepto}</td>
                    <td className="px-4 py-3 text-carbon">{p.persona ? `${p.persona.nombre} ${p.persona.apellido}` : '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-carbon">{formatARS(p.monto)}</td>
                    <td className="px-4 py-3">
                      <span className={estadoBadge[p.estado] || 'badge-gray'}>{estadoLabel[p.estado] || p.estado}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {data.alertas.length === 0 && data.ultimosPagos.length === 0 && (
        <div className="card p-12 text-center">
          <Home size={32} className="text-arena mx-auto mb-3" />
          <p className="text-piedra">No hay datos aún. Cargá propiedades y contratos para empezar.</p>
        </div>
      )}
    </div>
  )
}
