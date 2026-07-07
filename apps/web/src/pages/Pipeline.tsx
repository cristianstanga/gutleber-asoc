import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { User, Bot, Eye, MessageSquare, CalendarCheck, TrendingUp } from 'lucide-react'
import { api } from '../lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Lead {
  id: string
  etapa: string
  tipoInteres?: string
  nombreCapturado?: string
  pushName?: string
  fotoPerfilUrl?: string
  numero: string
  telefonoReal?: string
  ultimoMensaje: string
  agenteActivo: boolean
  presupuesto?: number
  propiedadInteres?: { id: string; direccion: string }
  persona?: { nombre: string; apellido: string }
}

interface TopPropiedad {
  id: string
  direccion: string
  consultas: number
  visitas: number
  vistas: number
}

interface PipelineData {
  etapas: Record<string, number>
  leads: Lead[]
  funnel: { totalConsultas: number; interesados: number; conVisita: number; clientes: number }
  topPropiedades: TopPropiedad[]
  visitasTotal: number
}

// ─── Columnas del pipeline ────────────────────────────────────────────────────

const COLUMNAS = [
  { key: 'nuevos',    label: 'Nuevos',      etapas: ['NUEVO', 'CONSULTANDO'],              color: 'border-t-blue-400',   badge: 'bg-blue-100 text-blue-700'   },
  { key: 'interes',   label: 'Calificados', etapas: ['INTERESADO', 'RECOPILANDO'],         color: 'border-t-amber-400',  badge: 'bg-amber-100 text-amber-700' },
  { key: 'visita',    label: 'Visita',      etapas: ['VISITA_PENDIENTE'],                  color: 'border-t-purple-400', badge: 'bg-purple-100 text-purple-700' },
  { key: 'cliente',   label: 'Clientes',    etapas: ['CLIENTE'],                           color: 'border-t-green-400',  badge: 'bg-green-100 text-green-700' },
]

const ETAPA_OPCIONES = [
  { value: 'NUEVO',            label: 'Nuevo' },
  { value: 'CONSULTANDO',      label: 'Consultando' },
  { value: 'INTERESADO',       label: 'Interesado' },
  { value: 'RECOPILANDO',      label: 'Calificando' },
  { value: 'VISITA_PENDIENTE', label: 'Visita pendiente' },
  { value: 'CLIENTE',          label: 'Cliente' },
  { value: 'INACTIVO',         label: 'Inactivo' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function tiempoDesde(fecha: string) {
  const diff = Date.now() - new Date(fecha).getTime()
  const h = Math.floor(diff / 3600000)
  if (h < 1) return 'hace minutos'
  if (h < 24) return `hace ${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `hace ${d}d`
  return `hace ${Math.floor(d / 7)}s`
}

function nombreLead(l: Lead) {
  if (l.persona) return `${l.persona.nombre} ${l.persona.apellido}`.trim()
  return l.nombreCapturado || l.pushName || l.telefonoReal || l.numero
}

function pct(num: number, den: number) {
  if (!den) return '—'
  return Math.round((num / den) * 100) + '%'
}

// ─── Card del lead ────────────────────────────────────────────────────────────

function LeadCard({ lead, onCambiarEtapa, onAbrir }: {
  lead: Lead
  onCambiarEtapa: (id: string, etapa: string) => void
  onAbrir: (id: string) => void
}) {
  const nombre = nombreLead(lead)
  const iniciales = nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div
      className="bg-white rounded-lg border border-crema shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => onAbrir(lead.id)}
    >
      <div className="flex items-start gap-2">
        <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden bg-crema border border-arena flex items-center justify-center">
          {lead.fotoPerfilUrl
            ? <img src={lead.fotoPerfilUrl} alt={nombre} className="w-full h-full object-cover" />
            : <span className="text-[10px] font-bold text-piedra">{iniciales || <User size={12} />}</span>
          }
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-carbon truncate">{nombre}</p>
          {lead.propiedadInteres && (
            <p className="text-[11px] text-piedra truncate">{lead.propiedadInteres.direccion}</p>
          )}
        </div>
        {lead.agenteActivo && (
          <span title="Agente IA activo"><Bot size={12} className="text-green-500 shrink-0 mt-0.5" /></span>
        )}
      </div>

      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] text-arena">{tiempoDesde(lead.ultimoMensaje)}</span>
        {lead.tipoInteres && (
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-crema text-piedra font-medium">
            {lead.tipoInteres === 'ALQUILER' ? 'Alq.' : 'Vta.'}
          </span>
        )}
      </div>

      {/* Cambio de etapa */}
      <select
        className="mt-2 w-full text-[11px] border border-crema rounded px-1.5 py-1 text-piedra bg-white"
        value={lead.etapa}
        onClick={e => e.stopPropagation()}
        onChange={e => { e.stopPropagation(); onCambiarEtapa(lead.id, e.target.value) }}
      >
        {ETAPA_OPCIONES.map(o => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Pipeline() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filtroTipo, setFiltroTipo] = useState<'ALQUILER' | 'VENTA' | ''>('')

  const { data, isLoading } = useQuery<PipelineData>({
    queryKey: ['pipeline', filtroTipo],
    queryFn: () => api.get('/stats/pipeline', { params: filtroTipo ? { tipo: filtroTipo } : {} }).then(r => r.data),
    refetchInterval: 30000,
  })

  const cambiarEtapa = useMutation({
    mutationFn: ({ id, etapa }: { id: string; etapa: string }) =>
      api.patch(`/conversaciones/${id}`, { etapa }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['pipeline'] }),
  })

  function abrirEnInbox(convId: string) {
    navigate('/inbox', { state: { convId } })
  }

  const leads = data?.leads ?? []
  const funnel = data?.funnel
  const top = data?.topPropiedades ?? []

  const leadsActivos = leads.filter(l => l.etapa !== 'INACTIVO')
  const leadsInactivos = leads.filter(l => l.etapa === 'INACTIVO')

  return (
    <div className="h-screen flex flex-col bg-blancoRoto overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-crema px-6 py-4 flex items-center justify-between shrink-0">
        <div>
          <h1 className="font-display text-lg text-carbon">Pipeline CRM</h1>
          <p className="text-xs text-piedra">
            {leadsActivos.length} leads activos · {leadsInactivos.length} inactivos
          </p>
        </div>
        <div className="flex gap-2">
          {(['', 'ALQUILER', 'VENTA'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors ${
                filtroTipo === t
                  ? 'bg-petroleo text-white'
                  : 'bg-crema text-piedra hover:bg-arena/30'
              }`}
            >
              {t === '' ? 'Todos' : t === 'ALQUILER' ? 'Alquiler' : 'Venta'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto">

        {/* Kanban */}
        <div className="flex gap-4 p-4 min-w-max">
          {COLUMNAS.map(col => {
            const colLeads = leadsActivos.filter(l => col.etapas.includes(l.etapa))
            return (
              <div key={col.key} className="w-64 flex flex-col gap-2">
                <div className={`bg-white rounded-lg border-t-4 ${col.color} shadow-sm p-3`}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-carbon">{col.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${col.badge}`}>
                      {colLeads.length}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 min-h-[120px]">
                  {isLoading && (
                    <div className="bg-white rounded-lg border border-crema p-3 animate-pulse h-20" />
                  )}
                  {colLeads.map(lead => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      onCambiarEtapa={(id, etapa) => cambiarEtapa.mutate({ id, etapa })}
                      onAbrir={abrirEnInbox}
                    />
                  ))}
                  {!isLoading && colLeads.length === 0 && (
                    <div className="bg-white/50 rounded-lg border border-dashed border-arena p-4 text-center">
                      <p className="text-xs text-arena">Sin leads</p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 pb-6">

          {/* Embudo de conversión */}
          <div className="bg-white rounded-lg border border-crema shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={16} className="text-petroleo" />
              <h2 className="font-semibold text-carbon text-sm">Embudo de conversión</h2>
            </div>
            {funnel && (
              <div className="space-y-2">
                {[
                  { label: 'Consultas activas', value: funnel.totalConsultas, pctVal: null, color: 'bg-blue-400' },
                  { label: 'Interesados',        value: funnel.interesados,  pctVal: pct(funnel.interesados, funnel.totalConsultas), color: 'bg-amber-400' },
                  { label: 'Con visita',         value: funnel.conVisita,    pctVal: pct(funnel.conVisita, funnel.interesados),      color: 'bg-purple-400' },
                  { label: 'Clientes',           value: funnel.clientes,     pctVal: pct(funnel.clientes, funnel.conVisita),         color: 'bg-green-500' },
                ].map(row => (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-piedra">{row.label}</span>
                      <div className="flex items-center gap-2">
                        {row.pctVal && <span className="text-arena">{row.pctVal}</span>}
                        <span className="font-bold text-carbon">{row.value}</span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-crema rounded-full overflow-hidden">
                      <div
                        className={`h-full ${row.color} rounded-full transition-all`}
                        style={{ width: funnel.totalConsultas ? `${Math.round((row.value / funnel.totalConsultas) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top propiedades */}
          <div className="bg-white rounded-lg border border-crema shadow-sm p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare size={16} className="text-petroleo" />
              <h2 className="font-semibold text-carbon text-sm">Propiedades más consultadas</h2>
            </div>
            <div className="space-y-2">
              {top.length === 0 && !isLoading && (
                <p className="text-xs text-arena text-center py-4">Sin datos aún</p>
              )}
              {top.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="text-[11px] font-bold text-arena w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-carbon truncate">{p.direccion}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1 text-[10px] text-piedra">
                        <MessageSquare size={9} /> {p.consultas} consultas
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-piedra">
                        <CalendarCheck size={9} /> {p.visitas} visitas
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-piedra">
                        <Eye size={9} /> {p.vistas} vistas
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <div className="h-1.5 w-16 bg-crema rounded-full overflow-hidden">
                      <div
                        className="h-full bg-petroleo/60 rounded-full"
                        style={{ width: top[0]?.consultas ? `${Math.round((p.consultas / top[0].consultas) * 100)}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
