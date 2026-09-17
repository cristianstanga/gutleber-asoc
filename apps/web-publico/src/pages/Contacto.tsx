import { useQuery } from '@tanstack/react-query'
import { MessageCircle, Instagram, Mail, Clock } from 'lucide-react'
import { getConfig, waLink } from '../lib/api'

export default function Contacto() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig })
  const whatsapp = config?.contacto_whatsapp || '5493765410765'

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl text-petroleo mb-3">Contacto</h1>
      <p className="text-petroleo/70 mb-8">La forma más rápida de hablar con nosotros es por WhatsApp.</p>

      <div className="bg-white border border-crema rounded-xl divide-y divide-crema">
        <a
          href={waLink(whatsapp, 'Hola! Quiero más información.')}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-5 hover:bg-crema/40 transition-colors"
        >
          <MessageCircle className="text-[#25D366]" size={22} />
          <div>
            <p className="font-semibold text-petroleo">WhatsApp</p>
            <p className="text-sm text-petroleo/60">{config?.contacto_telefono || '+54 9 3765 41-0765'}</p>
          </div>
        </a>

        {config?.contacto_email && (
          <a href={`mailto:${config.contacto_email}`} className="flex items-center gap-3 p-5 hover:bg-crema/40 transition-colors">
            <Mail className="text-acero" size={22} />
            <div>
              <p className="font-semibold text-petroleo">Email</p>
              <p className="text-sm text-petroleo/60">{config.contacto_email}</p>
            </div>
          </a>
        )}

        <a
          href={`https://instagram.com/${config?.instagram_usuario || 'gutleberasociados'}`}
          target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3 p-5 hover:bg-crema/40 transition-colors"
        >
          <Instagram className="text-acero" size={22} />
          <div>
            <p className="font-semibold text-petroleo">Instagram</p>
            <p className="text-sm text-petroleo/60">@{config?.instagram_usuario || 'gutleberasociados'}</p>
          </div>
        </a>

        <div className="flex items-center gap-3 p-5">
          <Clock className="text-acero" size={22} />
          <div>
            <p className="font-semibold text-petroleo">Horarios de atención</p>
            <p className="text-sm text-petroleo/60">{config?.horarios_atencion}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
