import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getBlogPost } from '../lib/api'

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>()
  const { data: post, isLoading, isError } = useQuery({
    queryKey: ['blog', slug],
    queryFn: () => getBlogPost(slug!),
    enabled: !!slug,
  })

  if (isLoading) return <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-petroleo/60">Cargando…</div>
  if (isError || !post) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-14 text-center">
        <p className="text-petroleo/60 mb-3">No encontramos este artículo.</p>
        <Link to="/blog" className="text-acero hover:underline">Volver al blog →</Link>
      </div>
    )
  }

  return (
    <article className="max-w-3xl mx-auto px-4 sm:px-6 py-14">
      <Link to="/blog" className="text-xs text-petroleo/50 hover:underline">← Blog</Link>
      <h1 className="font-display text-3xl text-petroleo mt-3 mb-2">{post.titulo}</h1>
      {post.publicadoEn && (
        <p className="text-xs text-petroleo/40 mb-6">
          {new Date(post.publicadoEn).toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
      )}
      {post.imagenPortada && (
        <div className="aspect-video bg-crema rounded-xl overflow-hidden mb-6">
          <img src={post.imagenPortada} alt={post.titulo} className="w-full h-full object-cover" />
        </div>
      )}
      <div className="text-petroleo/80 leading-relaxed whitespace-pre-line">{post.contenido}</div>
    </article>
  )
}
