import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore, RolUsuario } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Propiedades from './pages/Propiedades'
import Personas from './pages/Personas'
import Contratos from './pages/Contratos'
import AjusteIndices from './pages/AjusteIndices'
import Pagos from './pages/Pagos'
import Inbox from './pages/Inbox'
import WhatsAppStatus from './pages/WhatsAppStatus'
import TarjetaBuilder from './pages/TarjetaBuilder'
import ContratoGenerador from './pages/ContratoGenerador'
import Usuarios from './pages/Usuarios'
import ConfigAgente from './pages/ConfigAgente'
import Visitas from './pages/Visitas'
import Pipeline from './pages/Pipeline'
import MisPropiedades from './pages/MisPropiedades'
import MiContrato from './pages/MiContrato'

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: RolUsuario[] }) {
  const { token, usuario } = useAuthStore()
  if (!token) return <Navigate to="/login" replace />
  if (roles && usuario && !roles.includes(usuario.rol)) return <Navigate to="/" replace />
  return <>{children}</>
}

function RolRedirect() {
  const rol = useAuthStore((s) => s.usuario?.rol)
  if (rol === 'PROPIETARIO') return <Navigate to="/mis-propiedades" replace />
  if (rol === 'INQUILINO') return <Navigate to="/mi-contrato" replace />
  return <Navigate to="/dashboard" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RolRedirect />} />

          {/* Admin + Operador */}
          <Route path="dashboard"    element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Dashboard /></ProtectedRoute>} />
          <Route path="propiedades"  element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Propiedades /></ProtectedRoute>} />
          <Route path="personas"     element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Personas /></ProtectedRoute>} />
          <Route path="contratos"    element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Contratos /></ProtectedRoute>} />
          <Route path="pagos"        element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Pagos /></ProtectedRoute>} />
          <Route path="indices"      element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><AjusteIndices /></ProtectedRoute>} />
          <Route path="inbox"        element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Inbox /></ProtectedRoute>} />
          <Route path="whatsapp"     element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><WhatsAppStatus /></ProtectedRoute>} />
          <Route path="tarjetas"     element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><TarjetaBuilder /></ProtectedRoute>} />
          <Route path="contrato-gen" element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><ContratoGenerador /></ProtectedRoute>} />
          <Route path="config-agente" element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><ConfigAgente /></ProtectedRoute>} />
          <Route path="visitas"   element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Visitas /></ProtectedRoute>} />
          <Route path="pipeline"  element={<ProtectedRoute roles={['ADMIN','OPERADOR']}><Pipeline /></ProtectedRoute>} />

          {/* Solo Admin */}
          <Route path="usuarios" element={<ProtectedRoute roles={['ADMIN']}><Usuarios /></ProtectedRoute>} />

          {/* Propietario */}
          <Route path="mis-propiedades" element={<ProtectedRoute roles={['PROPIETARIO']}><MisPropiedades /></ProtectedRoute>} />

          {/* Inquilino */}
          <Route path="mi-contrato" element={<ProtectedRoute roles={['INQUILINO']}><MiContrato /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
