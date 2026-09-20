import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Menu, X, MessageCircle, Instagram } from 'lucide-react'
import { getConfig, waLink } from '../lib/api'

const NAV = [
  { to: '/propiedades', label: 'Propiedades' },
  { to: '/servicios', label: 'Servicios' },
  { to: '/nosotros', label: 'Nosotros' },
  { to: '/blog', label: 'Blog' },
  { to: '/contacto', label: 'Contacto' },
]

export default function Layout() {
  const [menuAbierto, setMenuAbierto] = useState(false)
  const { data: config } = useQuery({ queryKey: ['config'], queryFn: getConfig })

  const whatsapp = config?.contacto_whatsapp || '5493765410765'
  const waHref = waLink(whatsapp, 'Hola! Quiero más información sobre sus propiedades.')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-petroleo text-blancoRoto sticky top-0 z-40 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center shrink-0">
            <img src="/logo-horizontal.svg" alt="Gutleber & Co." className="h-8 w-auto" />
          </Link>

          <nav className="hidden md:flex items-center gap-6">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `text-sm transition-colors hover:text-acero ${isActive ? 'text-acero font-semibold' : 'text-blancoRoto/90'}`
                }
              >
                {item.label}
              </NavLink>
            ))}
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-acero text-petroleo text-sm font-semibold px-3 py-1.5 rounded-full hover:brightness-110 transition"
            >
              <MessageCircle size={16} /> WhatsApp
            </a>
          </nav>

          <button className="md:hidden" onClick={() => setMenuAbierto((v) => !v)} aria-label="Abrir menú">
            {menuAbierto ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {menuAbierto && (
          <nav className="md:hidden bg-petroleo border-t border-acero/20 px-4 py-3 flex flex-col gap-3">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuAbierto(false)}
                className={({ isActive }) => `text-sm ${isActive ? 'text-acero font-semibold' : 'text-blancoRoto/90'}`}
              >
                {item.label}
              </NavLink>
            ))}
            <a href={waHref} target="_blank" rel="noopener noreferrer" className="text-acero text-sm font-semibold">
              WhatsApp
            </a>
          </nav>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="bg-petroleo text-blancoRoto/80 mt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <img src="/logo-horizontal.svg" alt="Gutleber & Co." className="h-7 w-auto mb-3" />
            <p className="text-sm">Bienes Raíces — Posadas, Misiones.</p>
          </div>
          <div>
            <h3 className="text-blancoRoto font-semibold mb-2 text-sm uppercase tracking-wide">Navegación</h3>
            <ul className="space-y-1.5 text-sm">
              {NAV.map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="hover:text-acero transition-colors">{item.label}</Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-blancoRoto font-semibold mb-2 text-sm uppercase tracking-wide">Contacto</h3>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="hover:text-acero transition-colors flex items-center gap-1.5">
                  <MessageCircle size={14} /> {config?.contacto_telefono || '+54 9 3765 41-0765'}
                </a>
              </li>
              {config?.contacto_email && <li>{config.contacto_email}</li>}
              <li>
                <a
                  href={`https://instagram.com/${config?.instagram_usuario || 'gutleberasociados'}`}
                  target="_blank" rel="noopener noreferrer"
                  className="hover:text-acero transition-colors flex items-center gap-1.5"
                >
                  <Instagram size={14} /> @{config?.instagram_usuario || 'gutleberasociados'}
                </a>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-blancoRoto/10 text-center text-xs py-4">
          © {new Date().getFullYear()} Gutleber & Co. Todos los derechos reservados.
        </div>
      </footer>

      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 z-50 bg-[#25D366] text-white rounded-full p-3.5 shadow-lg hover:scale-105 transition"
        aria-label="Escribinos por WhatsApp"
      >
        <MessageCircle size={26} />
      </a>
    </div>
  )
}
