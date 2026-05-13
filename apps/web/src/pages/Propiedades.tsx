import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2, MapPin, Ruler, Tag, Pencil, Trash2, Instagram, Images, X, ChevronLeft, ImageIcon } from 'lucide-react'
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
  enAlquiler: boolean
  enVenta: boolean
  administrada: boolean
  alquilerBase?: number
  indiceActual?: string
  valorVenta?: number
  descripcion?: string
  notas?: string
  instagramPostId?: string
  imagenes: Imagen[]
  videos: VideoItem[]
  vinculos?: Array<{ persona: { nombre: string; apellido: string }; alquilerActual?: number }>
}

const tipoLabel: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}

export default function Propiedades() {
  const qc = useQueryClient()
  const [modalForm, setModalForm] = useState(false)
  const [editando, setEditando] = useState<Propiedad | null>(null)
  const [detalle, setDetalle] = useState<Propiedad | null>(null)
  const [toast, setToast] = useState('')
  const [publicando, setPublicando] = useState<string | null>(null)

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

  // Si hay una propiedad abierta en detalle, mostrar el panel de detalle
  if (detalle) {
    const prop = propiedades.find((p) => p.id === detalle.id) || detalle
    return (
      <div className="p-8">
        {toast && <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

        <button onClick={() => setDetalle(null)} className="flex items-center gap-2 text-piedra text-sm mb-5 hover:text-carbon transition-colors">
          <ChevronLeft size={16} /> Volver a propiedades
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Info */}
          <div className="lg:col-span-2 space-y-4">
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
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {prop.superficie && (
                  <div className="flex items-center gap-2">
                    <Ruler size={14} className="text-arena" />
                    <span className="text-carbon">{prop.superficie} m²</span>
                  </div>
                )}
                {prop.enAlquiler && prop.alquilerBase && (
                  <div className="flex items-center gap-2">
                    <span className="text-arena">Alquiler:</span>
                    <span className="font-semibold text-carbon">{formatARS(prop.alquilerBase)}</span>
                    {prop.indiceActual && <span className="badge-gray">{prop.indiceActual}</span>}
                  </div>
                )}
                {prop.enVenta && prop.valorVenta && (
                  <div className="flex items-center gap-2">
                    <Tag size={14} className="text-arena" />
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
                  <span className="text-arena font-normal text-xs ml-2">
                    {prop.imagenes.length} foto{prop.imagenes.length !== 1 ? 's' : ''} · {(prop.videos || []).length} video{(prop.videos || []).length !== 1 ? 's' : ''}
                  </span>
                </h3>
              </div>
              <ImageUpload propiedadId={prop.id} imagenes={prop.imagenes} videos={prop.videos || []} />
            </div>
          </div>

          {/* Sidebar acciones */}
          <div className="space-y-4">
            <div className="card p-5 space-y-3">
              <h3 className="font-semibold text-carbon text-sm">Tarjeta con datos</h3>
              {prop.imagenes.length > 0 ? (
                <div className="space-y-2">
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/public/tarjeta/${prop.id}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <ImageIcon size={15} /> Ver tarjeta (preview)
                  </a>
                  <a
                    href={`${import.meta.env.VITE_API_URL || 'http://localhost:3001'}/api/public/tarjeta/${prop.id}`}
                    target="_blank"
                    rel="noreferrer"
                    download
                    className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
                  >
                    ⬇ Descargar JPEG
                  </a>
                  <p className="text-[11px] text-arena text-center">1080×1080 px · listo para WhatsApp e Instagram</p>
                </div>
              ) : (
                <p className="text-[11px] text-arena">Subí una foto para generar la tarjeta.</p>
              )}
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
              <p className="text-[11px] text-arena text-center">
                {prop.imagenes.length === 0
                  ? 'Necesitás subir fotos primero'
                  : prop.imagenes.length === 1
                  ? 'Se publicará como imagen simple'
                  : `Se publicará como carrusel (${prop.imagenes.length} fotos)`}
              </p>
              {prop.instagramPostId && (
                <p className="text-[11px] text-green-600 text-center mt-1">✓ Ya publicada en Instagram</p>
              )}
            </div>

            {prop.vinculos && prop.vinculos.length > 0 && (
              <div className="card p-5">
                <h3 className="font-semibold text-carbon mb-3 text-sm">Inquilino actual</h3>
                {prop.vinculos.map((v, i) => (
                  <div key={i}>
                    <p className="text-sm text-carbon font-semibold">{v.persona.nombre} {v.persona.apellido}</p>
                    {v.alquilerActual && <p className="text-xs text-piedra">{formatARS(v.alquilerActual)}/mes</p>}
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
  return (
    <div className="p-8">
      {toast && <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Propiedades</h1>
          <p className="text-piedra text-sm mt-1">{propiedades.length} propiedades en cartera</p>
        </div>
        <button onClick={abrirNueva} className="btn-primary flex items-center gap-2">
          <Building2 size={16} /> Nueva propiedad
        </button>
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
                <Building2 size={32} className="text-arena" />
              </div>
            )}

            <div className="p-4">
              {/* Badges */}
              <div className="flex gap-1 flex-wrap mb-2">
                {p.enAlquiler && <span className="badge-piedra">Alquiler</span>}
                {p.enVenta && <span className="badge-blue">Venta</span>}
                {p.administrada && <span className="badge-green">Admin.</span>}
                {p.instagramPostId && <span className="badge-gray"><Instagram size={9} className="inline" /></span>}
              </div>

              {/* Tipo */}
              <p className="text-xs text-arena">{tipoLabel[p.tipo]}</p>

              {/* Dirección */}
              <div className="flex items-start gap-1 mt-0.5 mb-2">
                <MapPin size={12} className="text-arena mt-0.5 shrink-0" />
                <p className="text-sm font-semibold text-carbon leading-snug">{p.direccion}</p>
              </div>

              {/* Montos */}
              <div className="space-y-0.5 text-xs mb-3">
                {p.enAlquiler && p.alquilerBase && (
                  <p className="text-carbon">{formatARS(p.alquilerBase)} <span className="text-arena">/ mes</span></p>
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
          <Building2 size={32} className="text-arena mx-auto mb-3" />
          <p className="text-piedra mb-4">No hay propiedades cargadas</p>
          <button onClick={abrirNueva} className="btn-primary">Crear primera propiedad</button>
        </div>
      )}

      {modalForm && <FormPropiedad propiedad={editando} onClose={cerrarForm} />}
    </div>
  )
}
