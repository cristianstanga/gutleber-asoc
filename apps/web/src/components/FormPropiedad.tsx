import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Propiedad {
  id?: string
  direccion: string
  tipo: string
  superficie?: number | ''
  enAlquiler: boolean
  enVenta: boolean
  administrada: boolean
  alquilerBase?: number | ''
  indiceActual?: string
  valorVenta?: number | ''
  descripcion?: string
  notas?: string
}

const vacía: Propiedad = {
  direccion: '', tipo: 'DEPARTAMENTO', superficie: '',
  enAlquiler: false, enVenta: false, administrada: false,
  alquilerBase: '', indiceActual: '', valorVenta: '', descripcion: '', notas: '',
}

interface Props {
  propiedad?: Propiedad | null
  onClose: () => void
}

export default function FormPropiedad({ propiedad, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Propiedad>(propiedad || vacía)

  useEffect(() => { setForm(propiedad || vacía) }, [propiedad])

  const guardar = useMutation({
    mutationFn: (data: Propiedad) =>
      propiedad?.id
        ? api.put(`/propiedades/${propiedad.id}`, data).then((r) => r.data)
        : api.post('/propiedades', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      onClose()
    },
  })

  function set<K extends keyof Propiedad>(key: K, value: Propiedad[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = {
      ...form,
      superficie: form.superficie !== '' ? Number(form.superficie) : undefined,
      alquilerBase: form.alquilerBase !== '' ? Number(form.alquilerBase) : undefined,
      valorVenta: form.valorVenta !== '' ? Number(form.valorVenta) : undefined,
      indiceActual: form.indiceActual || undefined,
    }
    guardar.mutate(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena sticky top-0 bg-white">
          <h2 className="font-display text-xl text-carbon">
            {propiedad?.id ? 'Editar propiedad' : 'Nueva propiedad'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-crema rounded transition-colors">
            <X size={20} className="text-piedra" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-5">
          {/* Dirección */}
          <div>
            <label className="form-label">Dirección *</label>
            <input
              className="form-input"
              value={form.direccion}
              onChange={(e) => set('direccion', e.target.value)}
              placeholder="Av. Costanera 1250, Posadas"
              required
            />
          </div>

          {/* Tipo + Superficie */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Tipo *</label>
              <select className="form-select" value={form.tipo} onChange={(e) => set('tipo', e.target.value)} required>
                <option value="DEPARTAMENTO">Departamento</option>
                <option value="CASA">Casa</option>
                <option value="LOCAL">Local comercial</option>
                <option value="TERRENO">Terreno</option>
                <option value="OFICINA">Oficina</option>
              </select>
            </div>
            <div>
              <label className="form-label">Superficie (m²)</label>
              <input
                type="number" min="0" step="0.5"
                className="form-input"
                value={form.superficie}
                onChange={(e) => set('superficie', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="65"
              />
            </div>
          </div>

          {/* Estados */}
          <div>
            <label className="form-label">Estado</label>
            <div className="flex gap-6 mt-1">
              {[
                { key: 'enAlquiler', label: 'En alquiler' },
                { key: 'enVenta', label: 'En venta' },
                { key: 'administrada', label: 'Administrada' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer text-sm text-carbon">
                  <input
                    type="checkbox"
                    checked={!!form[key as keyof Propiedad]}
                    onChange={(e) => set(key as keyof Propiedad, e.target.checked as never)}
                    className="rounded border-arena accent-piedra"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Alquiler */}
          {form.enAlquiler && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-crema rounded-lg">
              <div>
                <label className="form-label">Alquiler base (ARS)</label>
                <input
                  type="number" min="0"
                  className="form-input bg-white"
                  value={form.alquilerBase}
                  onChange={(e) => set('alquilerBase', e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="180000"
                />
              </div>
              <div>
                <label className="form-label">Índice de ajuste</label>
                <select className="form-select bg-white" value={form.indiceActual || ''} onChange={(e) => set('indiceActual', e.target.value)}>
                  <option value="">Sin índice</option>
                  <option value="ICL">ICL (BCRA)</option>
                  <option value="IPC">IPC (INDEC)</option>
                  <option value="UVA">UVA</option>
                </select>
              </div>
            </div>
          )}

          {/* Venta */}
          {form.enVenta && (
            <div className="p-4 bg-crema rounded-lg">
              <label className="form-label">Precio de venta (USD)</label>
              <input
                type="number" min="0"
                className="form-input bg-white"
                value={form.valorVenta}
                onChange={(e) => set('valorVenta', e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="45000"
              />
            </div>
          )}

          {/* Descripción */}
          <div>
            <label className="form-label">Descripción pública</label>
            <textarea
              className="form-input resize-none"
              rows={3}
              value={form.descripcion || ''}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Hermoso departamento con vista al río, 2 dormitorios, cocina equipada..."
            />
            <p className="text-[11px] text-arena mt-1">Se usa al publicar en Instagram y en el bot de WhatsApp.</p>
          </div>

          {/* Notas internas */}
          <div>
            <label className="form-label">Notas internas</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.notas || ''}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Solo visible en el sistema..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-crema">
            <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
            <button type="submit" disabled={guardar.isPending} className="btn-primary px-6">
              {guardar.isPending ? 'Guardando...' : propiedad?.id ? 'Guardar cambios' : 'Crear propiedad'}
            </button>
          </div>

          {guardar.isError && (
            <p className="text-red-600 text-sm text-center">Error al guardar. Intentá de nuevo.</p>
          )}
        </form>
      </div>
    </div>
  )
}
