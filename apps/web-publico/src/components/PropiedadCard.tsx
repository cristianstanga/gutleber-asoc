import { Link } from 'react-router-dom'
import { BedDouble, Bath, Ruler, Star, View } from 'lucide-react'
import { Propiedad, TIPO_LABEL, precioPropiedad } from '../lib/api'

export default function PropiedadCard({ p }: { p: Propiedad }) {
  const foto = p.imagenes[0]?.url

  return (
    <Link
      to={`/propiedades/${p.id}`}
      className="group bg-white rounded-xl overflow-hidden border border-crema shadow-sm hover:shadow-md transition-shadow flex flex-col"
    >
      <div className="relative aspect-[4/3] bg-crema overflow-hidden">
        {foto ? (
          <img src={foto} alt={p.direccion} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-acero text-sm">Sin foto</div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {p.enVenta && <span className="bg-petroleo text-white text-xs font-semibold px-2 py-0.5 rounded-full">Venta</span>}
          {p.enAlquiler && <span className="bg-acero text-petroleo text-xs font-semibold px-2 py-0.5 rounded-full">Alquiler</span>}
          {p.destacada && (
            <span className="bg-amber-400 text-petroleo text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
              <Star size={11} fill="currentColor" /> Destacada
            </span>
          )}
        </div>
        {p.tours360.length > 0 && (
          <span className="absolute bottom-2 right-2 bg-black/60 text-white text-xs font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
            <View size={12} /> Tour 360°
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col gap-1.5 flex-1">
        <span className="text-xs text-acero font-semibold uppercase tracking-wide">{TIPO_LABEL[p.tipo]}</span>
        <h3 className="font-display text-base text-petroleo leading-snug line-clamp-2">{p.direccion}</h3>
        {p.barrio && <p className="text-xs text-petroleo/60">{p.barrio}</p>}

        <div className="flex items-center gap-3 text-sm text-petroleo/70 mt-1">
          {!!p.dormitorios && <span className="flex items-center gap-1"><BedDouble size={14} /> {p.dormitorios}</span>}
          {!!p.banos && <span className="flex items-center gap-1"><Bath size={14} /> {p.banos}</span>}
          {!!p.superficie && <span className="flex items-center gap-1"><Ruler size={14} /> {p.superficie} m²</span>}
        </div>

        <p className="mt-auto pt-2 font-semibold text-petroleo">{precioPropiedad(p)}</p>
      </div>
    </Link>
  )
}
