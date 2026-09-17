import { useQuery } from '@tanstack/react-query'
import { getConfig } from '../lib/api'

export default function Nosotros() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig })

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl text-petroleo mb-6">Nosotros</h1>
      {config?.texto_nosotros ? (
        <p className="text-petroleo/80 leading-relaxed whitespace-pre-line">{config.texto_nosotros}</p>
      ) : (
        <div className="text-petroleo/80 leading-relaxed space-y-4">
          <p>
            Gutleber & Co. es una inmobiliaria en Posadas, Misiones, dedicada a acompañar a propietarios
            e inversores en la compra, venta y alquiler de propiedades.
          </p>
          <p>
            Trabajamos con gestión, velocidad y transparencia: el propietario siempre sabe qué pasa con su propiedad.
          </p>
          <p className="text-sm text-petroleo/50 italic">
            (Este texto es un contenido por defecto — se puede editar desde el panel interno en Configuración.)
          </p>
        </div>
      )}
    </div>
  )
}
