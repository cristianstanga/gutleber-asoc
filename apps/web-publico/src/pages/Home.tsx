import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import { Search } from 'lucide-react'
import { getPropiedades, TIPO_LABEL, Propiedad } from '../lib/api'
import PropiedadCard from '../components/PropiedadCard'

export default function Home() {
  const navigate = useNavigate()
  const [operacion, setOperacion] = useState<'venta' | 'alquiler'>('venta')
  const [tipo, setTipo] = useState('')

  const { data: propiedades = [] } = useQuery({
    queryKey: ['propiedades', 'home'],
    queryFn: () => getPropiedades(),
  })

  const enVenta = propiedades.filter((p) => p.enVenta)
  const enAlquiler = propiedades.filter((p) => p.enAlquiler)
  const destacadas = propiedades.filter((p) => p.destacada).slice(0, 6)
  const conUbicacion = propiedades.filter((p) => p.lat != null && p.lng != null)

  const conteoPorTipo = propiedades.reduce<Record<string, number>>((acc, p) => {
    acc[p.tipo] = (acc[p.tipo] || 0) + 1
    return acc
  }, {})

  function buscar() {
    const params = new URLSearchParams()
    params.set('operacion', operacion)
    if (tipo) params.set('tipo', tipo)
    navigate(`/propiedades?${params.toString()}`)
  }

  return (
    <div>
      {/* Hero */}
      <section className="bg-petroleo text-blancoRoto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
          <h1 className="font-display text-3xl sm:text-5xl leading-tight max-w-3xl mx-auto">
            Bienes raíces en Posadas, Misiones
          </h1>
          <p className="mt-4 text-blancoRoto/80 max-w-xl mx-auto">
            Gestión, velocidad y transparencia en cada propiedad.
          </p>

          {/* Buscador */}
          <div className="mt-8 bg-white rounded-xl shadow-lg p-3 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto text-petroleo">
            <div className="flex bg-crema rounded-lg p-1 shrink-0">
              {(['venta', 'alquiler'] as const).map((op) => (
                <button
                  key={op}
                  onClick={() => setOperacion(op)}
                  className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                    operacion === op ? 'bg-petroleo text-white' : 'text-petroleo/70'
                  }`}
                >
                  {op === 'venta' ? 'Comprar' : 'Alquilar'}
                </button>
              ))}
            </div>
            <select
              value={tipo}
              onChange={(e) => setTipo(e.target.value)}
              className="flex-1 border border-crema rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(TIPO_LABEL).map(([valor, label]) => (
                <option key={valor} value={valor}>{label}</option>
              ))}
            </select>
            <button
              onClick={buscar}
              className="bg-acero text-petroleo font-semibold px-5 py-2 rounded-lg flex items-center justify-center gap-2 hover:brightness-105 transition"
            >
              <Search size={16} /> Buscar
            </button>
          </div>

          <div className="mt-4 text-sm text-blancoRoto/70">
            {enVenta.length} propiedades en venta · {enAlquiler.length} en alquiler
          </div>
        </div>
      </section>

      {/* Filtros por tipo */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-wrap gap-3">
          {Object.entries(TIPO_LABEL).map(([valor, label]) => (
            <button
              key={valor}
              onClick={() => navigate(`/propiedades?tipo=${valor}`)}
              className="border border-crema rounded-full px-4 py-2 text-sm hover:border-acero hover:bg-crema/50 transition-colors"
            >
              {label} <span className="text-petroleo/50">({conteoPorTipo[valor] || 0})</span>
            </button>
          ))}
        </div>
      </section>

      {/* Destacadas */}
      {destacadas.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-2xl text-petroleo">Propiedades destacadas</h2>
            <a href="/propiedades" className="text-sm text-acero hover:underline">Ver todas →</a>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {destacadas.map((p: Propiedad) => <PropiedadCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Mapa */}
      {conUbicacion.length > 0 && (
        <section className="max-w-6xl mx-auto px-4 sm:px-6 py-8 pb-16">
          <h2 className="font-display text-2xl text-petroleo mb-5">Dónde están nuestras propiedades</h2>
          <div className="rounded-xl overflow-hidden border border-crema h-96">
            <MapContainer
              center={[conUbicacion[0].lat!, conUbicacion[0].lng!]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {conUbicacion.map((p) => (
                <Marker key={p.id} position={[p.lat!, p.lng!]}>
                  <Popup>
                    <a href={`/propiedades/${p.id}`} className="font-semibold">{p.direccion}</a>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>
        </section>
      )}
    </div>
  )
}
