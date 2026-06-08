import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Building2, Users, CreditCard, AlertTriangle, TrendingUp,
  MessageSquare, Clock, Home, Search, ChevronRight,
  Calendar, Receipt, X
} from 'lucide-react'
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

interface ProximoVencimiento {
  vinculoId: string
  nombre: string
  propiedad: string
  fechaFin: string
  diasRestantes: number
}

interface SinLiquidar {
  pagoId: string
  vinculoId?: string
  nombre: string
  propiedad: string
  monto: number
  honorariosPct: number
  fechaPago?: string
  periodo?: string
}

interface ResultadoBusqueda {
  vinculoId: string
  nombre: string
  propiedad: string
  alquiler: number
  pagoUrgente?: { id: string; estado: string; monto: number; fechaVencimiento: string } | null
}

const estadoBadge: Record<string, string> = {
  PENDIENTE: 'badge-yellow',
  PAGADO: 'badge-green',
  VENCIDO: 'badge-red',
  MORA: 'badge-red',
  ANULADO: 'badge-gray',
}
const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente', PAGADO: 'Pagado', VENCIDO: 'Vencido', MORA: 'En mora', ANULADO: 'Anulado',
}

// ─── Buscador rápido ──────────────────────────────────────────────────────────

function BuscadorRapido() {
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const { data: resultados = [], isFetching } = useQuery<ResultadoBusqueda[]>({
    queryKey: ['busqueda', q],
    queryFn: () => api.get('/dashboard/buscar', { params: { q } }).then(r => r.data),
    enabled: q.length >= 2,
    staleTime: 10_000,
  })

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function irAContrato(vinculoId: string) {
    setQ('')
    setOpen(false)
    navigate('/pagos', { state: { vinculoId } })
  }

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-piedra" />
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setOpen(true) }}
          onFocus={() => q.length >= 2 && setOpen(true)}
          placeholder="Buscar por inquilino, propietario o dirección..."
          className="form-input pl-9 pr-8 py-2.5 w-full"
        />
        {q && (
          <button onClick={() => { setQ(''); setOpen(false) }} className="absolute right-3 top-1/2 -translate-y-1/2 text-piedra hover:text-carbon">
            <X size={14} />
          </button>
        )}
      </div>

      {open && q.length >= 2 && (
        <div className="absolute top-full mt-1 w-full bg-white border border-arena rounded-xl shadow-xl z-50 overflow-hidden">
          {isFetching && (
            <p className="px-4 py-3 text-sm text-piedra animate-pulse">Buscando...</p>
          )}
          {!isFetching && resultados.length === 0 && (
            <p className="px-4 py-3 text-sm text-piedra">Sin resultados para "{q}"</p>
          )}
          {resultados.map(r => (
            <button
              key={r.vinculoId}
              onClick={() => irAContrato(r.vinculoId)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-crema transition-colors border-b border-crema last:border-0 text-left"
            >
              <div className="min-w-0">
                <p className="font-semibold text-carbon text-sm truncate">{r.nombre}</p>
                <p className="text-xs text-piedra truncate">{r.propiedad} · {formatARS(r.alquiler)}/mes</p>
                {r.pagoUrgente && (
                  <span className={`text-[10px] mt-0.5 inline-block ${estadoBadge[r.pagoUrgente.estado]}`}>
                    {estadoLabel[r.pagoUrgente.estado]} — {formatARS(r.pagoUrgente.monto)}
                  </span>
                )}
              </div>
              <ChevronRight size={14} className="text-piedra flex-shrink-0 ml-2" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data),
    refetchInterval: 60_000,
  })

  if (isLoading || !data) {
    return <div className="p-8 text-piedra text-sm animate-pulse">Cargando dashboard...</div>
  }

  const kpis: Kpis = data.kpis
  const proximosVencimientos: ProximoVencimiento[] = data.proximosVencimientos ?? []
  const sinLiquidar: SinLiquidar[] = data.sinLiquidar ?? []

  const kpiCards = [
    { label: 'Propiedades', value: kpis.totalPropiedades, sub: `${kpis.propEnAlquiler} en alquiler · ${kpis.propEnVenta} en venta`, Icon: Building2, color: 'text-piedra' },
    { label: 'Inquilinos activos', value: kpis.totalInquilinos, sub: `${kpis.contratosVencer} contratos vencen pronto`, Icon: Users, color: 'text-piedra' },
    { label: 'Pagos pendientes', value: kpis.pagosPendientes, sub: `${kpis.pagosEnMora} en mora`, Icon: CreditCard, color: kpis.pagosEnMora > 0 ? 'text-red-600' : 'text-piedra' },
    { label: 'Recaudado este mes', value: formatARS(kpis.recaudadoMes), sub: '', Icon: TrendingUp, color: 'text-green-700' },
    { label: 'Inbox no leídos', value: kpis.inboxNoLeidos, sub: 'mensajes nuevos', Icon: MessageSquare, color: kpis.inboxNoLeidos > 0 ? 'text-blue-600' : 'text-piedra' },
  ]

  return (
    <div className="p-8 space-y-8">
      {/* Header + Buscador */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <h1 className="font-display text-2xl text-carbon">Dashboard</h1>
          <p className="text-piedra text-sm mt-1">Resumen del estado actual del portfolio</p>
        </div>
        <div className="sm:w-96">
          <BuscadorRapido />
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {kpiCards.map(({ label, value, sub, Icon, color }) => (
          <div key={label} className="card p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-piedra uppercase tracking-wide">{label}</p>
              <Icon size={16} className={color} />
            </div>
            <p className={`text-2xl font-bold font-display ${color}`}>{value}</p>
            {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
          </div>
        ))}
      </div>

      {/* Operativo: Pendientes de liquidar + Próximos vencimientos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Sin liquidar al propietario */}
        {sinLiquidar.length > 0 && (
          <div>
            <h2 className="font-display text-base text-carbon mb-3 flex items-center gap-2">
              <Receipt size={16} className="text-amber-500" />
              Pendientes de liquidar al propietario
              <span className="ml-auto text-xs font-normal bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{sinLiquidar.length}</span>
            </h2>
            <div className="card overflow-hidden">
              {sinLiquidar.map(p => {
                const honorarios = Math.round(p.monto * p.honorariosPct / 100)
                const neto = p.monto - honorarios
                return (
                  <div key={p.pagoId} className="flex items-center justify-between px-4 py-3 border-b border-crema last:border-0 hover:bg-crema/50">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-carbon truncate">{p.nombre}</p>
                      <p className="text-xs text-piedra truncate">{p.propiedad}</p>
                      {p.periodo && <p className="text-[10px] text-muted">{p.periodo}</p>}
                    </div>
                    <div className="text-right ml-3 flex-shrink-0">
                      <p className="text-sm font-bold text-carbon">{formatARS(neto)}</p>
                      <p className="text-[10px] text-piedra">- {p.honorariosPct}% hon.</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Próximos vencimientos de contratos */}
        {proximosVencimientos.length > 0 && (
          <div>
            <h2 className="font-display text-base text-carbon mb-3 flex items-center gap-2">
              <Calendar size={16} className="text-blue-500" />
              Contratos por vencer
              <span className="ml-auto text-xs font-normal bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{proximosVencimientos.length}</span>
            </h2>
            <div className="card overflow-hidden">
              {proximosVencimientos.map(v => (
                <div key={v.vinculoId} className="flex items-center justify-between px-4 py-3 border-b border-crema last:border-0 hover:bg-crema/50">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-carbon truncate">{v.nombre}</p>
                    <p className="text-xs text-piedra truncate">{v.propiedad}</p>
                  </div>
                  <div className="text-right ml-3 flex-shrink-0">
                    <p className={`text-sm font-bold ${v.diasRestantes <= 30 ? 'text-red-600' : v.diasRestantes <= 60 ? 'text-amber-600' : 'text-carbon'}`}>
                      {v.diasRestantes}d
                    </p>
                    <p className="text-[10px] text-piedra">{formatFecha(v.fechaFin)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Alertas de pagos */}
      {data.alertas.length > 0 && (
        <div>
          <h2 className="font-display text-base text-carbon mb-3 flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-500" /> Alertas de pagos
          </h2>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-crema border-b border-arena">
                <tr>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden md:table-cell">Propiedad</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Monto</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden sm:table-cell">Vencimiento</th>
                  <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
                </tr>
              </thead>
              <tbody>
                {data.alertas.map((p: PagoAlerta) => (
                  <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/50">
                    <td className="px-4 py-3 text-carbon">{p.persona ? `${p.persona.nombre} ${p.persona.apellido}` : '—'}</td>
                    <td className="px-4 py-3 text-carbon text-xs hidden md:table-cell">{p.propiedad?.direccion || '—'}</td>
                    <td className="px-4 py-3 text-carbon font-semibold">{formatARS(p.monto)}</td>
                    <td className="px-4 py-3 text-carbon hidden sm:table-cell">{formatFecha(p.fechaVencimiento)}</td>
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

      {/* Últimos movimientos */}
      {data.ultimosPagos.length > 0 && (
        <div>
          <h2 className="font-display text-base text-carbon mb-3 flex items-center gap-2">
            <Clock size={16} className="text-piedra" /> Últimos movimientos
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

      {data.alertas.length === 0 && data.ultimosPagos.length === 0 && sinLiquidar.length === 0 && proximosVencimientos.length === 0 && (
        <div className="card p-12 text-center">
          <Home size={32} className="text-muted mx-auto mb-3" />
          <p className="text-piedra">No hay datos aún. Cargá propiedades y contratos para empezar.</p>
        </div>
      )}
    </div>
  )
}
