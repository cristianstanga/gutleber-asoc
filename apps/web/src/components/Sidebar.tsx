import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, CreditCard, TrendingUp, MessageSquare, Smartphone, LogOut, Sparkles, FilePlus2, ShieldCheck, Bot, CalendarCheck, X, LucideIcon } from 'lucide-react'
import { useAuthStore } from '../store/auth'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

interface NavItem { to: string; label: string; Icon: LucideIcon; badge?: 'inbox' | 'visitas' }

const navAdmin: NavItem[] = [
  { to: '/dashboard',    label: 'Panel de gestión', Icon: LayoutDashboard },
  { to: '/propiedades',  label: 'Propiedades',  Icon: Building2 },
  { to: '/personas',     label: 'Personas',     Icon: Users },
  { to: '/contratos',    label: 'Contratos',    Icon: FileText },
  { to: '/pagos',        label: 'Pagos',        Icon: CreditCard },
  { to: '/indices',      label: 'Índices',      Icon: TrendingUp },
  { to: '/inbox',        label: 'WhatsApp CRM', Icon: MessageSquare, badge: 'inbox' },
  { to: '/visitas',      label: 'Visitas',      Icon: CalendarCheck, badge: 'visitas' },
  { to: '/config-agente', label: 'Agente IA',   Icon: Bot },
  { to: '/whatsapp',     label: 'WhatsApp',     Icon: Smartphone },
  { to: '/tarjetas',     label: 'Placas',       Icon: Sparkles },
  { to: '/contrato-gen', label: 'Contratos IA', Icon: FilePlus2 },
]

const navAdminExtra: NavItem[] = [
  { to: '/usuarios', label: 'Usuarios', Icon: ShieldCheck },
]

const navPropietario: NavItem[] = [
  { to: '/mis-propiedades', label: 'Mis propiedades', Icon: Building2 },
]

const navInquilino: NavItem[] = [
  { to: '/mi-contrato', label: 'Mi contrato', Icon: FileText },
]

export default function Sidebar({ onClose }: { onClose?: () => void } = {}) {
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

  const { data: visitasPendientes = 0 } = useQuery<number>({
    queryKey: ['visitas-pendientes-count'],
    queryFn: async () => {
      const r = await api.get('/visitas', { params: { estado: 'PENDIENTE_CONFIRMACION' } })
      return (r.data as unknown[]).length
    },
    refetchInterval: 15_000,
    enabled: rol === 'ADMIN' || rol === 'OPERADOR',
  })

  const badgeCount: Record<string, number> = { inbox: noLeidos, visitas: visitasPendientes }

  const items = rol === 'PROPIETARIO' ? navPropietario
    : rol === 'INQUILINO' ? navInquilino
    : navAdmin

  const extraItems = rol === 'ADMIN' ? navAdminExtra : []

  return (
    <aside className="w-64 md:w-56 h-full min-h-screen bg-carbon flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="px-4 py-5 border-b border-white/10 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img src="/emblema.svg" alt="Gutleber & Asoc." className="w-9 h-auto flex-shrink-0" />
          <div>
            <p className="font-display text-crema text-[13px] font-bold tracking-wider leading-tight">GUTLEBER</p>
            <p className="font-display text-crema text-[13px] font-bold tracking-wider leading-tight">&amp; ASOCIADOS</p>
            <p className="text-champagne text-[8px] tracking-[0.18em] mt-0.5 opacity-80">NEGOCIOS INMOBILIARIOS</p>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="text-arena hover:text-white mt-1 p-1 rounded transition-colors md:hidden">
            <X size={16} />
          </button>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {items.map(({ to, label, Icon, badge }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive ? 'bg-piedra text-white' : 'text-arena hover:bg-white/10 hover:text-white'
              }`
            }
          >
            <Icon size={16} />
            <span className="flex-1">{label}</span>
            {badge && badgeCount[badge] > 0 && (
              <span className="bg-red-500 text-white text-[10px] rounded-full min-w-[16px] h-4 flex items-center justify-center font-bold px-1">
                {badgeCount[badge] > 99 ? '99+' : badgeCount[badge]}
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
                onClick={onClose}
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
        <p className="mt-3 text-white/20 text-[9px] font-mono tracking-wide">{__APP_VERSION__}</p>
      </div>
    </aside>
  )
}
