import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function Login() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const resetOk = searchParams.get('reset') === 'ok'

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/login', { email, password })
      setAuth(data.token, data.usuario)
      const rol = data.usuario.rol
      if (rol === 'PROPIETARIO') navigate('/mis-propiedades')
      else if (rol === 'INQUILINO') navigate('/mi-contrato')
      else navigate('/dashboard')
    } catch {
      setError('Credenciales inválidas')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img src="/logo-login.svg" alt="Gutleber & Asoc." className="h-16 w-auto" />
        </div>

        <div className="card p-6">
          <h2 className="font-display text-carbon text-xl mb-6">Acceder al sistema</h2>

          {resetOk && (
            <p className="text-green-700 text-sm bg-green-50 border border-green-200 rounded px-3 py-2 mb-4">
              Contraseña actualizada correctamente. Podés ingresar.
            </p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="cintia@gutleber.com.ar"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <Link to="/forgot-password" className="text-sm text-piedra hover:text-carbon transition-colors">
              Olvidé mi contraseña
            </Link>
          </div>
        </div>

        <p className="text-arena/50 text-xs text-center mt-6">Posadas, Misiones — Argentina</p>
      </div>
    </div>
  )
}
