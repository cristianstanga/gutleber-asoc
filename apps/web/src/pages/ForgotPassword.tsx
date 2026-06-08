import { useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await api.post('/auth/forgot-password', { email })
      setSent(true)
    } catch {
      setError('Ocurrió un error. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-carbon flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-8">
          <img src="/logo-login.svg" alt="Gutleber & Asoc." className="h-16 w-auto" />
        </div>

        <div className="card p-6">
          {sent ? (
            <div className="text-center">
              <div className="text-4xl mb-4">✉️</div>
              <h2 className="font-display text-carbon text-xl mb-3">Revisá tu email</h2>
              <p className="text-piedra text-sm mb-6">
                Si <strong>{email}</strong> tiene una cuenta, vas a recibir
                un enlace para restablecer tu contraseña. Revisá también spam.
              </p>
              <Link to="/login" className="btn-primary w-full justify-center py-2.5">
                Volver al inicio
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-display text-carbon text-xl mb-2">Recuperar contraseña</h2>
              <p className="text-piedra text-sm mb-6">
                Ingresá tu email y te enviamos un enlace para restablecer tu contraseña.
              </p>

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

                {error && (
                  <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
                  {loading ? 'Enviando...' : 'Enviar enlace'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link to="/login" className="text-sm text-piedra hover:text-carbon transition-colors">
                  ← Volver al inicio
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-arena/50 text-xs text-center mt-6">Posadas, Misiones — Argentina</p>
      </div>
    </div>
  )
}
