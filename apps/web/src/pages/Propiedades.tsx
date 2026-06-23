import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, Ruler, Tag, Pencil, Trash2, Instagram, Images, ChevronLeft, Sparkles, MessageCircle, RefreshCw } from 'lucide-react'
import { api, formatARS } from '../lib/api'
import FormPropiedad from '../components/FormPropiedad'
import ImageUpload from '../components/ImageUpload'

interface Imagen { id: string; url: string; orden: number }
interface VideoItem { id: string; url: string; orden: number; titulo?: string }

interface Propiedad {
  id: string
  direccion: string
  tipo: string
  superficie?: number
  dormitorios?: number
  banos?: number
  cochera?: boolean
  antiguedad?: number
  piso?: string
  enAlquiler: boolean
  enVenta: boolean
  administrada: boolean
  alquilerBase?: number
  indiceActual?: string
  valorVenta?: number
  descripcion?: string
  notas?: string
  instagramPostId?: string
  lat?: number
  lng?: number
  barrio?: string
  imagenes: Imagen[]
  videos: VideoItem[]
  vinculos?: Array<{ id: string; persona: { nombre: string; apellido: string }; alquilerActual?: number; tipo: string }>
}

const tipoLabel: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}

export default function Propiedades() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<Propiedad | null>(null)
  const [detalle, setDetalle] = useState<Propiedad | null>(null)
  const [toast, setToast] = useState('')
  const [publicando, setPublicando] = useState<string | null>(null)
  const [sincronizandoCatalogo, setSincronizandoCatalogo] = useState(false)
  const [modalCatalogo, setModalCatalogo] = useState(false)
  const [numeroCatalogo, setNumeroCatalogo] = useState('')
  const [enviandoWA, setEnviandoWA] = useState<string | null>(null)
  const [modalPropWA, setModalPropWA] = useState<string | null>(null)
  const [numeroPropWA, setNumeroPropWA] = useState('')

  const { data: propiedades = [], isLoading } = useQuery<Propiedad[]>({
    queryKey: ['propiedades'],
    queryFn: () => api.get('/propiedades').then((r) => r.data),
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/propiedades/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['propiedades'] }); mostrarToast('Propiedad eliminada') },
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function abrirEditar(p: Propiedad) { setEditando(p); setModalForm(true) }
  function abrirNueva() { setEditando(null); setModalForm(true) }
  function cerrarForm() { setModalForm(false); setEditando(null) }

  async function descargarContrato(vinculoId: string, inquilino: string) {
    try {
      const res = await api.get(`/vinculos/${vinculoId}/contrato`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `contrato-${inquilino.replace(/\s+/g, '-').toLowerCase()}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      mostrarToast('Error al generar el contrato')
    }
  }

  function esDisponible(p: Propiedad) {
    const vincActivos = p.vinculos || []
    const dispAlquiler = p.enAlquiler && !vincActivos.some((v) => v.tipo === 'ALQUILER')
    const dispVenta    = p.enVenta    && !vincActivos.some((v) => v.tipo === 'VENTA')
    return dispAlquiler || dispVenta
  }

  async function sincronizarCatalogo(destino?: string) {
    setSincronizandoCatalogo(true)
    try {
      const body = destino ? { destino } : {}
      const r = await api.post('/catalogo/wa/sincronizar', body)
      mostrarToast(`✅ Catálogo enviado (${r.data.enviadas} propiedades)`)
      setModalCatalogo(false)
      setNumeroCatalogo('')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al sincronizar'
      mostrarToast(msg)
    } finally {
      setSincronizandoCatalogo(false)
    }
  }

  async function enviarPropiedadWA(propId: string, destino: string) {
    setEnviandoWA(propId)
    try {
      await api.post(`/catalogo/wa/propiedad/${propId}`, { destino })
      mostrarToast('✅ Tarjeta enviada por WhatsApp')
      setModalPropWA(null)
      setNumeroPropWA('')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al enviar'
      mostrarToast(msg)
    } finally {
      setEnviandoWA(null)
    }
  }

  async function publicarInstagram(p: Propiedad) {
    if (p.imagenes.length === 0) { mostrarToast('Primero subí al menos una foto'); return }
    setPublicando(p.id)
    try {
      await api.post(`/propiedades/${p.id}/publicar-instagram`)
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      mostrarToast('✅ Publicado en Instagram')
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al publicar'
      mostrarToast(msg)
    } finally {
      setPublicando(null)
    }
  }

  // Modal catálogo WA (sincronización completa)
  const ModalCatalogo = modalCatalogo && (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-carbon mb-3">Sincronizar catálogo WA</h3>
        <p className="text-xs text-piedra mb-4">Enviará una tarjeta por cada propiedad disponible al número indicado.</p>
        <input
          type="tel"
          placeholder="Ej: 3764XXXXXXX (sin 0 ni 15)"
          value={numeroCatalogo}
          onChange={(e) => setNumeroCatalogo(e.target.value)}
          className="input w-full mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setModalCatalogo(false); setNumeroCatalogo('') }}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={() => sincronizarCatalogo(numeroCatalogo || undefined)}
            disabled={sincronizandoCatalogo}
            className="btn-primary flex-1"
          >
            {sincronizandoCatalogo ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )

  // Modal envío WA de propiedad individual
  const ModalPropWA = modalPropWA && (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
        <h3 className="font-semibold text-carbon mb-3">Enviar tarjeta por WhatsApp</h3>
        <p className="text-xs text-piedra mb-4">Número destino (sin 0 ni 15, con código de área).</p>
        <input
          type="tel"
          placeholder="Ej: 3764XXXXXXX"
          value={numeroPropWA}
          onChange={(e) => setNumeroPropWA(e.target.value)}
          className="input w-full mb-3"
        />
        <div className="flex gap-2">
          <button
            onClick={() => { setModalPropWA(null); setNumeroPropWA('') }}
            className="btn-secondary flex-1"
          >
            Cancelar
          </button>
          <button
            onClick={() => numeroPropWA && enviarPropiedadWA(modalPropWA, numeroPropWA)}
            disabled={!numeroPropWA || enviandoWA === modalPropWA}
            className="btn-primary flex-1"
          >
            {enviandoWA === modalPropWA ? 'Enviando...' : 'Enviar'}
          </button>
        </div>
      </div>
    </div>
  )

  // Si hay una propiedad abierta en detalle, mostrar el panel de detalle
  if (detalle) {
    const prop = propiedades.find((p) => p.id === detalle.id) || detalle
    return (
      <div className="p-4 md:p-8">
        {ModalCatalogo}
        {ModalPropWA}
        {toast && <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

        <button onClick={() => setDetalle(null)} className="flex items-center gap-2 text-piedra text-sm mb-5 hover:text-carbon transition-colors">
          <ChevronLeft size={16} /> Volver a propiedades
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Acciones rápidas — primero en mobile, derecha en desktop */}
          <div className="space-y-3 lg:order-last lg:col-start-3 lg:row-start-1">
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs text-piedra uppercase tracking-wide">{tipoLabel[prop.tipo]}</p>
                  <h2 className="font-display text-2xl text-carbon mt-1">{prop.direccion}</h2>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => abrirEditar(prop)} className="btn-secondary flex items-center gap-1.5 text-xs">
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {prop.enAlquiler && <span className="badge-piedra">En alquiler</span>}
                {prop.enVenta && <span className="badge-blue">En venta</span>}
                {prop.administrada && <span className="badge-green">Administrada</span>}
                {prop.instagramPostId && <span className="badge-gray flex items-center gap-1"><Instagram size={10} /> Publicada</span>}
                {esDisponible(prop) ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">● Disponible</span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">● Ocupada</span>
                )}
              </div>

              {/* Atributos físicos */}
              <div className="flex flex-wrap gap-3 text-sm mb-2">
                {prop.superficie && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <Ruler size={12} className="text-piedra" />
                    <span className="text-carbon text-xs">{prop.superficie} m²</span>
                  </div>
                )}
                {prop.dormitorios && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <span className="text-xs">🛏</span>
                    <span className="text-carbon text-xs">{prop.dormitorios} dorm.</span>
                  </div>
                )}
                {prop.banos && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <span className="text-xs">🚿</span>
                    <span className="text-carbon text-xs">{prop.banos} baño{prop.banos > 1 ? 's' : ''}</span>
                  </div>
                )}
                {prop.cochera && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <span className="text-xs">🚗</span>
                    <span className="text-carbon text-xs">Cochera</span>
                  </div>
                )}
                {prop.piso && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <span className="text-carbon text-xs">Piso {prop.piso}</span>
                  </div>
                )}
                {prop.antiguedad && (
                  <div className="flex items-center gap-1.5 bg-crema px-2.5 py-1 rounded-full">
                    <span className="text-carbon text-xs">{prop.antiguedad} años</span>
                  </div>
                )}
              </div>

              {/* Precio */}
              <div className="flex flex-wrap gap-4 text-sm">
                {prop.enAlquiler && prop.alquilerBase && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted">Alquiler:</span>
                    <span className="font-semibold text-carbon">{formatARS(prop.alquilerBase)}</span>
                    {prop.indiceActual && <span className="badge-gray">{prop.indiceActual}</span>}
                  </div>
                )}
                {prop.enVenta && prop.valorVenta && (
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-muted" />
                    <span className="font-semibold text-carbon">USD {prop.valorVenta.toLocaleString('es-AR')}</span>
                  </div>
                )}
              </div>

              {prop.descripcion && (
                <div className="mt-4 pt-4 border-t border-crema">
                  <p className="text-xs text-piedra uppercase tracking-wide mb-1">Descripción pública</p>
                  <p className="text-sm text-carbon">{prop.descripcion}</p>
                </div>
              )}
            </div>

            {/* Fotos y Videos */}
            <div className="card p-6">
              <div className="flex items-center gap-2 mb-4">
                <Images size={16} className="text-piedra" />
                <h3 className="font-semibold text-carbon">
                  Multimedia
                  <span className="text-muted font-normal text-xs ml-2">
                    {prop.imagenes.length} foto{prop.imagenes.length !== 1 ? 's' : ''} · {(prop.videos || []).length} video{(prop.videos || []).length !== 1 ? 's' : ''}
                  </span>
                </h3>
              </div>
              <ImageUpload propiedadId={prop.id} imagenes={prop.imagenes} videos={prop.videos || []} />
            </div>
          </div>

          {/* Info — segundo en mobile, ocupa 2 cols en desktop */}
          <div className="lg:col-span-2 space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-carbon text-sm">
                Tarjetas para compartir
                {prop.imagenes.length > 1 && (
                  <span className="ml-2 text-[10px] font-normal text-muted bg-crema px-1.5 py-0.5 rounded-full">
                    {prop.imagenes.length} imágenes
                  </span>
                )}
              </h3>
              <button
                onClick={() => navigate(`/tarjetas?propId=${prop.id}`)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Sparkles size={15} />
                {prop.imagenes.length > 1
                  ? `Armar tarjetas (${prop.imagenes.length} fotos)`
                  : prop.imagenes.length === 1
                  ? 'Armar tarjeta'
                  : 'Abrir generador'}
              </button>
              {prop.imagenes.length === 0 && (
                <p className="text-[11px] text-muted">Podés subir fotos desde el generador.</p>
              )}
              <p className="text-[11px] text-muted text-center">1080×1080 px · WhatsApp · Instagram</p>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold text-carbon mb-3 text-sm">Publicar</h3>
              <button
                onClick={() => publicarInstagram(prop)}
                disabled={publicando === prop.id}
                className="btn-primary w-full flex items-center justify-center gap-2 mb-2"
              >
                <Instagram size={15} />
                {publicando === prop.id ? 'Publicando...' : 'Publicar en Instagram'}
              </button>
              <p className="text-[11px] text-muted text-center">
                {prop.imagenes.length === 0
                  ? 'Necesitás subir fotos primero'
                  : prop.imagenes.length === 1
                  ? 'Se publicará como imagen simple'
                  : `Se publicará como carrusel (${prop.imagenes.length} fotos)`}
              </p>
              {prop.instagramPostId && (
                <p className="text-[11px] text-green-600 text-center mt-1">✓ Ya publicada en Instagram</p>
              )}

              <div className="border-t border-crema mt-3 pt-3">
                <button
                  onClick={() => setModalPropWA(prop.id)}
                  disabled={enviandoWA === prop.id}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <MessageCircle size={15} />
                  {enviandoWA === prop.id ? 'Enviando...' : 'Enviar tarjeta por WA'}
                </button>
                {esDisponible(prop) ? (
                  <p className="text-[11px] text-green-600 text-center mt-1">● Disponible en catálogo</p>
                ) : (
                  <p className="text-[11px] text-amber-600 text-center mt-1">● Propiedad ocupada</p>
                )}
              </div>
            </div>

            {prop.vinculos && prop.vinculos.length > 0 && (
              <div className="card p-5 space-y-3">
                <h3 className="font-semibold text-carbon text-sm">Contratos activos</h3>
                {prop.vinculos.map((v, i) => (
                  <div key={i} className="space-y-2">
                    <div>
                      <p className="text-sm text-carbon font-semibold">{v.persona.nombre} {v.persona.apellido}</p>
                      {v.alquilerActual && <p className="text-xs text-piedra">{formatARS(v.alquilerActual)}/mes</p>}
                    </div>
                    {v.tipo === 'ALQUILER' && (
                      <button
                        onClick={() => descargarContrato(v.id, `${v.persona.nombre} ${v.persona.apellido}`)}
                        className="btn-secondary w-full flex items-center justify-center gap-1.5 text-xs"
                      >
                        📄 Descargar contrato PDF
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {modalForm && (
          <FormPropiedad propiedad={editando} onClose={cerrarForm} />
        )}
      </div>
    )
  }

  // Lista de propiedades
  const disponiblesCount = propiedades.filter(esDisponible).length

  return (
    <div className="p-4 md:p-8">
      {ModalCatalogo}
      {ModalPropWA}
      {toast && <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-start justify-between gap-3 mb-5">
        <div>
          <h1 className="font-display text-xl md:text-2xl text-carbon">Propiedades</h1>
          <p className="text-piedra text-xs md:text-sm mt-1">
            {propiedades.length} en cartera
            {disponiblesCount > 0 && (
              <span className="ml-2 text-green-600 font-medium">· {disponiblesCount} disponible{disponiblesCount !== 1 ? 's' : ''}</span>
            )}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={() => setModalCatalogo(true)}
            disabled={sincronizandoCatalogo}
            className="btn-secondary flex items-center gap-1.5"
            title="Sincronizar catálogo WhatsApp"
          >
            <RefreshCw size={14} className={sincronizandoCatalogo ? 'animate-spin' : ''} />
            <span className="hidden sm:inline">Catálogo</span> WA
          </button>
          <button onClick={abrirNueva} className="btn-primary flex items-center gap-1.5">
            <Building2 size={14} />
            <span className="hidden sm:inline">Nueva</span> propiedad
          </button>
        </div>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {propiedades.map((p) => (
          <div
            key={p.id}
            className="card overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => setDetalle(p)}
          >
            {/* Foto principal */}
            {p.imagenes.length > 0 ? (
              <img src={p.imagenes[0].url} alt="" className="w-full h-40 object-cover" />
            ) : (
              <div className="w-full h-40 bg-crema flex items-center justify-center border-b border-arena">
                <Building2 size={32} className="text-muted" />
              </div>
            )}

            <div className="p-4">
              {/* Badges */}
              <div className="flex gap-1 flex-wrap mb-2">
                {p.enAlquiler && <span className="badge-piedra">Alquiler</span>}
                {p.enVenta && <span className="badge-blue">Venta</span>}
                {p.administrada && <span className="badge-green">Admin.</span>}
                {p.instagramPostId && <span className="badge-gray"><Instagram size={9} className="inline" /></span>}
                {esDisponible(p) && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">
                    ● Disponible
                  </span>
                )}
              </div>

              {/* Tipo */}
              <p className="text-xs text-muted">{tipoLabel[p.tipo]}</p>

              {/* Dirección */}
              <div className="flex items-start gap-1 mt-0.5 mb-2">
                <MapPin size={12} className="text-muted mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-carbon leading-snug">{p.direccion}</p>
              </div>

              {/* Montos */}
              <div className="space-y-0.5 text-xs mb-3">
                {p.enAlquiler && p.alquilerBase && (
                  <p className="text-carbon">{formatARS(p.alquilerBase)} <span className="text-muted">/ mes</span></p>
                )}
                {p.enVenta && p.valorVenta && (
                  <p className="text-carbon flex items-center gap-1"><Tag size={10} /> USD {p.valorVenta.toLocaleString('es-AR')}</p>
                )}
              </div>

              {/* Acciones */}
              <div
                className="flex gap-1 pt-2 border-t border-crema"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => abrirEditar(p)}
                  className="p-1.5 hover:bg-crema rounded text-piedra transition-colors"
                  title="Editar"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => publicarInstagram(p)}
                  disabled={publicando === p.id}
                  className="p-1.5 hover:bg-crema rounded text-piedra transition-colors"
                  title="Publicar en Instagram"
                >
                  <Instagram size={14} />
                </button>
                <button
                  onClick={() => { if (confirm('¿Eliminar esta propiedad?')) eliminar.mutate(p.id) }}
                  className="p-1.5 hover:bg-red-50 rounded text-red-400 transition-colors ml-auto"
                  title="Eliminar"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {propiedades.length === 0 && !isLoading && (
        <div className="card p-12 text-center">
          <Building2 size={32} className="text-muted mx-auto mb-3" />
          <p className="text-piedra mb-4">No hay propiedades cargadas</p>
          <button onClick={abrirNueva} className="btn-primary">Crear primera propiedad</button>
        </div>
      )}

      {modalForm && <FormPropiedad propiedad={editando} onClose={cerrarForm} />}
    </div>
  )
}
