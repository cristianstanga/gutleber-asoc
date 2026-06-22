import { Menu, MessageSquare, CalendarCheck } from 'lucide-react'
import { NavLink } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../store/auth'

export default function MobileHeader({ onMenuClick }: { onMenuClick: () => void }) {
  const rol = useAuthStore((s) => s.usuario?.rol)
  const isStaff = rol === 'ADMIN' || rol === 'OPERADOR'

  const { data: noLeidos = 0 } = useQuery<number>({
    queryKey: ['conversaciones-no-leidos'],
    queryFn: async () => {
      const r = await api.get('/conversaciones/resumen/noLeidos')
      return r.data.count as number
    },
    refetchInterval: 10_000,
    enabled: isStaff,
  })

  const { data: visitasPendientes = 0 } = useQuery<number>({
    queryKey: ['visitas-pendientes-count'],
    queryFn: async () => {
      const r = await api.get('/visitas', { params: { estado: 'PENDIENTE_CONFIRMACION' } })
      return (r.data as unknown[]).length
    },
    refetchInterval: 15_000,
    enabled: isStaff,
  })

  return (
    <header className="bg-carbon sticky top-0 z-30" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
      <div className="flex items-center px-3 h-12 gap-2">
      <button
        onClick={onMenuClick}
        className="text-arena hover:text-white p-1.5 rounded transition-colors"
      >
        <Menu size={20} />
      </button>

      <img src="/emblema.svg" alt="Gutleber" className="w-6 h-auto" />
      <span className="text-arena text-sm font-semibold flex-1">Gutleber & Asoc.</span>

      {isStaff && (
        <>
          <NavLink to="/inbox" className={({ isActive }) =>
            `relative p-1.5 rounded transition-colors ${isActive ? 'text-white' : 'text-arena hover:text-white'}`
          }>
            <MessageSquare size={18} />
            {noLeidos > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-[14px] h-3.5 flex items-center justify-center font-bold px-0.5">
                {noLeidos > 99 ? '99+' : noLeidos}
              </span>
            )}
          </NavLink>
          <NavLink to="/visitas" className={({ isActive }) =>
            `relative p-1.5 rounded transition-colors ${isActive ? 'text-white' : 'text-arena hover:text-white'}`
          }>
            <CalendarCheck size={18} />
            {visitasPendientes > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[9px] rounded-full min-w-[14px] h-3.5 flex items-center justify-center font-bold px-0.5">
                {visitasPendientes > 99 ? '99+' : visitasPendientes}
              </span>
            )}
          </NavLink>
        </>
      )}
      </div>
    </header>
  )
}
