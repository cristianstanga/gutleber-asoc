import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { UserPlus, Pencil, ShieldCheck, ShieldOff, X, Eye, EyeOff } from 'lucide-react'
import { api } from '../lib/api'

type Rol = 'ADMIN' | 'OPERADOR' | 'PROPIETARIO' | 'INQUILINO'

interface PersonaSimple { id: string; nombre: string; apellido: string }
interface Usuario {
  id: string; nombre: string; email: string; rol: Rol; activo: boolean
  personaId: string | null; persona: PersonaSimple | null
}

const rolLabel: Record<Rol, string> = {
  ADMIN: 'Administrador', OPERADOR: 'Operador', PROPIETARIO: 'Propietario', INQUILINO: 'Inquilino',
}
const rolColor: Record<Rol, string> = {
  ADMIN: 'bg-red-100 text-red-700', OPERADOR: 'bg-blue-100 text-blue-700',
  PROPIETARIO: 'bg-green-100 text-green-700', INQUILINO: 'bg-yellow-100 text-yellow-700',
}

const emptyForm = { nombre: '', email: '', password: '', rol: 'OPERADOR' as Rol, personaId: '', activo: true }

export default function Usuarios() {
  const qc = useQueryClient()
  const [modal, setModal] = useState<'create' | Usuario | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [showPass, setShowPass] = useState(false)

  const { data: usuarios = [] } = useQuery<Usuario[]>({
    queryKey: ['usuarios'],
    queryFn: async () => (await api.get('/usuarios')).data,
  })

  const { data: personas = [] } = useQuery<PersonaSimple[]>({
    queryKey: ['personas-simple'],
    queryFn: async () => {
      const r = await api.get('/personas')
      return r.data.map((p: PersonaSimple & { apellido: string }) => ({
        id: p.id, nombre: p.nombre, apellido: p.apellido,
      }))
    },
  })

  const guardar = useMutation({
    mutationFn: async (data: typeof form & { id?: string }) => {
      if (data.id) {
        const { id, password, ...rest } = data
        const payload = password ? { ...rest, password } : rest
        return (await api.patch(`/usuarios/${id}`, payload)).data
      }
      return (await api.post('/usuarios', data)).data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); cerrar() },
  })

  const toggleActivo = useMutation({
    mutationFn: (u: Usuario) => api.patch(`/usuarios/${u.id}`, { activo: !u.activo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['usuarios'] }),
  })

  function abrir(target: 'create' | Usuario) {
    setModal(target)
    setShowPass(false)
    if (target === 'create') {
      setForm(emptyForm)
    } else {
      setForm({
        nombre: target.nombre, email: target.email, password: '',
        rol: target.rol, personaId: target.personaId ?? '', activo: target.activo,
      })
    }
  }

  function cerrar() { setModal(null) }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      ...form,
      personaId: form.personaId || null,
      ...(modal !== 'create' && { id: (modal as Usuario).id }),
    }
    guardar.mutate(payload as typeof form & { id?: string })
  }

  const necesitaPersona = form.rol === 'PROPIETARIO' || form.rol === 'INQUILINO'

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-carbon text-2xl">Usuarios</h1>
          <p className="text-piedra text-sm mt-0.5">Accesos al sistema · {usuarios.length} usuarios</p>
        </div>
        <button onClick={() => abrir('create')} className="btn-primary flex items-center gap-2">
          <UserPlus size={16} /> Nuevo usuario
        </button>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-crema">
              <th className="text-left p-3 text-piedra font-medium">Nombre</th>
              <th className="text-left p-3 text-piedra font-medium">Email</th>
              <th className="text-left p-3 text-piedra font-medium">Rol</th>
              <th className="text-left p-3 text-piedra font-medium">Persona</th>
              <th className="text-left p-3 text-piedra font-medium">Estado</th>
              <th className="p-3" />
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id} className="border-b border-crema last:border-0 hover:bg-crema/50 transition-colors">
                <td className="p-3 font-medium text-carbon">{u.nombre}</td>
                <td className="p-3 text-piedra">{u.email}</td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rolColor[u.rol]}`}>
                    {rolLabel[u.rol]}
                  </span>
                </td>
                <td className="p-3 text-piedra text-xs">
                  {u.persona ? `${u.persona.nombre} ${u.persona.apellido}` : '—'}
                </td>
                <td className="p-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${u.activo ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => abrir(u)} className="text-piedra hover:text-carbon transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => toggleActivo.mutate(u)}
                      className={`transition-colors ${u.activo ? 'text-piedra hover:text-red-500' : 'text-piedra hover:text-green-600'}`}
                      title={u.activo ? 'Desactivar' : 'Activar'}
                    >
                      {u.activo ? <ShieldOff size={14} /> : <ShieldCheck size={14} />}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && (
              <tr><td colSpan={6} className="p-6 text-center text-piedra">No hay usuarios</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-crema">
              <h2 className="font-display text-carbon text-lg">
                {modal === 'create' ? 'Nuevo usuario' : 'Editar usuario'}
              </h2>
              <button onClick={cerrar}><X size={18} className="text-piedra hover:text-carbon" /></button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="form-label">Nombre completo</label>
                  <input className="form-input" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                </div>
                <div className="col-span-2 relative">
                  <label className="form-label">
                    {modal === 'create' ? 'Contraseña' : 'Nueva contraseña (dejar vacío para no cambiar)'}
                  </label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    className="form-input pr-10"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required={modal === 'create'}
                    placeholder={modal === 'create' ? '' : 'Sin cambios'}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-[30px] text-piedra hover:text-carbon">
                    {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <div>
                  <label className="form-label">Rol</label>
                  <select className="form-input" value={form.rol} onChange={(e) => setForm({ ...form, rol: e.target.value as Rol, personaId: '' })}>
                    <option value="ADMIN">Administrador</option>
                    <option value="OPERADOR">Operador</option>
                    <option value="PROPIETARIO">Propietario</option>
                    <option value="INQUILINO">Inquilino</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={form.activo ? 'true' : 'false'} onChange={(e) => setForm({ ...form, activo: e.target.value === 'true' })}>
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
                {necesitaPersona && (
                  <div className="col-span-2">
                    <label className="form-label">
                      Persona vinculada <span className="text-red-500">*</span>
                    </label>
                    <select className="form-input" value={form.personaId} onChange={(e) => setForm({ ...form, personaId: e.target.value })} required>
                      <option value="">Seleccionar persona...</option>
                      {personas.map((p) => (
                        <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
                      ))}
                    </select>
                    <p className="text-xs text-piedra mt-1">El usuario solo verá los datos de esta persona</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={cerrar} className="btn-secondary">Cancelar</button>
                <button type="submit" disabled={guardar.isPending} className="btn-primary">
                  {guardar.isPending ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
