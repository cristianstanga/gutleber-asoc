import { useQuery } from '@tanstack/react-query'
import { Home, Key, FileSearch, Users } from 'lucide-react'
import { getConfig } from '../lib/api'

const SERVICIOS_DEFAULT = [
  { icono: Home, titulo: 'Venta de propiedades', texto: 'Acompañamiento completo en la venta de tu propiedad, desde la tasación hasta la escrituración.' },
  { icono: Key, titulo: 'Alquileres', texto: 'Gestión integral de alquileres: selección de inquilinos, contratos, cobros y liquidación al propietario.' },
  { icono: FileSearch, titulo: 'Tasaciones', texto: 'Valuación profesional de tu propiedad según el mercado actual de Posadas y alrededores.' },
  { icono: Users, titulo: 'Administración', texto: 'Administramos tu propiedad de punta a punta, con reportes claros y transparentes.' },
]

export default function Servicios() {
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig })

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl text-petroleo mb-3">Servicios</h1>

      {config?.texto_servicios ? (
        <p className="text-petroleo/80 leading-relaxed whitespace-pre-line mb-8">{config.texto_servicios}</p>
      ) : (
        <p className="text-petroleo/60 mb-8">Lo que hacemos por vos:</p>
      )}

      <div className="grid sm:grid-cols-2 gap-6">
        {SERVICIOS_DEFAULT.map((s) => (
          <div key={s.titulo} className="bg-white border border-crema rounded-xl p-6">
            <s.icono className="text-acero mb-3" size={28} />
            <h2 className="font-display text-lg text-petroleo mb-1.5">{s.titulo}</h2>
            <p className="text-sm text-petroleo/70 leading-relaxed">{s.texto}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
