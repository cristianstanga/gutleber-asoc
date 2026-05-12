import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Phone, Mail, Home, Pencil, Trash2, ChevronLeft, MessageSquare, Send } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import FormPersona from '../components/FormPersona'

interface Vinculo {
  id: string
  tipo: string
  activo: boolean
  alquilerActual?: number
  fechaInicio: string
  fechaFin?: string
  propiedad: { id: string; direccion: string; tipo: string }
}

interface Pago {
  id: string
  concepto: string
  monto: number
  estado: string
  periodo?: string
  fechaVencimiento: string
}

interface InboxItem {
  id: string
  canal: string
  mensaje: string
  tipo: string
  leido: boolean
  createdAt: string
}

interface Persona {
  id: string
  nombre: string
  apellido: string
  dni?: string
  whatsapp?: string
  email?: string
  tipo: string
  notas?: string
  vinculos?: Vinculo[]
  pagos?: Pago[]
  inboxItems?: InboxItem[]
}

const tipoBadge: Record<string, string> = {
  PROPIETARIO: 'badge-blue', INQUILINO: 'badge-piedra',
  INTERESADO: 'badge-yellow', GARANTE: 'badge-gray',
}
const tipoLabel: Record<string, string> = {
  PROPIETARIO: 'Propietario', INQUILINO: 'Inquilino',
  INTERESADO: 'Interesado', GARANTE: 'Garante',
}
const estadoBadge: Record<string, string> = {
  PENDIENTE: 'badge-yellow', PAGADO: 'badge-green',
  VENCIDO: 'badge-red', MORA: 'badge-red', ANULADO: 'badge-gray',
}
const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente', PAGADO: 'Pagado',
  VENCIDO: 'Vencido', MORA: 'En mora', ANULADO: 'Anulado',
}

export default function Personas() {
  const qc = useQueryClient()
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<Persona | null>(null)
  const [detalle, setDetalle] = useState<string | null>(null)
  const [toast, setToast] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [busqueda, setBusqueda] = useState('')
  const [mensajeWA, setMensajeWA] = useState('')
  const [enviandoWA, setEnviandoWA] = useState(false)

  const { data: personas = [], isLoading } = useQuery<Persona[]>({
    queryKey: ['personas', filtroTipo, busqueda],
    queryFn: () =>
      api.get('/personas', {
        params: {
          ...(filtroTipo ? { tipo: filtroTipo } : {}),
          ...(busqueda ? { q: busqueda } : {}),
        },
      }).then((r) => r.data),
  })

  const { data: personaDetalle } = useQuery<Persona>({
    queryKey: ['persona', detalle],
    queryFn: () => api.get(`/personas/${detalle}`).then((r) => r.data),
    enabled: !!detalle,
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/personas/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personas'] })
      setDetalle(null)
      mostrarToast('Persona eliminada')
    },
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function abrirEditar(p: Persona) { setEditando(p); setModalForm(true) }
  function abrirNueva() { setEditando(null); setModalForm(true) }
  function cerrarForm() { setModalForm(false); setEditando(null) }

  async function enviarWhatsApp(persona: Persona) {
    if (!mensajeWA.trim()) return
    setEnviandoWA(true)
    try {
      await api.post('/inbox/enviar', { personaId: persona.id, mensaje: mensajeWA })
      qc.invalidateQueries({ queryKey: ['persona', detalle] })
      setMensajeWA('')
      mostrarToast('Mensaje enviado')
    } catch {
      mostrarToast('Error al enviar')
    } finally {
      setEnviandoWA(false)
    }
  }

  // ── Vista detalle ──────────────────────────────────────────────────────────
  if (detalle && personaDetalle) {
    const p = personaDetalle
    return (
      <div className="p-8">
        {toast && (
          <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>
        )}

        <button onClick={() => setDetalle(null)} className="flex items-center gap-2 text-piedra text-sm mb-5 hover:text-carbon transition-colors">
          <ChevronLeft size={16} /> Volver a personas
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Info principal */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className={`${tipoBadge[p.tipo]} mb-2 inline-block`}>{tipoLabel[p.tipo]}</span>
                  <h2 className="font-display text-2xl text-carbon">{p.nombre} {p.apellido}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirEditar(p)} className="btn-secondary flex items-center gap-1.5 text-xs">
                    <Pencil size={13} /> Editar
                  </button>
                  <button
                    onClick={() => { if (confirm('¿Eliminar esta persona?')) eliminar.mutate(p.id) }}
                    className="btn-danger flex items-center gap-1.5 text-xs"
                  >
                    <Trash2 size={13} /> Eliminar
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                {p.dni && (
                  <div>
                    <p className="text-xs text-piedra uppercase tracking-wide mb-0.5">DNI</p>
                    <p className="text-carbon">{p.dni}</p>
                  </div>
                )}
                {p.whatsapp && (
                  <div>
                    <p className="text-xs text-piedra uppercase tracking-wide mb-0.5">WhatsApp</p>
                    <a href={`https://wa.me/${p.whatsapp}`} target="_blank" rel="noreferrer"
                      className="text-green-600 flex items-center gap-1 hover:underline">
                      <Phone size={13} /> {p.whatsapp}
                    </a>
                  </div>
                )}
                {p.email && (
                  <div>
                    <p className="text-xs text-piedra uppercase tracking-wide mb-0.5">Email</p>
                    <a href={`mailto:${p.email}`} className="text-piedra flex items-center gap-1 hover:underline">
                      <Mail size={13} /> {p.email}
                    </a>
                  </div>
                )}
              </div>

              {p.notas && (
                <div className="mt-4 pt-4 border-t border-crema">
                  <p className="text-xs text-piedra uppercase tracking-wide mb-1">Notas</p>
                  <p className="text-sm text-carbon">{p.notas}</p>
                </div>
              )}
            </div>

            {/* Contratos */}
            {p.vinculos && p.vinculos.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-carbon mb-3 flex items-center gap-2">
                  <Home size={15} className="text-piedra" /> Contratos ({p.vinculos.length})
                </h3>
                <div className="space-y-2">
                  {p.vinculos.map((v) => (
                    <div key={v.id} className="flex items-center justify-between py-2 border-b border-crema last:border-0">
                      <div>
                        <p className="text-sm font-semibold text-carbon">{v.propiedad.direccion}</p>
                        <p className="text-xs text-arena">
                          Desde {formatFecha(v.fechaInicio)}
                          {v.fechaFin ? ` hasta ${formatFecha(v.fechaFin)}` : ''}
                        </p>
                      </div>
                      <div className="text-right">
                        {v.alquilerActual && (
                          <p className="text-sm font-semibold text-carbon">{formatARS(v.alquilerActual)}</p>
                        )}
                        <span className={v.activo ? 'badge-green' : 'badge-gray'}>
                          {v.activo ? 'Activo' : 'Finalizado'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Últimos pagos */}
            {p.pagos && p.pagos.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-carbon mb-3">Últimos pagos</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-crema">
                      <th className="text-left pb-2 text-xs text-piedra uppercase tracking-wide">Período</th>
                      <th className="text-right pb-2 text-xs text-piedra uppercase tracking-wide">Monto</th>
                      <th className="text-left pb-2 text-xs text-piedra uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p.pagos.slice(0, 8).map((pago) => (
                      <tr key={pago.id} className="border-b border-crema last:border-0">
                        <td className="py-2 text-carbon">{pago.periodo || formatFecha(pago.fechaVencimiento)}</td>
                        <td className="py-2 text-right font-semibold text-carbon">{formatARS(pago.monto)}</td>
                        <td className="py-2">
                          <span className={estadoBadge[pago.estado] || 'badge-gray'}>
                            {estadoLabel[pago.estado] || pago.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Sidebar — WhatsApp */}
          <div className="space-y-4">
            {p.whatsapp && (
              <div className="card p-5">
                <h3 className="font-semibold text-carbon mb-3 flex items-center gap-2">
                  <MessageSquare size={15} className="text-green-600" /> Enviar mensaje
                </h3>
                <textarea
                  className="form-input resize-none text-sm mb-2"
                  rows={3}
                  value={mensajeWA}
                  onChange={(e) => setMensajeWA(e.target.value)}
                  placeholder={`Hola ${p.nombre},...`}
                />
                <button
                  onClick={() => enviarWhatsApp(p)}
                  disabled={enviandoWA || !mensajeWA.trim()}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Send size={14} />
                  {enviandoWA ? 'Enviando...' : 'Enviar por WhatsApp'}
                </button>
              </div>
            )}

            {/* Historial inbox */}
            {p.inboxItems && p.inboxItems.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-carbon mb-3 text-sm">Historial de mensajes</h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {p.inboxItems.map((item) => (
                    <div key={item.id}
                      className={`text-xs p-2 rounded ${item.tipo === 'ENTRANTE' ? 'bg-blue-50 text-blue-800' : 'bg-green-50 text-green-800'}`}>
                      <p className="font-semibold mb-0.5">{item.tipo === 'ENTRANTE' ? '← Recibido' : '→ Enviado'}</p>
                      <p>{item.mensaje}</p>
                      <p className="text-[10px] opacity-60 mt-1">{formatFecha(item.createdAt)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {modalForm && <FormPersona persona={editando} onClose={() => { cerrarForm(); qc.invalidateQueries({ queryKey: ['persona', detalle] }) }} />}
      </div>
    )
  }

  // ── Lista ──────────────────────────────────────────────────────────────────
  return (
    <div className="p-8">
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Personas</h1>
          <p className="text-piedra text-sm mt-1">{personas.length} personas registradas</p>
        </div>
        <button onClick={abrirNueva} className="btn-primary flex items-center gap-2">
          <Users size={16} /> Nueva persona
        </button>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 mb-5">
        <input
          className="form-input max-w-xs text-sm"
          placeholder="Buscar por nombre, apellido o DNI..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
        <select
          className="form-select text-sm w-40"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
        >
          <option value="">Todos</option>
          <option value="INQUILINO">Inquilinos</option>
          <option value="PROPIETARIO">Propietarios</option>
          <option value="GARANTE">Garantes</option>
          <option value="INTERESADO">Interesados</option>
        </select>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-crema border-b border-arena">
            <tr>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Nombre</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Tipo</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide hidden md:table-cell">DNI</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Contacto</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Propiedad</th>
              <th className="text-right px-5 py-3 text-xs text-piedra uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr
                key={p.id}
                className="border-b border-crema last:border-0 hover:bg-crema/40 cursor-pointer"
                onClick={() => setDetalle(p.id)}
              >
                <td className="px-5 py-3">
                  <p className="font-semibold text-carbon">{p.apellido}, {p.nombre}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={tipoBadge[p.tipo] || 'badge-gray'}>{tipoLabel[p.tipo] || p.tipo}</span>
                </td>
                <td className="px-5 py-3 text-arena hidden md:table-cell">{p.dni || '—'}</td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  <div className="space-y-0.5">
                    {p.whatsapp && (
                      <p className="flex items-center gap-1 text-xs text-carbon">
                        <Phone size={11} className="text-arena" /> {p.whatsapp}
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-1 text-xs text-carbon">
                        <Mail size={11} className="text-arena" /> {p.email}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3 hidden lg:table-cell">
                  {p.vinculos?.filter((v) => v.activo).map((v, i) => (
                    <p key={i} className="flex items-center gap-1 text-xs text-carbon">
                      <Home size={11} className="text-arena" /> {v.propiedad.direccion}
                    </p>
                  ))}
                  {!p.vinculos?.some((v) => v.activo) && <span className="text-arena text-xs">—</span>}
                </td>
                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-end gap-1">
                    <button
                      onClick={() => abrirEditar(p)}
                      className="p-1.5 hover:bg-crema rounded text-piedra transition-colors"
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { if (confirm('¿Eliminar esta persona?')) eliminar.mutate(p.id) }}
                      className="p-1.5 hover:bg-red-50 rounded text-red-400 transition-colors"
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {personas.length === 0 && !isLoading && (
          <div className="py-12 text-center">
            <Users size={32} className="text-arena mx-auto mb-3" />
            <p className="text-piedra mb-4">No hay personas registradas</p>
            <button onClick={abrirNueva} className="btn-primary">Crear primera persona</button>
          </div>
        )}
      </div>

      {modalForm && <FormPersona persona={editando} onClose={cerrarForm} />}
    </div>
  )
}
