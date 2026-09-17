import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-24 text-center">
      <h1 className="font-display text-3xl text-petroleo mb-3">Página no encontrada</h1>
      <p className="text-petroleo/60 mb-6">La página que buscás no existe o fue movida.</p>
      <Link to="/" className="text-acero hover:underline">Volver al inicio →</Link>
    </div>
  )
}
