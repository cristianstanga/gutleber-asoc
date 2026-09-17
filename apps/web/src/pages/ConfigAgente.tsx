import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Bot, Save, Info, Globe } from 'lucide-react'
import { api } from '../lib/api'

const CLAVES = {
  REQUISITOS_ALQUILER: 'requisitos_alquiler',
  HORARIOS_ATENCION: 'horarios_atencion',
  CONTACTO_EMAIL: 'contacto_email',
  TEXTO_NOSOTROS: 'texto_nosotros',
  TEXTO_SERVICIOS: 'texto_servicios',
}

export default function ConfigAgente() {
  const qc = useQueryClient()
  const [requisitos, setRequisitos] = useState('')
  const [horarios, setHorarios] = useState('')
  const [email, setEmail] = useState('')
  const [textoNosotros, setTextoNosotros] = useState('')
  const [textoServicios, setTextoServicios] = useState('')
  const [toast, setToast] = useState('')

  const { data, isLoading } = useQuery<Record<string, string>>({
    queryKey: ['config'],
    queryFn: () => api.get('/config').then((r) => r.data),
  })

  useEffect(() => {
    if (data) {
      setRequisitos(data[CLAVES.REQUISITOS_ALQUILER] || '')
      setHorarios(data[CLAVES.HORARIOS_ATENCION] || '')
      setEmail(data[CLAVES.CONTACTO_EMAIL] || '')
      setTextoNosotros(data[CLAVES.TEXTO_NOSOTROS] || '')
      setTextoServicios(data[CLAVES.TEXTO_SERVICIOS] || '')
    }
  }, [data])

  const guardar = useMutation({
    mutationFn: async () => {
      await api.put(`/config/${CLAVES.REQUISITOS_ALQUILER}`, { valor: requisitos })
      await api.put(`/config/${CLAVES.HORARIOS_ATENCION}`, { valor: horarios })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      mostrarToast('Configuración guardada — el agente la usa desde el próximo mensaje')
    },
    onError: () => mostrarToast('Error al guardar'),
  })

  const guardarSitio = useMutation({
    mutationFn: async () => {
      await api.put(`/config/${CLAVES.CONTACTO_EMAIL}`, { valor: email })
      await api.put(`/config/${CLAVES.TEXTO_NOSOTROS}`, { valor: textoNosotros })
      await api.put(`/config/${CLAVES.TEXTO_SERVICIOS}`, { valor: textoServicios })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['config'] })
      mostrarToast('Contenido del sitio público guardado')
    },
    onError: () => mostrarToast('Error al guardar'),
  })

  function mostrarToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 4000)
  }

  if (isLoading) return <div className="p-8 text-piedra text-sm animate-pulse">Cargando...</div>

  return (
    <div className="p-8 max-w-2xl">
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded shadow-lg text-sm z-50">{toast}</div>
      )}

      <div className="mb-6">
        <h1 className="font-display text-2xl text-carbon flex items-center gap-2">
          <Bot size={22} className="text-piedra" /> Configuración del agente IA
        </h1>
        <p className="text-piedra text-sm mt-1">
          Estos textos los usa el agente automático para responder consultas por WhatsApp.
        </p>
      </div>

      <div className="card p-4 mb-6 flex items-start gap-3 border-l-4 border-l-arena">
        <Info size={16} className="text-piedra mt-0.5 shrink-0" />
        <p className="text-xs text-carbon">
          Cambios acá se aplican inmediatamente — no requieren reiniciar el sistema ni hacer deploy.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="form-label">Requisitos para alquilar</label>
          <p className="text-xs text-piedra mb-2">
            Lo que el agente explica cuando alguien pregunta qué necesita para alquilar.
          </p>
          <textarea
            className="form-input resize-none text-sm"
            rows={4}
            value={requisitos}
            onChange={(e) => setRequisitos(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">Horarios de atención</label>
          <p className="text-xs text-piedra mb-2">
            El agente los usa para coordinar visitas y avisar cuándo no se atiende.
          </p>
          <textarea
            className="form-input resize-none text-sm"
            rows={3}
            value={horarios}
            onChange={(e) => setHorarios(e.target.value)}
          />
        </div>

        <button
          onClick={() => guardar.mutate()}
          disabled={guardar.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={14} />
          {guardar.isPending ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>

      <div className="mb-6 mt-10">
        <h2 className="font-display text-xl text-carbon flex items-center gap-2">
          <Globe size={20} className="text-piedra" /> Contenido del sitio público
        </h2>
        <p className="text-piedra text-sm mt-1">
          Textos que se muestran en las páginas Nosotros y Servicios de gutleberyasociados.com.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        <div>
          <label className="form-label">Email de contacto</label>
          <input
            type="email"
            className="form-input text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contacto@gutleberyasociados.com"
          />
        </div>

        <div>
          <label className="form-label">Texto "Nosotros"</label>
          <p className="text-xs text-piedra mb-2">Si lo dejás vacío, el sitio muestra un texto genérico por defecto.</p>
          <textarea
            className="form-input resize-none text-sm"
            rows={5}
            value={textoNosotros}
            onChange={(e) => setTextoNosotros(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label">Texto "Servicios"</label>
          <textarea
            className="form-input resize-none text-sm"
            rows={3}
            value={textoServicios}
            onChange={(e) => setTextoServicios(e.target.value)}
          />
        </div>

        <button
          onClick={() => guardarSitio.mutate()}
          disabled={guardarSitio.isPending}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={14} />
          {guardarSitio.isPending ? 'Guardando...' : 'Guardar contenido del sitio'}
        </button>
      </div>
    </div>
  )
}
