import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, CreditCard, TrendingUp, MessageSquare, Smartphone, LogOut, Sparkles, FilePlus2, ShieldCheck } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const navAdmin = [
  { to: '/dashboard',    label: 'Panel de gestión', Icon: LayoutDashboard },
  { to: '/propiedades',  label: 'Propiedades',  Icon: Building2 },
  { to: '/personas',     label: 'Personas',     Icon: Users },
  { to: '/contratos',    label: 'Contratos',    Icon: FileText },
  { to: '/pagos',        label: 'Pagos',        Icon: CreditCard },
  { to: '/indices',      label: 'Índices',      Icon: TrendingUp },
  { to: '/inbox',        label: 'WhatsApp CRM', Icon: MessageSquare, badge: true },
  { to: '/whatsapp',     label: 'WhatsApp',     Icon: Smartphone },
  { to: '/tarjetas',     label: 'Tarjetas',     Icon: Sparkles },
  { to: '/contrato-gen', label: 'Contratos IA', Icon: FilePlus2 },
]

const navAdminExtra = [
  { to: '/usuarios', label: 'Usuarios', Icon: ShieldCheck },
]

const navPropietario = [
  { to: '/mis-propiedades', label: 'Mis propiedades', Icon: Building2 },
]

const navInquilino = [
  { to: '/mi-contrato', label: 'Mi contrato', Icon: FileText },
]

export default function Sidebar() {
  const { usuario, logout } = useAuthStore()
  const rol = usuario?.rol

  const { data: noLeidos = 0 } = useQuery<number>({
    queryKey: ['conversaciones-no-leidos'],
    queryFn: async () => {
      const r = await api.get('/conversaciones/resumen/noLeidos')
      return r.data.count as number
    },
    refetchInterval: 10_000,
    enabled: rol === 'ADMIN' || rol === 'OPERADOR',
  })

  const items = rol === 'PROPIETARIO' ? navPropietario
    : rol === 'INQUILINO' ? navInquilino
    : navAdmin

  const extraItems = rol === 'ADMIN' ? navAdminExtra : []

  return (
    <aside className="w-56 min-h-screen bg-carbon flex flex-col">
      <div className="px-5 py-6 border-b border-white/10">
        <p className="font-display text-white text-lg leading-tight">Gutleber</p>
        <p className="font-display text-arena text-lg leading-tight">&amp; Asoc.</p>
        <p className="text-[9px] text-piedra tracking-[0.2em] mt-1">GESTIÓN · INVERSIÓN · PATRIMONIO</p>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive ? 'bg-piedra text-white' : 'text-arena hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {badge && noLeidos > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                {noLeidos > 99 ? '99+' : noLeidos}
              </span>
            )}
          </NavLink>
        ))}

        {extraItems.length > 0 && (
          <>
            <div className="border-t border-white/10 my-2" />
            {extraItems.map(({ to, label, Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                    isActive ? 'bg-piedra text-white' : 'text-arena hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                <Icon size={16} />
                <span className="flex-1">{label}</span>
              </NavLink>
            ))}
          </>
        )}
      </nav>

      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-arena text-xs truncate">{usuario?.nombre}</p>
        <p className="text-white/40 text-[10px] truncate">{usuario?.email}</p>
        {rol && (
          <p className="text-white/30 text-[9px] uppercase tracking-widest mt-0.5">{rol}</p>
        )}
        <button
          onClick={logout}
          className="mt-2 flex items-center gap-2 text-arena text-xs hover:text-white transition-colors"
        >
          <LogOut size={12} /> Salir
        </button>
      </div>
    </aside>
  )
}
