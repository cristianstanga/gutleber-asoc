import { useRef, useState } from 'react'
import { Upload, X, Trash2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Imagen { id: string; url: string; orden: number }

interface Props {
  propiedadId: string
  imagenes: Imagen[]
}

export default function ImageUpload({ propiedadId, imagenes }: Props) {
  const qc = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const eliminar = useMutation({
    mutationFn: (imagenId: string) => api.delete(`/propiedades/${propiedadId}/imagenes/${imagenId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['propiedades'] }),
  })

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError('')
    try {
      const form = new FormData()
      Array.from(files).forEach((f) => form.append('imagenes', f))
      await api.post(`/propiedades/${propiedadId}/imagenes`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch {
      setError('Error al subir las imágenes')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      {/* Preview de imágenes */}
      {imagenes.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-3">
          {imagenes.map((img) => (
            <div key={img.id} className="relative group aspect-square">
              <img
                src={img.url}
                alt=""
                className="w-full h-full object-cover rounded-lg border border-arena"
              />
              <button
                onClick={() => eliminar.mutate(img.id)}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Eliminar foto"
              >
                <Trash2 size={12} />
              </button>
              {img.orden === 0 && (
                <span className="absolute bottom-1 left-1 bg-carbon/70 text-white text-[9px] px-1.5 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Zona de drop */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleFiles(e.dataTransfer.files) }}
        className="border-2 border-dashed border-arena rounded-lg p-5 text-center cursor-pointer hover:border-piedra hover:bg-crema transition-colors"
      >
        {uploading ? (
          <div className="text-piedra text-sm animate-pulse">Subiendo fotos...</div>
        ) : (
          <>
            <Upload size={20} className="text-arena mx-auto mb-2" />
            <p className="text-sm text-piedra">Arrastrá fotos o hacé clic para seleccionar</p>
            <p className="text-xs text-arena mt-1">JPG, PNG o WEBP — máx. 5 MB por foto</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {error && <p className="text-red-600 text-xs mt-2">{error}</p>}
    </div>
  )
}
