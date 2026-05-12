import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Propiedades from './pages/Propiedades'
import Personas from './pages/Personas'
import Pagos from './pages/Pagos'
import Inbox from './pages/Inbox'
import WhatsAppStatus from './pages/WhatsAppStatus'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token)
  return token ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="propiedades" element={<Propiedades />} />
          <Route path="personas" element={<Personas />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="inbox" element={<Inbox />} />
          <Route path="whatsapp" element={<WhatsAppStatus />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
