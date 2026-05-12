import { useQuery } from '@tanstack/react-query'
import { Building2, MapPin, Ruler, Tag } from 'lucide-react'
import { api, formatARS } from '../lib/api'

interface Propiedad {
  id: string
  direccion: string
  tipo: string
  superficie?: number
  enAlquiler: boolean
  enVenta: boolean
  administrada: boolean
  alquilerBase?: number
  alquilerActual?: number
  valorVenta?: number
  indiceActual?: string
  vinculos?: Array<{ persona: { nombre: string; apellido: string }; alquilerActual?: number }>
}

const tipoLabel: Record<string, string> = {
  CASA: 'Casa', DEPARTAMENTO: 'Departamento', LOCAL: 'Local', TERRENO: 'Terreno', OFICINA: 'Oficina',
}

export default function Propiedades() {
  const { data: propiedades = [], isLoading } = useQuery<Propiedad[]>({
    queryKey: ['propiedades'],
    queryFn: () => api.get('/propiedades').then((r) => r.data),
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-2xl text-carbon">Propiedades</h1>
          <p className="text-piedra text-sm mt-1">{propiedades.length} propiedades en cartera</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Building2 size={16} /> Nueva propiedad
        </button>
      </div>

      {isLoading && <p className="text-piedra text-sm animate-pulse">Cargando...</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {propiedades.map((p) => (
          <div key={p.id} className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-crema flex items-center justify-center">
                  <Building2 size={16} className="text-piedra" />
                </div>
                <span className="text-xs text-piedra font-semibold">{tipoLabel[p.tipo] || p.tipo}</span>
              </div>
              <div className="flex gap-1 flex-wrap justify-end">
                {p.enAlquiler && <span className="badge-piedra">Alquiler</span>}
                {p.enVenta && <span className="badge-blue">Venta</span>}
                {p.administrada && <span className="badge-green">Administrada</span>}
              </div>
            </div>

            {/* Dirección */}
            <div className="flex items-start gap-1.5 mb-3">
              <MapPin size={13} className="text-arena mt-0.5 shrink-0" />
              <p className="text-carbon text-sm font-semibold leading-snug">{p.direccion}</p>
            </div>

            {/* Superficie */}
            {p.superficie && (
              <div className="flex items-center gap-1.5 mb-3">
                <Ruler size={13} className="text-arena" />
                <span className="text-xs text-piedra">{p.superficie} m²</span>
              </div>
            )}

            {/* Montos */}
            <div className="border-t border-crema pt-3 mt-3 space-y-1">
              {p.enAlquiler && p.alquilerBase && (
                <div className="flex justify-between text-xs">
                  <span className="text-arena">Alquiler base</span>
                  <span className="text-carbon font-semibold">{formatARS(p.alquilerBase)}</span>
                </div>
              )}
              {p.enAlquiler && p.indiceActual && (
                <div className="flex justify-between text-xs">
                  <span className="text-arena">Índice</span>
                  <span className="badge-gray">{p.indiceActual}</span>
                </div>
              )}
              {p.enVenta && p.valorVenta && (
                <div className="flex justify-between text-xs">
                  <span className="text-arena">Precio venta</span>
                  <span className="text-carbon font-semibold flex items-center gap-1">
                    <Tag size={11} /> USD {p.valorVenta.toLocaleString('es-AR')}
                  </span>
                </div>
              )}
            </div>

            {/* Inquilino activo */}
            {p.vinculos && p.vinculos.length > 0 && (
              <div className="mt-3 pt-2 border-t border-crema">
                {p.vinculos.map((v, i) => (
                  <p key={i} className="text-xs text-piedra">
                    Inquilino: <span className="text-carbon font-semibold">{v.persona.nombre} {v.persona.apellido}</span>
                    {v.alquilerActual && <> — {formatARS(v.alquilerActual)}</>}
                  </p>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
