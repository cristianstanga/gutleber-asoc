import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Send, CheckCheck } from 'lucide-react'
import { api, formatFecha } from '../lib/api'

interface InboxItem {
  id: string
  canal: string
  mensaje: string
  tipo: string
  leido: boolean
  createdAt: string
  persona?: { nombre: string; apellido: string; whatsapp?: string }
  propiedad?: { direccion: string }
}

const tipoBadge: Record<string, string> = {
  ENTRANTE: 'badge-blue', SALIENTE: 'badge-green', SISTEMA: 'badge-gray',
}

export default function Inbox() {
  const qc = useQueryClient()
  const [soloNoLeidos, setSoloNoLeidos] = useState(false)

  const { data: items = [], isLoading } = useQuery<InboxItem[]>({
    queryKey: ['inbox', soloNoLeidos],
    queryFn: () => api.get('/inbox', { params: soloNoLeidos ? { leido: false } : {} }).then((r) => r.data),
    refetchInterval: 15_000,
  })

  const marcarLeido = useMutation({
    mutationFn: (id: string) => api.patch(`/inbox/${id}/leer`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  const marcarTodo = useMutation({
    mutationFn: () => api.patch('/inbox/leer-todo'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inbox'] }),
  })

  const noLeidos = items.filter((i) => !i.leido).length

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Inbox</h1>
          <p className="text-piedra text-sm mt-1">
            {noLeidos > 0 ? `${noLeidos} mensajes no leídos` : 'Todo al día'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-piedra cursor-pointer">
            <input
              type="checkbox"
              checked={soloNoLeidos}
              onChange={(e) => setSoloNoLeidos(e.target.checked)}
              className="rounded border-arena"
            />
            Solo no leídos
          </label>
          {noLeidos > 0 && (
            <button
              onClick={() => marcarTodo.mutate()}
              className="btn-secondary flex items-center gap-2 text-xs"
            >
              <CheckCheck size={14} /> Marcar todo leído
            </button>
          )}
        </div>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`card p-4 cursor-pointer transition-all ${!item.leido ? 'border-l-4 border-l-piedra' : ''}`}
            onClick={() => !item.leido && marcarLeido.mutate(item.id)}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${item.tipo === 'ENTRANTE' ? 'bg-blue-100' : 'bg-green-100'}`}>
                  {item.tipo === 'ENTRANTE'
                    ? <MessageSquare size={15} className="text-blue-600" />
                    : <Send size={15} className="text-green-600" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    {item.persona && (
                      <span className="font-semibold text-sm text-carbon">
                        {item.persona.nombre} {item.persona.apellido}
                      </span>
                    )}
                    <span className={tipoBadge[item.tipo] || 'badge-gray'}>{item.tipo}</span>
                    <span className="badge-gray">{item.canal}</span>
                    {!item.leido && <span className="w-2 h-2 rounded-full bg-piedra inline-block" />}
                  </div>
                  <p className="text-sm text-carbon">{item.mensaje}</p>
                  {item.propiedad && (
                    <p className="text-xs text-arena mt-1">{item.propiedad.direccion}</p>
                  )}
                </div>
              </div>
              <span className="text-xs text-arena shrink-0">{formatFecha(item.createdAt)}</span>
            </div>
          </div>
        ))}
        {items.length === 0 && !isLoading && (
          <div className="card py-16 text-center">
            <MessageSquare size={32} className="text-arena mx-auto mb-3" />
            <p className="text-piedra">No hay mensajes</p>
          </div>
        )}
      </div>
    </div>
  )
}
