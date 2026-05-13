import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, CreditCard, TrendingUp, MessageSquare, Smartphone, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

const nav = [
  { to: '/dashboard',    label: 'Dashboard',    Icon: LayoutDashboard },
  { to: '/propiedades',  label: 'Propiedades',  Icon: Building2 },
  { to: '/personas',     label: 'Personas',     Icon: Users },
  { to: '/contratos',    label: 'Contratos',    Icon: FileText },
  { to: '/pagos',        label: 'Pagos',        Icon: CreditCard },
  { to: '/indices',      label: 'Índices',      Icon: TrendingUp },
  { to: '/inbox',        label: 'Inbox',        Icon: MessageSquare, badge: true },
  { to: '/whatsapp',     label: 'WhatsApp',     Icon: Smartphone },
]

export default function Sidebar() {
  const { usuario, logout } = useAuthStore()

  const { data: inboxCount } = useQuery({
    queryKey: ['inbox-count'],
    queryFn: () => api.get('/inbox?leido=false').then(r => r.data.length as number),
    refetchInterval: 30_000,
  })

  return (
    <aside className="w-56 min-h-screen bg-carbon flex flex-col">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/10">
        <p className="font-display text-white text-lg leading-tight">Gutleber</p>
        <p className="font-display text-arena text-lg leading-tight">&amp; Asoc.</p>
        <p className="text-[9px] text-piedra tracking-[0.2em] mt-1">GESTIÓN · INVERSIÓN · PATRIMONIO</p>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? 'bg-piedra text-white'
                  : 'text-arena hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {badge && inboxCount ? (
              <span className="bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold">
                {inboxCount > 9 ? '9+' : inboxCount}
              </span>
            ) : null}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-4 py-4 border-t border-white/10">
        <p className="text-arena text-xs truncate">{usuario?.nombre}</p>
        <p className="text-white/40 text-[10px] truncate">{usuario?.email}</p>
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
