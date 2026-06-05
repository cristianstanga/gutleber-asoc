import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, ReferenceLine,
} from 'recharts'
import {
  Building2, User, Calendar, TrendingUp, CheckCircle2, Clock,
  DollarSign, ChevronDown, ChevronUp, Award, AlertTriangle, FileDown,
} from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import { useAuthStore } from '../store/auth'

interface Pago { id: string; monto: number; estado: string; fechaVencimiento: string; pagadoAlPropietario: boolean }
interface Persona { nombre: string; apellido: string }
interface Vinculo { tipo: string; alquilerActual: number; fechaInicio: string; fechaFin?: string; persona: Persona }
interface Propiedad {
  id: string; direccion: string; tipo: string; barrio?: string
  imagenes: { url: string }[]; vinculos: Vinculo[]; pagos: Pago[]
  propietario: Persona | null
}
interface Analytics {
  demoraPorMes: { mes: string; diasDemora: number; estado: string; monto: number }[]
  statsInquilino: { totalPagos: number; pagadosATiempo: number; promedioDiasDemora: number; maxDiasDemora: number; enMora: number }
  statsGlobal: { promedioDiasDemora: number; porcentajeATiempo: number; totalInquilinos: number; porcentajeInquilinosConMejorComportamiento: number | null }
  flujoCaja: { mes: string; cobrado: number; neto: number; transferido: number }[]
  proximoAjuste: { fecha: string; diasRestantes: number; alquilerActual: number; indice: string } | null
}

const estadoBadge: Record<string, string> = {
  PENDIENTE: 'bg-yellow-50 text-yellow-700',
  PAGADO: 'bg-green-50 text-green-700',
  VENCIDO: 'bg-red-50 text-red-700',
  MORA: 'bg-red-100 text-red-800',
}

function TooltipARS({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-crema rounded-lg shadow-lg p-3 text-xs">
      <p className="font-medium text-carbon mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }}>{p.name}: {typeof p.value === 'number' && p.value > 1000 ? formatARS(p.value) : `${p.value} días`}</p>
      ))}
    </div>
  )
}

function AnalyticsPanel({ propiedadId }: { propiedadId: string }) {
  const [descargando, setDescargando] = useState(false)
  const { data, isLoading } = useQuery<Analytics>({
    queryKey: ['analytics', propiedadId],
    queryFn: async () => (await api.get(`/propiedades/${propiedadId}/analytics`)).data,
  })

  async function descargarPDF() {
    setDescargando(true)
    try {
      const res = await api.get(`/propiedades/${propiedadId}/resumen-pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a'); a.href = url; a.download = `resumen-propiedad.pdf`; a.click()
      URL.revokeObjectURL(url)
    } finally {
      setDescargando(false)
    }
  }

  if (isLoading) return <div className="p-6 text-center text-piedra text-sm">Cargando análisis...</div>
  if (!data) return null

  const { demoraPorMes, statsInquilino, statsGlobal, flujoCaja, proximoAjuste } = data
  const pctATiempo = statsInquilino.totalPagos ? +((statsInquilino.pagadosATiempo / statsInquilino.totalPagos) * 100).toFixed(0) : 0
  const mejorQuePromedio = statsInquilino.promedioDiasDemora <= statsGlobal.promedioDiasDemora
  const disponible = flujoCaja.reduce((a, f) => a + (f.neto - f.transferido), 0)

  return (
    <div className="border-t border-crema bg-gray-50/50 p-5 space-y-6">

      {/* ── Fila 1: Stats del inquilino ──────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-piedra uppercase tracking-wider mb-3">Comportamiento del inquilino</p>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white rounded-xl border border-crema p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-piedra">Pagos a tiempo</p>
              <CheckCircle2 size={14} className="text-green-500" />
            </div>
            <p className="font-display text-2xl text-carbon">{pctATiempo}%</p>
            <p className="text-xs text-piedra mt-1">{statsInquilino.pagadosATiempo} de {statsInquilino.totalPagos} pagos</p>
            <div className="mt-2 h-1.5 bg-crema rounded-full overflow-hidden">
              <div className="h-full bg-green-400 rounded-full" style={{ width: `${pctATiempo}%` }} />
            </div>
          </div>

          <div className={`rounded-xl border p-4 ${mejorQuePromedio ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-piedra">vs. otros inquilinos</p>
              {mejorQuePromedio ? <Award size={14} className="text-green-600" /> : <AlertTriangle size={14} className="text-amber-600" />}
            </div>
            <p className={`font-display text-2xl ${mejorQuePromedio ? 'text-green-700' : 'text-amber-700'}`}>
              {statsInquilino.promedioDiasDemora}d
            </p>
            <p className="text-xs text-piedra mt-1">promedio demora · Base: {statsGlobal.promedioDiasDemora}d</p>
            {statsGlobal.porcentajeInquilinosConMejorComportamiento !== null && (
              <p className={`text-xs font-medium mt-1 ${mejorQuePromedio ? 'text-green-700' : 'text-amber-700'}`}>
                {mejorQuePromedio
                  ? `Mejor que el ${100 - (statsGlobal.porcentajeInquilinosConMejorComportamiento ?? 0)}% del mercado`
                  : `El ${statsGlobal.porcentajeInquilinosConMejorComportamiento}% paga antes`}
              </p>
            )}
          </div>
        </div>

        {/* Gráfico de demora por mes */}
        {demoraPorMes.length > 0 && (
          <div className="bg-white rounded-xl border border-crema p-4">
            <p className="text-xs font-medium text-carbon mb-3">Días de demora por mes</p>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={demoraPorMes} barSize={20}>
                <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9B9B9B' }} axisLine={false} tickLine={false} />
                <YAxis hide />
                <Tooltip content={<TooltipARS />} />
                <ReferenceLine y={statsGlobal.promedioDiasDemora} stroke="#F59E0B" strokeDasharray="4 4" />
                <Bar
                  dataKey="diasDemora"
                  radius={[4, 4, 0, 0]}
                  name="días"
                  fill="#4ADE80"
                />
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-piedra mt-1">— línea amarilla: promedio general ({statsGlobal.promedioDiasDemora}d)</p>
          </div>
        )}
      </div>

      {/* ── Fila 2: Flujo de caja ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-piedra uppercase tracking-wider">Flujo de caja</p>
          <div className={`flex items-center gap-1.5 text-sm font-medium px-3 py-1 rounded-full ${disponible > 0 ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-piedra'}`}>
            <DollarSign size={12} />
            {formatARS(disponible)} disponible
          </div>
        </div>
        <div className="bg-white rounded-xl border border-crema p-4">
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={flujoCaja}>
              <defs>
                <linearGradient id="colorNeto" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorTransferido" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#F0EDE8" />
              <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#9B9B9B' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#9B9B9B' }} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} axisLine={false} tickLine={false} />
              <Tooltip content={<TooltipARS />} />
              <Area type="monotone" dataKey="neto" stroke="#6366F1" strokeWidth={2} fill="url(#colorNeto)" name="Neto propietario" />
              <Area type="monotone" dataKey="transferido" stroke="#4ADE80" strokeWidth={2} fill="url(#colorTransferido)" name="Transferido" />
            </AreaChart>
          </ResponsiveContainer>
          <div className="flex gap-4 mt-2 text-[10px] text-piedra">
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-indigo-500 inline-block" /> Neto al propietario</span>
            <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-green-400 inline-block" /> Transferido</span>
          </div>
        </div>
      </div>

      {/* ── Próximo ajuste ────────────────────────────────────────────────────── */}
      {proximoAjuste && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${proximoAjuste.diasRestantes <= 30 ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'}`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${proximoAjuste.diasRestantes <= 30 ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
            {proximoAjuste.diasRestantes}d
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-carbon">Próximo ajuste por {proximoAjuste.indice}</p>
            <p className="text-xs text-piedra mt-0.5">{formatFecha(proximoAjuste.fecha)}</p>
            <p className="text-xs text-piedra">Alquiler actual: <span className="font-medium text-carbon">{formatARS(proximoAjuste.alquilerActual)}</span></p>
          </div>
          <TrendingUp size={20} className={proximoAjuste.diasRestantes <= 30 ? 'text-amber-500' : 'text-blue-400'} />
        </div>
      )}

      {/* ── Descargar resumen ─────────────────────────────────────────────────── */}
      <div className="flex justify-end pt-1">
        <button
          onClick={descargarPDF}
          disabled={descargando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-piedra/30 text-piedra hover:bg-crema hover:text-carbon text-xs transition-colors disabled:opacity-50"
        >
          <FileDown size={14} />
          {descargando ? 'Generando...' : 'Descargar resumen PDF'}
        </button>
      </div>
    </div>
  )
}

export default function MisPropiedades() {
  const usuario = useAuthStore((s) => s.usuario)
  const [expandida, setExpandida] = useState<string | null>(null)

  const { data: propiedades = [], isLoading } = useQuery<Propiedad[]>({
    queryKey: ['mis-propiedades'],
    queryFn: async () => (await api.get('/propiedades/mis')).data,
  })

  if (isLoading) return <div className="flex items-center justify-center h-64 text-piedra">Cargando...</div>

  const totalAlquiler = propiedades.reduce((acc, p) => {
    const v = p.vinculos.find((v) => v.tipo === 'ALQUILER')
    return acc + (v?.alquilerActual ?? 0)
  }, 0)
  const pagosDisponibles = propiedades.flatMap((p) => p.pagos.filter((pg) => pg.estado === 'PAGADO' && !pg.pagadoAlPropietario))
  const montoDisponible = pagosDisponibles.reduce((acc, p) => acc + p.monto, 0)
  const alquiladas = propiedades.filter((p) => p.vinculos.length > 0).length

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-carbon text-2xl">Mis propiedades</h1>
        <p className="text-piedra text-sm mt-0.5">Hola, {usuario?.nombre}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Propiedades</p>
          <p className="font-display text-2xl text-carbon">{propiedades.length}</p>
          <p className="text-xs text-piedra mt-1">{alquiladas} alquiladas · {propiedades.length - alquiladas} disponibles</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Ingreso mensual</p>
          <p className="font-display text-2xl text-carbon">{formatARS(totalAlquiler)}</p>
          <p className="text-xs text-piedra mt-1">contratos activos</p>
        </div>
        <div className="card p-4 border-l-4 border-green-400">
          <p className="text-xs text-piedra uppercase tracking-wide mb-1">Disponible hoy</p>
          <p className="font-display text-2xl text-green-600">{formatARS(montoDisponible)}</p>
          <p className="text-xs text-piedra mt-1">{pagosDisponibles.length} pago{pagosDisponibles.length !== 1 ? 's' : ''} por transferir</p>
        </div>
      </div>

      {/* Propiedades */}
      {propiedades.map((prop) => {
        const vinculo = prop.vinculos.find((v) => v.tipo === 'ALQUILER')
        const abierta = expandida === prop.id
        const ultimoPago = prop.pagos[0]

        return (
          <div key={prop.id} className="card overflow-hidden">
            {/* Header de la propiedad */}
            <div className="flex gap-4 p-4">
              {prop.imagenes[0] ? (
                <img src={prop.imagenes[0].url} alt="" className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
              ) : (
                <div className="w-20 h-20 bg-crema rounded-xl flex items-center justify-center flex-shrink-0">
                  <Building2 size={24} className="text-piedra" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="font-medium text-carbon">{prop.direccion}</h2>
                    <p className="text-xs text-piedra capitalize">{prop.tipo.toLowerCase()}{prop.barrio ? ` · ${prop.barrio}` : ''}</p>
                  </div>
                  {ultimoPago && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${estadoBadge[ultimoPago.estado] ?? 'bg-gray-100 text-gray-500'}`}>
                      {ultimoPago.estado === 'PAGADO' ? 'Al día' : ultimoPago.estado === 'MORA' ? 'En mora' : ultimoPago.estado === 'VENCIDO' ? 'Vencido' : 'Pendiente'}
                    </span>
                  )}
                </div>

                {vinculo ? (
                  <div className="flex items-center gap-4 mt-2 text-sm flex-wrap">
                    <span className="flex items-center gap-1 text-carbon">
                      <User size={12} className="text-piedra" />
                      {vinculo.persona.nombre} {vinculo.persona.apellido}
                    </span>
                    <span className="flex items-center gap-1 font-medium text-carbon">
                      <DollarSign size={12} className="text-piedra" />
                      {formatARS(vinculo.alquilerActual)}/mes
                    </span>
                    <span className="flex items-center gap-1 text-xs text-piedra">
                      <Calendar size={10} />
                      {formatFecha(vinculo.fechaInicio)}
                      {vinculo.fechaFin ? ` → ${formatFecha(vinculo.fechaFin)}` : ''}
                    </span>
                  </div>
                ) : (
                  <span className="mt-2 inline-flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Clock size={10} /> Disponible
                  </span>
                )}
              </div>
            </div>

            {/* Toggle analytics */}
            {vinculo && (
              <button
                onClick={() => setExpandida(abierta ? null : prop.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-xs text-piedra hover:text-carbon hover:bg-crema/50 transition-colors border-t border-crema"
              >
                {abierta ? <><ChevronUp size={14} /> Cerrar análisis</> : <><ChevronDown size={14} /> Ver análisis detallado</>}
              </button>
            )}

            {/* Panel de analytics */}
            {abierta && <AnalyticsPanel propiedadId={prop.id} />}
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
