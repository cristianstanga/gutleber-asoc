import { useRef, useState } from 'react'
import { Upload, Trash2, Play, Image as ImageIcon, Video } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Imagen { id: string; url: string; orden: number }
interface VideoItem { id: string; url: string; orden: number; titulo?: string }

interface Props {
  propiedadId: string
  imagenes: Imagen[]
  videos?: VideoItem[]
}

export default function ImageUpload({ propiedadId, imagenes, videos = [] }: Props) {
  const qc = useQueryClient()
  const inputImgRef = useRef<HTMLInputElement>(null)
  const inputVidRef = useRef<HTMLInputElement>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingVid, setUploadingVid] = useState(false)
  const [errorImg, setErrorImg] = useState('')
  const [errorVid, setErrorVid] = useState('')

  const eliminarImg = useMutation({
    mutationFn: (imagenId: string) => api.delete(`/propiedades/${propiedadId}/imagenes/${imagenId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  })

  const eliminarVid = useMutation({
    mutationFn: (videoId: string) => api.delete(`/propiedades/${propiedadId}/videos/${videoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  })

  async function handleImagenes(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingImg(true)
    setErrorImg('')
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('imagenes', f))
      await api.post(`/propiedades/${propiedadId}/imagenes`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch {
      setErrorImg('Error al subir las imágenes. Verificá que sean JPG, PNG o WEBP (máx. 5 MB).')
    } finally {
      setUploadingImg(false)
    }
  }

  async function handleVideos(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingVid(true)
    setErrorVid('')
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('videos', f))
      await api.post(`/propiedades/${propiedadId}/videos`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch {
      setErrorVid('Error al subir el video. Verificá que sea MP4, MOV o WEBM (máx. 200 MB).')
    } finally {
      setUploadingVid(false)
    }
  }

  return (
    <div className="space-y-5">

      {/* ── FOTOS ─────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <ImageIcon size={14} className="text-piedra" />
          <p className="text-xs font-semibold text-carbon uppercase tracking-wide">
            Fotos {imagenes.length > 0 && <span className="text-muted font-normal normal-case">({imagenes.length})</span>}
          </p>
        </div>

        {imagenes.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mb-3">
            {imagenes.map((img, idx) => (
              <div key={img.id} className="relative group aspect-square">
                <img
                  src={img.url}
                  alt=""
                  className="w-full h-full object-cover rounded-lg border border-arena"
                />
                <button
                  onClick={() => eliminarImg.mutate(img.id)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar foto"
                >
                  <Trash2 size={10} />
                </button>
                {idx === 0 && (
                  <span className="absolute bottom-1 left-1 bg-carbon/75 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Principal
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => inputImgRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleImagenes(e.dataTransfer.files) }}
          className="border-2 border-dashed border-arena rounded-lg p-4 text-center cursor-pointer hover:border-piedra hover:bg-crema transition-colors"
        >
          {uploadingImg ? (
            <div className="text-piedra text-sm animate-pulse">Subiendo fotos...</div>
          ) : (
            <>
              <Upload size={18} className="text-muted mx-auto mb-1.5" />
              <p className="text-xs text-piedra">Arrastrá fotos o hacé clic</p>
              <p className="text-[10px] text-muted mt-0.5">JPG, PNG, WEBP — máx. 5 MB</p>
            </>
          )}
        </div>
        <input
          ref={inputImgRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleImagenes(e.target.files)}
        />
        {errorImg && <p className="text-red-600 text-xs mt-1">{errorImg}</p>}
      </div>

      {/* ── VIDEOS ────────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <Video size={14} className="text-piedra" />
          <p className="text-xs font-semibold text-carbon uppercase tracking-wide">
            Videos {videos.length > 0 && <span className="text-muted font-normal normal-case">({videos.length})</span>}
          </p>
        </div>

        {videos.length > 0 && (
          <div className="space-y-2 mb-3">
            {videos.map((vid) => (
              <div key={vid.id} className="flex items-center gap-2 bg-crema rounded-lg px-3 py-2 group">
                <div className="w-8 h-8 bg-carbon/10 rounded flex items-center justify-center shrink-0">
                  <Play size={14} className="text-piedra" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-carbon truncate">{vid.titulo || `Video ${vid.orden + 1}`}</p>
                  <video
                    src={vid.url}
                    className="mt-1 w-full rounded max-h-32 object-cover"
                    controls
                    preload="metadata"
                  />
                </div>
                <button
                  onClick={() => eliminarVid.mutate(vid.id)}
                  className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  title="Eliminar video"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}

        <div
          onClick={() => inputVidRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleVideos(e.dataTransfer.files) }}
          className="border-2 border-dashed border-arena rounded-lg p-4 text-center cursor-pointer hover:border-piedra hover:bg-crema transition-colors"
        >
          {uploadingVid ? (
            <div className="text-piedra text-sm animate-pulse">Subiendo video... (puede tardar)</div>
          ) : (
            <>
              <Video size={18} className="text-muted mx-auto mb-1.5" />
              <p className="text-xs text-piedra">Arrastrá un video o hacé clic</p>
              <p className="text-[10px] text-muted mt-0.5">MP4, MOV, WEBM — máx. 200 MB</p>
            </>
          )}
        </div>
        <input
          ref={inputVidRef}
          type="file"
          accept="video/mp4,video/quicktime,video/webm,video/x-msvideo"
          multiple
          className="hidden"
          onChange={(e) => handleVideos(e.target.files)}
        />
        {errorVid && <p className="text-red-600 text-xs mt-1">{errorVid}</p>}
      </div>

    </div>
  )
}
