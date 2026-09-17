import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Pencil, Trash2, X, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'

interface BlogPostItem {
  id: string
  titulo: string
  slug: string
  resumen: string | null
  contenido: string
  imagenPortada: string | null
  publicado: boolean
  publicadoEn: string | null
}

const emptyForm = { titulo: '', resumen: '', contenido: '', imagenPortada: '', publicado: false }

export default function Blog() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | BlogPostItem | null>(null)
  const [form, setForm] = useState(emptyForm)

  const { data: posts = [] } = useQuery<BlogPostItem[]>({
    queryKey: ['blog-admin'],
    queryFn: async () => (await api.get('/blog')).data,
  })

  const guardar = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) return (await api.put(`/blog/${data.id}`, data)).data
      return (await api.post('/blog', data)).data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-admin'] }); cerrar() },
  })

  const eliminar = useMutation({
    mutationFn: (id: string) => api.delete(`/blog/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-admin'] }),
  })

  const togglePublicado = useMutation({
    mutationFn: (p: BlogPostItem) => api.put(`/blog/${p.id}`, { ...p, publicado: !p.publicado }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-admin'] }),
  })

  function abrir(target: 'create' | BlogPostItem) {
    setModal(target)
    if (target === 'create') setForm(emptyForm)
    else setForm({
      titulo: target.titulo, resumen: target.resumen ?? '', contenido: target.contenido,
      imagenPortada: target.imagenPortada ?? '', publicado: target.publicado,
    })
  }

  function cerrar() { setModal(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, ...(modal !== 'create' && { id: (modal as BlogPostItem).id }) }
    guardar.mutate(payload)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-carbon text-2xl">Blog</h1>
          <p className="text-piedra text-sm mt-0.5">Artículos del sitio público · {posts.length} en total</p>
        </div>
        <button onClick={() => abrir('create')} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo artículo
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-crema">
              <th className="text-left p-3 text-piedra font-medium">Título</th>
              <th className="text-left p-3 text-piedra font-medium">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/50 transition-colors">
                <td className="p-3 font-medium text-carbon">{p.titulo}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.publicado ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {p.publicado ? 'Publicado' : 'Borrador'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => togglePublicado.mutate(p)}
                      className="text-piedra hover:text-carbon transition-colors"
                      title={p.publicado ? 'Pasar a borrador' : 'Publicar'}>
                      {p.publicado ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => abrir(p)} className="text-piedra hover:text-carbon transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => { if (confirm('¿Eliminar este artículo?')) eliminar.mutate(p.id) }}
                      className="text-piedra hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr><td colSpan={3} className="p-6 text-center text-piedra">Todavía no hay artículos</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-crema">
              <h2 className="font-display text-carbon text-lg">
                {modal === 'create' ? 'Nuevo artículo' : 'Editar artículo'}
              </h2>
              <button onClick={cerrar}><X size={18} className="text-piedra hover:text-carbon" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="form-label">Título</label>
                <input className="form-input" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
              </div>
              <div>
                <label className="form-label">Resumen (opcional, para la tarjeta del listado)</label>
                <textarea className="form-input resize-none" rows={2} value={form.resumen} onChange={(e) => setForm({ ...form, resumen: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Imagen de portada (URL)</label>
                <input className="form-input" value={form.imagenPortada} onChange={(e) => setForm({ ...form, imagenPortada: e.target.value })} placeholder="https://..." />
              </div>
              <div>
                <label className="form-label">Contenido</label>
                <textarea className="form-input resize-none" rows={10} value={form.contenido} onChange={(e) => setForm({ ...form, contenido: e.target.value })} required />
              </div>
              <label className="flex items-center gap-2 text-sm text-carbon">
                <input type="checkbox" checked={form.publicado} onChange={(e) => setForm({ ...form, publicado: e.target.checked })} />
                Publicado (visible en el sitio público)
              </label>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrar} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={guardar.isPending} className="btn-primary">
                  {guardar.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
