import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { List, Map as MapIcon } from 'lucide-react'
import { getPropiedades, TIPO_LABEL, FiltrosPropiedades } from '../lib/api'
import PropiedadCard from '../components/PropiedadCard'

export default function Propiedades() {
  const [params, setParams] = useSearchParams()
  const [vista, setVista] = useState<'lista' | 'mapa'>('lista')

  const filtros: FiltrosPropiedades = {
    operacion: (params.get('operacion') as 'venta' | 'alquiler') || undefined,
    tipo: (params.get('tipo') as FiltrosPropiedades['tipo']) || undefined,
    barrio: params.get('barrio') || undefined,
    dormitorios: params.get('dormitorios') ? Number(params.get('dormitorios')) : undefined,
    precioMin: params.get('precioMin') ? Number(params.get('precioMin')) : undefined,
    precioMax: params.get('precioMax') ? Number(params.get('precioMax')) : undefined,
  }

  const { data: propiedades = [], isLoading } = useQuery({
    queryKey: ['propiedades', filtros],
    queryFn: () => getPropiedades(filtros),
  })

  function set(clave: string, valor: string) {
    const next = new URLSearchParams(params)
    if (valor) next.set(clave, valor)
    else next.delete(clave)
    setParams(next)
  }

  const conUbicacion = propiedades.filter((p) => p.lat != null && p.lng != null)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="font-display text-2xl sm:text-3xl text-petroleo">
          Propiedades <span className="text-base text-petroleo/50 font-sans">({propiedades.length} disponibles)</span>
        </h1>
        <div className="flex bg-crema rounded-lg p-1">
          <button
            onClick={() => setVista('lista')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${vista === 'lista' ? 'bg-white shadow-sm' : 'text-petroleo/60'}`}
          >
            <List size={15} /> Lista
          </button>
          <button
            onClick={() => setVista('mapa')}
            className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${vista === 'mapa' ? 'bg-white shadow-sm' : 'text-petroleo/60'}`}
          >
            <MapIcon size={15} /> Mapa
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-8 bg-white border border-crema rounded-xl p-4">
        <select value={filtros.operacion || ''} onChange={(e) => set('operacion', e.target.value)} className="border border-crema rounded-lg px-3 py-2 text-sm">
          <option value="">Comprar o alquilar</option>
          <option value="venta">En venta</option>
          <option value="alquiler">En alquiler</option>
        </select>
        <select value={filtros.tipo || ''} onChange={(e) => set('tipo', e.target.value)} className="border border-crema rounded-lg px-3 py-2 text-sm">
          <option value="">Todos los tipos</option>
          {Object.entries(TIPO_LABEL).map(([valor, label]) => (
            <option key={valor} value={valor}>{label}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Barrio"
          defaultValue={filtros.barrio || ''}
          onBlur={(e) => set('barrio', e.target.value)}
          className="border border-crema rounded-lg px-3 py-2 text-sm w-32"
        />
        <select value={filtros.dormitorios || ''} onChange={(e) => set('dormitorios', e.target.value)} className="border border-crema rounded-lg px-3 py-2 text-sm">
          <option value="">Dormitorios</option>
          {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}+</option>)}
        </select>
        {(filtros.operacion || filtros.tipo || filtros.barrio || filtros.dormitorios) && (
          <button onClick={() => setParams(new URLSearchParams())} className="text-sm text-acero hover:underline">
            Limpiar filtros
          </button>
        )}
      </div>

      {isLoading && <p className="text-petroleo/60">Cargando propiedades…</p>}

      {!isLoading && propiedades.length === 0 && (
        <p className="text-petroleo/60">No encontramos propiedades con esos filtros. Probá ajustar la búsqueda.</p>
      )}

      {vista === 'lista' ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {propiedades.map((p) => <PropiedadCard key={p.id} p={p} />)}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden border border-crema h-[32rem]">
          {conUbicacion.length > 0 ? (
            <MapContainer center={[conUbicacion[0].lat!, conUbicacion[0].lng!]} zoom={12} style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {conUbicacion.map((p) => (
                <Marker key={p.id} position={[p.lat!, p.lng!]}>
                  <Popup>
                    <a href={`/propiedades/${p.id}`} className="font-semibold">{p.direccion}</a>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-petroleo/50 text-sm">
              Ninguna propiedad de esta búsqueda tiene ubicación cargada.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
