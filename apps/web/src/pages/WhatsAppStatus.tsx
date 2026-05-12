import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Smartphone, RefreshCw, Wifi, WifiOff } from 'lucide-react'
import { api } from '../lib/api'

interface WAStatus { connected: boolean; session: string }
interface WAQr { qr: string | null; connected: boolean }

export default function WhatsAppStatus() {
  const qc = useQueryClient()

  const { data: status } = useQuery<WAStatus>({
    queryKey: ['wa-status'],
    queryFn: () => api.get('/whatsapp/status').then((r) => r.data),
    refetchInterval: 5_000,
  })

  const { data: qrData } = useQuery<WAQr>({
    queryKey: ['wa-qr'],
    queryFn: () => api.get('/whatsapp/qr').then((r) => r.data),
    refetchInterval: status?.connected ? false : 3_000,
    enabled: !status?.connected,
  })

  const restart = useMutation({
    mutationFn: () => api.post('/whatsapp/restart'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wa-status', 'wa-qr'] }),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">WhatsApp</h1>
          <p className="text-piedra text-sm mt-1">Estado de la conexión con Baileys</p>
        </div>
        <button
          onClick={() => restart.mutate()}
          disabled={restart.isPending}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw size={15} className={restart.isPending ? 'animate-spin' : ''} />
          Reconectar
        </button>
      </div>

      {/* Estado */}
      <div className="card p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${status?.connected ? 'bg-green-100' : 'bg-red-100'}`}>
            {status?.connected
              ? <Wifi size={24} className="text-green-600" />
              : <WifiOff size={24} className="text-red-500" />}
          </div>
          <div>
            <p className="font-semibold text-carbon text-lg">
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
          <Smartphone size={32} className="text-arena mx-auto mb-4" />
          <h2 className="font-display text-lg text-carbon mb-2">Escanear QR</h2>
          <p className="text-piedra text-sm mb-6">
            Abrí WhatsApp → Dispositivos vinculados → Vincular dispositivo → Escaneá el código
          </p>

          {qrData?.qr ? (
            <div className="inline-block border-4 border-carbon rounded-lg p-2 bg-white">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent(qrData.qr)}`}
                alt="QR WhatsApp"
                className="w-64 h-64"
              />
            </div>
          ) : (
            <div className="w-64 h-64 bg-crema rounded-lg mx-auto flex items-center justify-center border border-arena">
              <div className="text-center">
                <RefreshCw size={24} className="text-arena mx-auto mb-2 animate-spin" />
                <p className="text-xs text-piedra">Esperando QR...</p>
                <p className="text-xs text-arena mt-1">Verificá que la API esté corriendo</p>
              </div>
            </div>
          )}
        </div>
      )}

      {status?.connected && (
        <div className="card p-6 text-center">
          <div className="text-green-500 text-5xl mb-3">✓</div>
          <p className="font-display text-lg text-carbon">WhatsApp conectado</p>
          <p className="text-piedra text-sm mt-2">Los mensajes entrantes aparecerán en el Inbox automáticamente.</p>
          <p className="text-xs text-arena mt-4">
            Los cron jobs enviarán recordatorios el día 25 de cada mes y marcarán mora el día 10.
          </p>
        </div>
      )}
    </div>
  )
}
