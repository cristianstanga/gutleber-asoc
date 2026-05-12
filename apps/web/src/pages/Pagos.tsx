import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Download, Send, CheckCircle, Filter } from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'

interface Pago {
  id: string
  concepto: string
  monto: number
  moneda: string
  periodo?: string
  estado: string
  fechaVencimiento: string
  fechaPago?: string
  comprobanteEnviado: boolean
  persona?: { nombre: string; apellido: string; whatsapp?: string }
  propiedad?: { direccion: string }
}

const estadoBadge: Record<string, string> = {
  PENDIENTE: 'badge-yellow', PAGADO: 'badge-green', VENCIDO: 'badge-red',
  MORA: 'badge-red', ANULADO: 'badge-gray',
}
const estadoLabel: Record<string, string> = {
  PENDIENTE: 'Pendiente', PAGADO: 'Pagado', VENCIDO: 'Vencido', MORA: 'En mora', ANULADO: 'Anulado',
}

export default function Pagos() {
  const qc = useQueryClient()
  const [filtroEstado, setFiltroEstado] = useState('')
  const [toast, setToast] = useState('')

  const { data: pagos = [], isLoading } = useQuery<Pago[]>({
    queryKey: ['pagos', filtroEstado],
    queryFn: () => api.get('/pagos', { params: filtroEstado ? { estado: filtroEstado } : {} }).then((r) => r.data),
  })

  const marcarPagado = useMutation({
    mutationFn: (id: string) => api.patch(`/pagos/${id}/marcar-pagado`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pagos'] }); mostrarToast('Marcado como pagado') },
  })

  const enviarWA = useMutation({
    mutationFn: (id: string) => api.post(`/pagos/${id}/enviar-whatsapp`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pagos'] }); mostrarToast('Recibo enviado por WhatsApp') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al enviar'
      mostrarToast(msg)
    },
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function descargarPDF(id: string, periodo?: string) {
    try {
      const response = await api.get(`/pagos/${id}/pdf`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `recibo-${periodo || id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      mostrarToast('Error al generar el PDF')
    }
  }

  return (
    <div className="p-8">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Pagos</h1>
          <p className="text-piedra text-sm mt-1">{pagos.length} registros</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-piedra" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="form-select text-sm w-36"
            >
              <option value="">Todos</option>
              <option value="PENDIENTE">Pendientes</option>
              <option value="PAGADO">Pagados</option>
              <option value="MORA">En mora</option>
              <option value="VENCIDO">Vencidos</option>
            </select>
          </div>
          <button className="btn-primary flex items-center gap-2">
            <CreditCard size={16} /> Nuevo pago
          </button>
        </div>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-crema border-b border-arena">
            <tr>
              <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Período</th>
              <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Inquilino</th>
              <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Propiedad</th>
              <th className="text-right px-4 py-3 text-xs text-piedra uppercase tracking-wide">Monto</th>
              <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Vencimiento</th>
              <th className="text-left px-4 py-3 text-xs text-piedra uppercase tracking-wide">Estado</th>
              <th className="text-right px-4 py-3 text-xs text-piedra uppercase tracking-wide">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/40">
                <td className="px-4 py-3">
                  <p className="font-semibold text-carbon">{p.periodo || '—'}</p>
                  <p className="text-[11px] text-arena">{p.concepto.substring(0, 35)}</p>
                </td>
                <td className="px-4 py-3 text-carbon">
                  {p.persona ? `${p.persona.nombre} ${p.persona.apellido}` : '—'}
                </td>
                <td className="px-4 py-3 text-carbon text-xs hidden lg:table-cell">
                  {p.propiedad?.direccion || '—'}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-carbon">{formatARS(p.monto)}</td>
                <td className="px-4 py-3 text-carbon">{formatFecha(p.fechaVencimiento)}</td>
                <td className="px-4 py-3">
                  <span className={estadoBadge[p.estado] || 'badge-gray'}>{estadoLabel[p.estado] || p.estado}</span>
                  {p.comprobanteEnviado && (
                    <span className="ml-1 text-[10px] text-green-600">✓ Enviado</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 justify-end">
                    {p.estado !== 'PAGADO' && p.estado !== 'ANULADO' && (
                      <button
                        onClick={() => marcarPagado.mutate(p.id)}
                        disabled={marcarPagado.isPending}
                        title="Marcar pagado"
                        className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                    <button
                      onClick={() => descargarPDF(p.id, p.periodo ?? undefined)}
                      title="Descargar PDF"
                      className="p-1.5 rounded hover:bg-crema text-piedra transition-colors"
                    >
                      <Download size={15} />
                    </button>
                    {p.persona?.whatsapp && (
                      <button
                        onClick={() => enviarWA.mutate(p.id)}
                        disabled={enviarWA.isPending}
                        title="Enviar por WhatsApp"
                        className="p-1.5 rounded hover:bg-green-50 text-green-600 transition-colors"
                      >
                        <Send size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && !isLoading && (
          <div className="py-12 text-center text-piedra text-sm">No hay pagos registrados</div>
        )}
      </div>
    </div>
  )
}
