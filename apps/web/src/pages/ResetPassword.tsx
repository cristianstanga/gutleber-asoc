import { useState, FormEvent } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function ResetPassword() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const token = searchParams.get('token') || ''

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (password !== confirm) {
      setError('Las contraseñas no coinciden')
      return
    }
    setLoading(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      navigate('/login?reset=ok')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { error?: string } } })?.response?.data?.error
      setError(msg || 'El enlace expiró o ya fue usado.')
    } finally {
      setLoading(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-carbon flex items-center justify-center p-4">
        <div className="card p-6 max-w-sm w-full text-center">
          <p className="text-red-600 mb-4">Enlace inválido o faltante.</p>
          <Link to="/login" className="btn-primary justify-center">Ir al inicio</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-login.svg" alt="Gutleber & Asoc." className="h-16 w-auto" />
        </div>

        <div className="card p-6">
          <h2 className="font-display text-carbon text-xl mb-2">Nueva contraseña</h2>
          <p className="text-piedra text-sm mb-6">Elegí una contraseña nueva para tu cuenta.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="form-label">Nueva contraseña</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="form-label">Confirmar contraseña</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="form-input"
                placeholder="Repetí la contraseña"
                required
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Guardando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </div>

        <p className="text-arena/50 text-xs text-center mt-6">Posadas, Misiones — Argentina</p>
      </div>
    </div>
  )
}
