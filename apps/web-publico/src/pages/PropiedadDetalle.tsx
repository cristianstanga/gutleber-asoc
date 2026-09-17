import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import { BedDouble, Bath, Ruler, Car, Calendar, MessageCircle, Check } from 'lucide-react'
import { getPropiedad, getConfig, TIPO_LABEL, precioPropiedad, waLink } from '../lib/api'
import Tour360Viewer from '../components/Tour360Viewer'
import PropiedadCard from '../components/PropiedadCard'

export default function PropiedadDetalle() {
  const { id } = useParams<{ id: string }>()
  const [fotoActiva, setFotoActiva] = useState(0)
  const [tab, setTab] = useState<'fotos' | '360'>('fotos')

  const { data: prop, isLoading, isError } = useQuery({
    queryKey: ['propiedad', id],
    queryFn: () => getPropiedad(id!),
    enabled: !!id,
  })
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig })

  if (isLoading) return <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-petroleo/60">Cargando…</div>
  if (isError || !prop) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <p className="text-petroleo/60 mb-3">No encontramos esta propiedad (puede que ya no esté disponible).</p>
        <Link to="/propiedades" className="text-acero hover:underline">Ver todas las propiedades →</Link>
      </div>
    )
  }

  const whatsapp = config?.contacto_whatsapp || '5493765410765'
  const waHref = waLink(whatsapp, `Hola! Vi la propiedad en ${prop.direccion} y quiero más información.`)

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
      <nav className="text-xs text-petroleo/50 mb-4">
        <Link to="/propiedades" className="hover:underline">Propiedades</Link> / {TIPO_LABEL[prop.tipo]}
      </nav>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Columna principal */}
        <div className="lg:col-span-2">
          {prop.tours360.length > 0 && (
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTab('fotos')}
                className={`text-sm px-3 py-1.5 rounded-full border ${tab === 'fotos' ? 'bg-petroleo text-white border-petroleo' : 'border-crema text-petroleo/70'}`}
              >
                Fotos
              </button>
              <button
                onClick={() => setTab('360')}
                className={`text-sm px-3 py-1.5 rounded-full border ${tab === '360' ? 'bg-petroleo text-white border-petroleo' : 'border-crema text-petroleo/70'}`}
              >
                Tour 360°
              </button>
            </div>
          )}

          {tab === 'fotos' ? (
            <div>
              <div className="aspect-[4/3] bg-crema rounded-xl overflow-hidden">
                {prop.imagenes[fotoActiva] ? (
                  <img src={prop.imagenes[fotoActiva].url} alt={prop.direccion} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-acero">Sin fotos cargadas</div>
                )}
              </div>
              {prop.imagenes.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
                  {prop.imagenes.map((img, i) => (
                    <button
                      key={img.id}
                      onClick={() => setFotoActiva(i)}
                      className={`shrink-0 w-20 aspect-[4/3] rounded-lg overflow-hidden border-2 ${i === fotoActiva ? 'border-acero' : 'border-transparent'}`}
                    >
                      <img src={img.url} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <Tour360Viewer tours={prop.tours360} />
          )}

          <div className="mt-8">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              {prop.enVenta && <span className="bg-petroleo text-white text-xs font-semibold px-2 py-0.5 rounded-full">En venta</span>}
              {prop.enAlquiler && <span className="bg-acero text-petroleo text-xs font-semibold px-2 py-0.5 rounded-full">En alquiler</span>}
              <span className="text-xs text-acero font-semibold uppercase tracking-wide">{TIPO_LABEL[prop.tipo]}</span>
            </div>
            <h1 className="font-display text-2xl sm:text-3xl text-petroleo">{prop.direccion}</h1>
            {prop.barrio && <p className="text-petroleo/60 mt-1">{prop.barrio}, Posadas, Misiones</p>}

            <div className="flex flex-wrap gap-5 mt-5 py-4 border-y border-crema text-sm text-petroleo/80">
              {!!prop.dormitorios && <span className="flex items-center gap-1.5"><BedDouble size={17} /> {prop.dormitorios} dormitorios</span>}
              {!!prop.banos && <span className="flex items-center gap-1.5"><Bath size={17} /> {prop.banos} {prop.banos > 1 ? 'baños' : 'baño'}</span>}
              {!!prop.superficie && <span className="flex items-center gap-1.5"><Ruler size={17} /> {prop.superficie} m²</span>}
              {prop.cochera && <span className="flex items-center gap-1.5"><Car size={17} /> Cochera</span>}
              {!!prop.antiguedad && <span className="flex items-center gap-1.5"><Calendar size={17} /> {prop.antiguedad} años</span>}
            </div>

            {prop.descripcion && (
              <div className="mt-5">
                <h2 className="font-display text-lg text-petroleo mb-2">Descripción</h2>
                <p className="text-petroleo/80 whitespace-pre-line leading-relaxed">{prop.descripcion}</p>
              </div>
            )}

            {prop.amenities.length > 0 && (
              <div className="mt-6">
                <h2 className="font-display text-lg text-petroleo mb-2">Comodidades</h2>
                <ul className="grid grid-cols-2 gap-2">
                  {prop.amenities.map((a) => (
                    <li key={a} className="flex items-center gap-2 text-sm text-petroleo/80">
                      <Check size={15} className="text-acero shrink-0" /> {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {prop.lat != null && prop.lng != null && (
              <div className="mt-6">
                <h2 className="font-display text-lg text-petroleo mb-2">Ubicación</h2>
                <div className="rounded-xl overflow-hidden border border-crema h-72">
                  <MapContainer center={[prop.lat, prop.lng]} zoom={15} style={{ height: '100%', width: '100%' }}>
                    <TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[prop.lat, prop.lng]} />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <aside>
          <div className="bg-white border border-crema rounded-xl p-5 sticky top-24">
            <p className="text-2xl font-display text-petroleo">{precioPropiedad(prop)}</p>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 w-full bg-[#25D366] text-white font-semibold rounded-lg py-3 flex items-center justify-center gap-2 hover:brightness-105 transition"
            >
              <MessageCircle size={18} /> Consultar por WhatsApp
            </a>
            <p className="text-xs text-petroleo/50 mt-3 text-center">Gutleber & Co. — Posadas, Misiones</p>
          </div>
        </aside>
      </div>

      {prop.similares.length > 0 && (
        <section className="mt-14">
          <h2 className="font-display text-2xl text-petroleo mb-5">Propiedades similares</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {prop.similares.map((s) => <PropiedadCard key={s.id} p={s} />)}
          </div>
        </section>
      )}
    </div>
  )
}
