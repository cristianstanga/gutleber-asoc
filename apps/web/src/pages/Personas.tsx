import { useQuery } from '@tanstack/react-query'
import { Users, Phone, Mail, Home } from 'lucide-react'
import { api } from '../lib/api'

interface Persona {
  id: string
  nombre: string
  apellido: string
  dni?: string
  whatsapp?: string
  email?: string
  tipo: string
  vinculos?: Array<{ propiedad: { direccion: string }; tipo: string; activo: boolean }>
}

const tipoBadge: Record<string, string> = {
  PROPIETARIO: 'badge-blue',
  INQUILINO: 'badge-piedra',
  INTERESADO: 'badge-yellow',
  GARANTE: 'badge-gray',
}
const tipoLabel: Record<string, string> = {
  PROPIETARIO: 'Propietario', INQUILINO: 'Inquilino', INTERESADO: 'Interesado', GARANTE: 'Garante',
}

export default function Personas() {
  const { data: personas = [], isLoading } = useQuery<Persona[]>({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then((r) => r.data),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Personas</h1>
          <p className="text-piedra text-sm mt-1">{personas.length} personas registradas</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Users size={16} /> Nueva persona
        </button>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-crema border-b border-arena">
            <tr>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Nombre</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Tipo</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">DNI</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Contacto</th>
              <th className="text-left px-5 py-3 text-xs text-piedra uppercase tracking-wide">Propiedad</th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => (
              <tr key={p.id} className="border-b border-crema last:border-0 hover:bg-crema/40 cursor-pointer">
                <td className="px-5 py-3">
                  <p className="font-semibold text-carbon">{p.apellido}, {p.nombre}</p>
                </td>
                <td className="px-5 py-3">
                  <span className={tipoBadge[p.tipo] || 'badge-gray'}>{tipoLabel[p.tipo] || p.tipo}</span>
                </td>
                <td className="px-5 py-3 text-arena">{p.dni || '—'}</td>
                <td className="px-5 py-3">
                  <div className="space-y-0.5">
                    {p.whatsapp && (
                      <p className="flex items-center gap-1 text-xs text-carbon">
                        <Phone size={11} className="text-arena" /> {p.whatsapp}
                      </p>
                    )}
                    {p.email && (
                      <p className="flex items-center gap-1 text-xs text-carbon">
                        <Mail size={11} className="text-arena" /> {p.email}
                      </p>
                    )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {p.vinculos?.filter(v => v.activo).map((v, i) => (
                    <p key={i} className="flex items-center gap-1 text-xs text-carbon">
                      <Home size={11} className="text-arena" /> {v.propiedad.direccion}
                    </p>
                  )) || <span className="text-arena">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {personas.length === 0 && !isLoading && (
          <div className="py-12 text-center text-piedra text-sm">No hay personas registradas</div>
        )}
      </div>
    </div>
  )
}
