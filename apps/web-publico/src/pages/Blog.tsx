import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBlog } from '../lib/api'

export default function Blog() {
  const { data: posts = [], isLoading } = useQuery({ queryKey: ['blog'], queryFn: getBlog })

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-14">
      <h1 className="font-display text-3xl text-petroleo mb-8">Blog</h1>

      {isLoading && <p className="text-petroleo/60">Cargando…</p>}
      {!isLoading && posts.length === 0 && <p className="text-petroleo/60">Todavía no hay artículos publicados.</p>}

      <div className="grid sm:grid-cols-2 gap-6">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/blog/${post.slug}`}
            className="bg-white border border-crema rounded-xl overflow-hidden hover:shadow-md transition-shadow"
          >
            {post.imagenPortada && (
              <div className="aspect-video bg-crema">
                <img src={post.imagenPortada} alt={post.titulo} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="p-5">
              <h2 className="font-display text-lg text-petroleo mb-1.5">{post.titulo}</h2>
              {post.resumen && <p className="text-sm text-petroleo/70 line-clamp-2">{post.resumen}</p>}
              {post.publicadoEn && (
                <p className="text-xs text-petroleo/40 mt-3">
                  {new Date(post.publicadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
