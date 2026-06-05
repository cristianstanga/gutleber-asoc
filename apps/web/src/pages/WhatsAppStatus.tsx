import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Smartphone, RefreshCw, Wifi, WifiOff, Trash2 } from 'lucide-react'
import { api } from '../lib/api'

interface WAStatus { connected: boolean; session: string }
interface WAQr { qrImage: string | null; connected: boolean }

export default function WhatsAppStatus() {
  const qc = useQueryClient()

  const { data: status } = useQuery<WAStatus>({
    queryKey: ['wa-status'],
    queryFn: () => api.get('/whatsapp/status').then((r) => r.data),
    refetchInterval: 5_000,
  })

  const { data: qrData, isFetching: fetchingQR } = useQuery<WAQr>({
    queryKey: ['wa-qr'],
    queryFn: () => api.get('/whatsapp/qr').then((r) => r.data),
    refetchInterval: status?.connected ? false : 3_000,
    enabled: !status?.connected,
  })

  const restart = useMutation({
    mutationFn: () => api.post('/whatsapp/restart'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-status'] })
      qc.invalidateQueries({ queryKey: ['wa-qr'] })
    },
  })

  const clearSession = useMutation({
    mutationFn: () => api.post('/whatsapp/clear-session'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['wa-status'] })
      qc.invalidateQueries({ queryKey: ['wa-qr'] })
    },
  })

  const working = restart.isPending || clearSession.isPending

  return (
    <div className="p-8 max-w-lg">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">WhatsApp</h1>
          <p className="text-piedra text-sm mt-1">Estado de la conexión con Baileys</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => restart.mutate()}
            disabled={working}
            title="Reconectar sin borrar sesión"
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw size={14} className={restart.isPending ? 'animate-spin' : ''} />
            Reconectar
          </button>
          {!status?.connected && (
            <button
              onClick={() => clearSession.mutate()}
              disabled={working}
              title="Borra la sesión guardada y genera QR nuevo"
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 text-sm transition-colors disabled:opacity-50"
            >
              <Trash2 size={14} className={clearSession.isPending ? 'animate-spin' : ''} />
              Limpiar sesión
            </button>
          )}
        </div>
      </div>

      {/* Estado */}
      <div className="card p-5 mb-5">
        <div className="flex items-center gap-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center ${status?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
            {status?.connected
              ? <Wifi size={22} className="text-green-600" />
              : <WifiOff size={22} className="text-red-500" />}
          </div>
          <div>
            <p className="font-semibold text-carbon">
              {status?.connected ? 'Conectado' : 'Desconectado'}
            </p>
            <p className="text-piedra text-sm">
              {status?.connected
                ? 'Listo para enviar y recibir mensajes'
                : 'Escaneá el QR para conectar'}
            </p>
          </div>
          <div className={`ml-auto w-3 h-3 rounded-full ${status?.connected ? 'bg-green-500 animate-pulse' : 'bg-red-400'}`} />
        </div>
      </div>

      {/* QR */}
      {!status?.connected && (
        <div className="card p-6 text-center">
          <Smartphone size={28} className="text-arena mx-auto mb-3" />
          <h2 className="font-display text-lg text-carbon mb-1">Escanear QR</h2>
          <p className="text-piedra text-sm mb-5">
            WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneá el código
          </p>

          {qrData?.qrImage ? (
            <div className="inline-block border-4 border-carbon rounded-xl p-2 bg-white">
              <img src={qrData.qrImage} alt="QR WhatsApp" className="w-64 h-64 block" />
            </div>
          ) : (
            <div className="w-64 h-64 bg-crema rounded-xl mx-auto flex flex-col items-center justify-center border border-arena gap-2">
              <RefreshCw size={24} className="text-arena animate-spin" />
              <p className="text-xs text-piedra">
                {fetchingQR || working ? 'Generando QR...' : 'Esperando QR...'}
              </p>
              <p className="text-xs text-arena px-4">
                Si no aparece en 10 segundos, usá "Limpiar sesión"
              </p>
            </div>
          )}

          {qrData?.qrImage && (
            <p className="text-xs text-amber-600 mt-3">
              El QR expira en ~20 segundos. Se actualiza automáticamente.
            </p>
          )}
        </div>
      )}

      {status?.connected && (
        <div className="card p-6 text-center">
          <div className="text-green-500 text-5xl mb-3">✓</div>
          <p className="font-display text-lg text-carbon">WhatsApp conectado</p>
          <p className="text-piedra text-sm mt-2">Los mensajes entrantes aparecen en el Inbox automáticamente.</p>
        </div>
      )}
    </div>
  )
}
