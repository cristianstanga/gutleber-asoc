import { useState, useEffect, FormEvent } from 'react'
import { X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'

interface Persona {
  id?: string
  nombre: string
  apellido: string
  dni?: string
  whatsapp?: string
  email?: string
  tipo: string
  notas?: string
}

const vacía: Persona = {
  nombre: '', apellido: '', dni: '', whatsapp: '', email: '',
  tipo: 'INQUILINO', notas: '',
}

interface Props {
  persona?: Persona | null
  onClose: () => void
}

export default function FormPersona({ persona, onClose }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState<Persona>(persona || vacía)

  useEffect(() => { setForm(persona || vacía) }, [persona])

  const guardar = useMutation({
    mutationFn: (data: Persona) =>
      persona?.id
        ? api.put(`/personas/${persona.id}`, data).then((r) => r.data)
        : api.post('/personas', data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['personas'] })
      onClose()
    },
  })

  function set<K extends keyof Persona>(key: K, value: Persona[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const data = {
      ...form,
      dni: form.dni || undefined,
      whatsapp: form.whatsapp || undefined,
      email: form.email || undefined,
      notas: form.notas || undefined,
    }
    guardar.mutate(data)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena sticky top-0 bg-white">
          <h2 className="font-display text-xl text-carbon">
            {persona?.id ? 'Editar persona' : 'Nueva persona'}
          </h2>
          <button onClick={onClose} className="p-1 hover:bg-crema rounded transition-colors">
            <X size={20} className="text-piedra" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">

          {/* Tipo */}
          <div>
            <label className="form-label">Tipo *</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: 'INQUILINO',    label: 'Inquilino' },
                { value: 'PROPIETARIO',  label: 'Propietario' },
                { value: 'GARANTE',      label: 'Garante' },
                { value: 'INTERESADO',   label: 'Interesado' },
              ].map(({ value, label }) => (
                <label
                  key={value}
                  className={`flex items-center gap-2 px-3 py-2 rounded border cursor-pointer text-sm transition-colors ${
                    form.tipo === value
                      ? 'border-piedra bg-crema text-carbon font-semibold'
                      : 'border-arena text-arena hover:border-piedra'
                  }`}
                >
                  <input
                    type="radio"
                    name="tipo"
                    value={value}
                    checked={form.tipo === value}
                    onChange={() => set('tipo', value)}
                    className="hidden"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {/* Nombre + Apellido */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="form-label">Nombre *</label>
              <input
                className="form-input"
                value={form.nombre}
                onChange={(e) => set('nombre', e.target.value)}
                placeholder="Marcos"
                required
              />
            </div>
            <div>
              <label className="form-label">Apellido *</label>
              <input
                className="form-input"
                value={form.apellido}
                onChange={(e) => set('apellido', e.target.value)}
                placeholder="Villalba"
                required
              />
            </div>
          </div>

          {/* DNI */}
          <div>
            <label className="form-label">DNI</label>
            <input
              className="form-input"
              value={form.dni || ''}
              onChange={(e) => set('dni', e.target.value)}
              placeholder="32541890"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="form-label">WhatsApp</label>
            <div className="flex gap-2 items-center">
              <span className="text-sm text-piedra bg-crema border border-arena rounded px-3 py-2 shrink-0">
                +549
              </span>
              <input
                className="form-input"
                value={form.whatsapp?.replace('549', '') || ''}
                onChange={(e) => set('whatsapp', `549${e.target.value.replace(/\D/g, '')}`)}
                placeholder="3764 100001"
              />
            </div>
            <p className="text-[11px] text-arena mt-1">
              Ingresá el número sin 0 ni 15. Ej: 3764100001 → se guarda como 5493764100001
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={form.email || ''}
              onChange={(e) => set('email', e.target.value)}
              placeholder="marcos@gmail.com"
            />
          </div>

          {/* Notas */}
          <div>
            <label className="form-label">Notas internas</label>
            <textarea
              className="form-input resize-none"
              rows={2}
              value={form.notas || ''}
              onChange={(e) => set('notas', e.target.value)}
              placeholder="Información adicional..."
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-2 border-t border-crema">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" disabled={guardar.isPending} className="btn-primary px-6">
              {guardar.isPending ? 'Guardando...' : persona?.id ? 'Guardar cambios' : 'Crear persona'}
            </button>
          </div>

          {guardar.isError && (
            <p className="text-red-600 text-sm text-center">
              {(guardar.error as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al guardar'}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}
