import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageSquare, Send, Search, User,
  CheckCheck, TrendingUp, Trash2, AlertTriangle, ExternalLink, Bot, UserCheck,
  Image as ImageIcon, Video
} from 'lucide-react'
import { api, formatARS } from '../lib/api'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Mensaje {
  id: string
  tipo: 'ENTRANTE' | 'SALIENTE' | 'SISTEMA'
  mensaje: string
  leido: boolean
  createdAt: string
}

interface Conversacion {
  id: string
  numero: string
  etapa: string
  tipoInteres?: string
  nombreCapturado?: string
  pushName?: string
  fotoPerfilUrl?: string
  telefonoReal?: string
  presupuesto?: number
  notas?: string
  agenteActivo: boolean
  ultimoMensaje: string
  persona?: { id: string; nombre: string; apellido: string; whatsapp?: string; email?: string }
  propiedadInteresId?: string
  propiedadInteres?: { id: string; direccion: string }
  mensajes: Mensaje[]
  _count?: { mensajes: number }
}

interface PropiedadOpcion {
  id: string
  direccion: string
  imagenes: { id: string }[]
  videos: { id: string }[]
  vinculos?: { tipo: string; activo: boolean }[]
}

const ETAPA_LABEL: Record<string, string> = {
  NUEVO: 'Nuevo', CONSULTANDO: 'Consultando', INTERESADO: 'Interesado',
  RECOPILANDO: 'Recopilando datos', VISITA_PENDIENTE: 'Visita pendiente',
  CLIENTE: 'Cliente', INACTIVO: 'Inactivo',
}
const ETAPA_COLOR: Record<string, string> = {
  NUEVO: 'bg-gray-100 text-gray-600',
  CONSULTANDO: 'bg-blue-100 text-blue-700',
  INTERESADO: 'bg-yellow-100 text-yellow-700',
  RECOPILANDO: 'bg-orange-100 text-orange-700',
  VISITA_PENDIENTE: 'bg-purple-100 text-purple-700',
  CLIENTE: 'bg-green-100 text-green-700',
  INACTIVO: 'bg-gray-100 text-gray-400',
}

function formatHora(fecha: string) {
  const d = new Date(fecha)
  const hoy = new Date()
  const esHoy = d.toDateString() === hoy.toDateString()
  if (esHoy) return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' })
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Inbox() {
  const qc = useQueryClient()
  const [convSeleccionada, setConvSeleccionada] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState('')
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [errorEnvio, setErrorEnvio] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [enviandoMedia, setEnviandoMedia] = useState<'fotos' | 'videos' | null>(null)
  const chatRef = useRef<HTMLDivElement>(null)

  // Lista de conversaciones
  const { data: conversaciones = [] } = useQuery<Conversacion[]>({
    queryKey: ['conversaciones'],
    queryFn: () => api.get('/conversaciones').then((r) => r.data),
    refetchInterval: 8000,
  })

  // Todas las propiedades (no solo disponibles) para asociar a la conversación y enviar fotos/videos
  const { data: propiedades = [] } = useQuery<PropiedadOpcion[]>({
    queryKey: ['propiedades-todas'],
    queryFn: () => api.get('/propiedades').then((r) => r.data),
  })

  // Detalle de conversación seleccionada
  const { data: convDetalle } = useQuery<Conversacion>({
    queryKey: ['conversacion', convSeleccionada],
    queryFn: () => api.get(`/conversaciones/${convSeleccionada}`).then((r) => r.data),
    enabled: !!convSeleccionada,
    refetchInterval: 5000,
  })

  // Scroll al último mensaje
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [convDetalle?.mensajes.length])

  // Invalidar lista cuando se selecciona (para actualizar no leídos)
  useEffect(() => {
    if (convSeleccionada) {
      setTimeout(() => qc.invalidateQueries({ queryKey: ['conversaciones'] }), 500)
    }
  }, [convSeleccionada])

  const enviarMensaje = useMutation({
    mutationFn: () => api.post(`/conversaciones/${convSeleccionada}/mensaje`, { mensaje: texto }),
    onSuccess: () => {
      setTexto('')
      setErrorEnvio(null)
      qc.invalidateQueries({ queryKey: ['conversacion', convSeleccionada] })
      qc.invalidateQueries({ queryKey: ['conversaciones'] })
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorEnvio(msg || 'Error al enviar el mensaje')
    },
  })

  const actualizarConv = useMutation({
    mutationFn: (data: object) => api.patch(`/conversaciones/${convSeleccionada}`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversacion', convSeleccionada] })
      qc.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })

  const toggleAgente = useMutation({
    mutationFn: (activo: boolean) => api.patch(`/conversaciones/${convSeleccionada}/agente`, { activo }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['conversacion', convSeleccionada] })
      qc.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })

  async function enviarMedia(tipo: 'fotos' | 'videos') {
    if (!convDetalle?.propiedadInteres) return
    const destino = convDetalle.telefonoReal || convDetalle.numero
    setEnviandoMedia(tipo)
    setErrorEnvio(null)
    try {
      const { data } = await api.post(`/catalogo/wa/propiedad/${convDetalle.propiedadInteres.id}/${tipo}`, { destino })
      const cantidad = tipo === 'fotos' ? data.enviadas : data.enviados
      if (cantidad === 0) {
        setErrorEnvio(`Esa propiedad no tiene ${tipo} cargadas`)
      } else {
        qc.invalidateQueries({ queryKey: ['conversacion', convSeleccionada] })
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setErrorEnvio(msg || `Error al enviar ${tipo}`)
    } finally {
      setEnviandoMedia(null)
    }
  }

  const eliminarConv = useMutation({
    mutationFn: (id: string) => api.delete(`/conversaciones/${id}`),
    onSuccess: () => {
      setConvSeleccionada(null)
      setConfirmDelete(false)
      qc.invalidateQueries({ queryKey: ['conversaciones'] })
    },
  })

  async function handleEnviar() {
    if (!texto.trim() || !convSeleccionada) return
    setEnviando(true)
    try { await enviarMensaje.mutateAsync() } finally { setEnviando(false) }
  }

  const convsFiltradas = conversaciones.filter((c) => {
    const nombre = c.nombreCapturado || c.persona?.nombre || ''
    const num = c.numero
    return (
      nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      num.includes(busqueda)
    )
  })

  const conv = convDetalle

  return (
    <div className="flex h-screen overflow-hidden bg-crema">

      {/* ── Panel izquierdo: lista de conversaciones ─────────────────────── */}
      <div className="w-72 bg-white border-r border-arena flex flex-col shrink-0">
        {/* Header */}
        <div className="px-4 py-4 border-b border-crema">
          <h1 className="font-display text-lg text-carbon">WhatsApp CRM</h1>
          <p className="text-xs text-piedra">{conversaciones.length} conversaciones</p>
        </div>

        {/* Buscador */}
        <div className="px-3 py-2 border-b border-crema">
          <div className="flex items-center gap-2 bg-crema rounded px-3 py-1.5">
            <Search size={13} className="text-arena shrink-0" />
            <input
              className="bg-transparent text-sm w-full outline-none placeholder:text-arena"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto">
          {convsFiltradas.length === 0 && (
            <div className="p-6 text-center">
              <MessageSquare size={24} className="text-arena mx-auto mb-2" />
              <p className="text-xs text-piedra">Sin conversaciones</p>
            </div>
          )}
          {convsFiltradas.map((c) => {
            const noLeidos = c._count?.mensajes || 0
            const ultimoMsg = c.mensajes?.[0]
            // Prioridad de nombre: persona registrada > nombre que dijo > pushName WA > número
            const nombre =
              (c.persona ? `${c.persona.nombre} ${c.persona.apellido}`.trim() : null) ||
              c.nombreCapturado ||
              c.pushName ||
              c.telefonoReal ||
              c.numero
            const iniciales = nombre.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
            const activa = convSeleccionada === c.id

            return (
              <button
                key={c.id}
                onClick={() => setConvSeleccionada(c.id)}
                className={`w-full text-left px-4 py-3 border-b border-crema transition-colors ${
                  activa ? 'bg-crema border-l-4 border-l-piedra' : 'hover:bg-crema/60'
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* Avatar con foto de perfil WA */}
                  <div className="w-9 h-9 rounded-full shrink-0 mt-0.5 overflow-hidden bg-crema border border-arena flex items-center justify-center">
                    {c.fotoPerfilUrl ? (
                      <img src={c.fotoPerfilUrl} alt={nombre} className="w-full h-full object-cover" />
                    ) : iniciales && iniciales !== '' ? (
                      <span className="text-xs font-bold text-piedra">{iniciales}</span>
                    ) : (
                      <User size={16} className="text-piedra" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`text-sm truncate ${noLeidos > 0 ? 'font-bold text-carbon' : 'font-semibold text-carbon'}`}>
                        {nombre}
                      </p>
                      <span className="text-[10px] text-arena shrink-0 ml-1">
                        {formatHora(c.ultimoMensaje)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-0.5">
                      <p className="text-xs text-arena truncate max-w-[140px]">
                        {ultimoMsg?.mensaje?.replace(/^\[.*?\]\s*—?\s*/, '') || 'Sin mensajes'}
                      </p>
                      {noLeidos > 0 && (
                        <span className="bg-piedra text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold shrink-0">
                          {noLeidos > 9 ? '9+' : noLeidos}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${ETAPA_COLOR[c.etapa] || 'bg-gray-100 text-gray-500'}`}>
                        {ETAPA_LABEL[c.etapa] || c.etapa}
                      </span>
                      {c.agenteActivo && (
                        <span title="Agente IA activo"><Bot size={10} className="text-green-600" /></span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel central: chat ───────────────────────────────────────────── */}
      {conv ? (
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header del chat */}
          <div className="bg-white border-b border-arena px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* Avatar con foto WA */}
              <div className="w-10 h-10 rounded-full overflow-hidden bg-crema border border-arena flex items-center justify-center shrink-0">
                {conv.fotoPerfilUrl ? (
                  <img src={conv.fotoPerfilUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <User size={18} className="text-piedra" />
                )}
              </div>
              <div>
                <p className="font-semibold text-carbon text-sm">
                  {(conv.persona
                    ? `${conv.persona.nombre} ${conv.persona.apellido}`.trim()
                    : conv.nombreCapturado || conv.pushName) || conv.numero}
                </p>
                <p className="text-xs text-arena">
                  {conv.telefonoReal
                    ? `+${conv.telefonoReal}`
                    : conv.pushName && conv.pushName !== conv.nombreCapturado
                    ? conv.pushName
                    : conv.numero}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-1 rounded text-xs font-semibold ${ETAPA_COLOR[conv.etapa] || ''}`}>
                {ETAPA_LABEL[conv.etapa] || conv.etapa}
              </span>
              <button
                onClick={() => toggleAgente.mutate(!conv.agenteActivo)}
                title={conv.agenteActivo ? 'Agente activo — click para tomar control' : 'Atención humana — click para reactivar agente'}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  conv.agenteActivo
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                }`}
              >
                {conv.agenteActivo ? <Bot size={12} /> : <UserCheck size={12} />}
                {conv.agenteActivo ? 'Agente IA' : 'Humano'}
              </button>
            </div>
          </div>

          {/* Mensajes */}
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-2">
            {conv.mensajes.map((m) => {
              const esEntrante = m.tipo === 'ENTRANTE'
              const esSistema = m.tipo === 'SISTEMA'
              if (esSistema) {
                return (
                  <div key={m.id} className="text-center">
                    <span className="text-[11px] bg-crema text-arena px-3 py-1 rounded-full">{m.mensaje}</span>
                  </div>
                )
              }
              return (
                <div key={m.id} className={`flex ${esEntrante ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-4 py-2.5 shadow-sm ${
                    esEntrante
                      ? 'bg-white text-carbon rounded-tl-sm'
                      : 'bg-carbon text-white rounded-tr-sm'
                  }`}>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.mensaje}</p>
                    <div className={`flex items-center gap-1 mt-1 ${esEntrante ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-[10px] ${esEntrante ? 'text-arena' : 'text-white/50'}`}>
                        {formatHora(m.createdAt)}
                      </span>
                      {!esEntrante && (
                        <CheckCheck size={12} className={m.leido ? 'text-blue-400' : 'text-white/40'} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
            {conv.mensajes.length === 0 && (
              <div className="flex-1 flex items-center justify-center py-20">
                <p className="text-arena text-sm">Sin mensajes aún</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-arena px-4 py-3">
            {errorEnvio && (
              <div className="mb-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle size={12} />
                {errorEnvio}
              </div>
            )}
            <div className="flex items-end gap-3">
              <textarea
                className="flex-1 form-input resize-none text-sm max-h-32"
                rows={1}
                placeholder="Escribir mensaje..."
                value={texto}
                onChange={(e) => { setTexto(e.target.value); setErrorEnvio(null) }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
                }}
              />
              <button
                onClick={handleEnviar}
                disabled={enviando || !texto.trim()}
                className="btn-primary p-2.5 rounded-full"
              >
                <Send size={16} />
              </button>
            </div>
            <p className="text-[10px] text-arena mt-1">Enter para enviar · Shift+Enter para nueva línea</p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <MessageSquare size={48} className="text-arena mx-auto mb-4" />
            <p className="font-display text-xl text-carbon mb-1">WhatsApp CRM</p>
            <p className="text-piedra text-sm">Seleccioná una conversación para ver los mensajes</p>
          </div>
        </div>
      )}

      {/* ── Panel derecho: info del contacto ─────────────────────────────── */}
      {conv && (
        <div className="w-64 bg-white border-l border-arena flex flex-col overflow-y-auto shrink-0">
          {/* Cabecera con foto grande */}
          <div className="px-4 py-5 border-b border-crema flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full overflow-hidden bg-crema border-2 border-arena mb-2">
              {conv.fotoPerfilUrl ? (
                <img src={conv.fotoPerfilUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <User size={28} className="text-piedra" />
                </div>
              )}
            </div>
            <p className="font-semibold text-carbon text-sm leading-tight">
              {(conv.persona
                ? `${conv.persona.nombre} ${conv.persona.apellido}`.trim()
                : conv.nombreCapturado || conv.pushName) || '—'}
            </p>
            {conv.pushName && conv.pushName !== conv.nombreCapturado && !conv.persona && (
              <p className="text-[11px] text-arena mt-0.5">{conv.pushName}</p>
            )}
          </div>

          <div className="px-4 py-4 space-y-4">
            {/* Datos de contacto */}
            <div className="space-y-2">
              {/* Teléfono real (si se pudo resolver) */}
              <div>
                <p className="text-[10px] text-arena uppercase tracking-wide">WhatsApp</p>
                {conv.telefonoReal ? (
                  <a
                    href={`https://wa.me/${conv.telefonoReal}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-carbon hover:text-piedra transition-colors"
                  >
                    +{conv.telefonoReal}
                  </a>
                ) : (
                  <p className="text-sm text-carbon font-mono text-xs">{conv.numero}</p>
                )}
              </div>

              {conv.persona?.email && (
                <div>
                  <p className="text-[10px] text-arena uppercase tracking-wide">Email</p>
                  <p className="text-sm text-carbon">{conv.persona.email}</p>
                </div>
              )}

              {/* Nombre declarado en la conversación */}
              {conv.nombreCapturado && conv.nombreCapturado !== conv.pushName && (
                <div>
                  <p className="text-[10px] text-arena uppercase tracking-wide">Nombre declarado</p>
                  <p className="text-sm text-carbon">{conv.nombreCapturado}</p>
                </div>
              )}
            </div>

            {/* Interés */}
            <div className="pt-3 border-t border-crema space-y-2">
              <p className="text-[10px] text-arena uppercase tracking-wide">Interés detectado</p>
              {conv.tipoInteres && (
                <span className={`badge ${conv.tipoInteres === 'ALQUILER' ? 'badge-piedra' : 'badge-blue'}`}>
                  {conv.tipoInteres === 'ALQUILER' ? '🏠 Alquiler' : '🏡 Compra'}
                </span>
              )}
              {conv.presupuesto && (
                <div className="flex items-center gap-1 text-xs text-carbon">
                  <TrendingUp size={12} className="text-arena" />
                  Presupuesto: {formatARS(conv.presupuesto)}
                </div>
              )}

              <select
                className="form-select text-xs w-full"
                value={conv.propiedadInteres?.id || ''}
                onChange={(e) => actualizarConv.mutate({ propiedadInteresId: e.target.value || null })}
              >
                <option value="">Sin propiedad asociada</option>
                {propiedades.map((p) => {
                  const ocupada = p.vinculos?.some(v => v.activo)
                  return (
                    <option key={p.id} value={p.id}>{p.direccion}{ocupada ? ' (con contrato activo)' : ''}</option>
                  )
                })}
              </select>

              {conv.propiedadInteres && (() => {
                const prop = propiedades.find(p => p.id === conv.propiedadInteres?.id)
                return (
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => enviarMedia('fotos')}
                      disabled={enviandoMedia !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-piedra bg-crema hover:bg-arena/30 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <ImageIcon size={12} />
                      {enviandoMedia === 'fotos' ? 'Enviando...' : `Fotos${prop ? ` (${prop.imagenes.length})` : ''}`}
                    </button>
                    <button
                      onClick={() => enviarMedia('videos')}
                      disabled={enviandoMedia !== null}
                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold text-piedra bg-crema hover:bg-arena/30 px-2 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Video size={12} />
                      {enviandoMedia === 'videos' ? 'Enviando...' : `Videos${prop ? ` (${prop.videos.length})` : ''}`}
                    </button>
                  </div>
                )
              })()}
            </div>

            {/* Etapa */}
            <div className="pt-3 border-t border-crema">
              <p className="text-[10px] text-arena uppercase tracking-wide mb-2">Etapa del funnel</p>
              <select
                className="form-select text-xs"
                value={conv.etapa}
                onChange={(e) => actualizarConv.mutate({ etapa: e.target.value })}
              >
                {Object.entries(ETAPA_LABEL).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>

            {/* Notas */}
            <div className="pt-3 border-t border-crema">
              <p className="text-[10px] text-arena uppercase tracking-wide mb-2">Notas internas</p>
              <textarea
                className="form-input resize-none text-xs"
                rows={3}
                placeholder="Notas sobre este contacto..."
                defaultValue={conv.notas || ''}
                onBlur={(e) => actualizarConv.mutate({ notas: e.target.value })}
              />
            </div>

            {/* Acciones rápidas */}
            <div className="pt-3 border-t border-crema space-y-2">
              <p className="text-[10px] text-arena uppercase tracking-wide">Acciones</p>
              {!conv.persona && (
                <button
                  onClick={() => window.open(`/personas`, '_self')}
                  className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <User size={12} /> Crear como persona
                </button>
              )}
              {conv.persona && (
                <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded">
                  <CheckCheck size={12} /> Registrado como {
                    conv.persona.nombre.includes('(') ? 'interesado' : 'contacto'
                  }
                </div>
              )}
              {conv.telefonoReal && (
                <a
                  href={`https://wa.me/${conv.telefonoReal}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary w-full text-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink size={12} /> Abrir en WhatsApp
                </a>
              )}
            </div>

            {/* Zona de peligro */}
            <div className="pt-3 border-t border-red-100">
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs flex items-center justify-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 py-1.5 rounded transition-colors"
              >
                <Trash2 size={12} /> Eliminar conversación
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal de confirmación de eliminación ─────────────────────────── */}
      {confirmDelete && conv && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-carbon text-sm">¿Eliminar conversación?</p>
                <p className="text-xs text-piedra">
                  Se borrarán todos los mensajes de{' '}
                  <strong>{conv.nombreCapturado || conv.pushName || conv.numero}</strong>.
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 btn-secondary text-sm"
                disabled={eliminarConv.isPending}
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarConv.mutate(conv.id)}
                disabled={eliminarConv.isPending}
                className="flex-1 text-sm bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors disabled:opacity-50"
              >
                {eliminarConv.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
