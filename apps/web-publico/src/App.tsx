import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import Propiedades from './pages/Propiedades'
import PropiedadDetalle from './pages/PropiedadDetalle'
import Nosotros from './pages/Nosotros'
import Servicios from './pages/Servicios'
import Contacto from './pages/Contacto'
import Blog from './pages/Blog'
import BlogPost from './pages/BlogPost'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/propiedades" element={<Propiedades />} />
        <Route path="/propiedades/:id" element={<PropiedadDetalle />} />
        <Route path="/nosotros" element={<Nosotros />} />
        <Route path="/servicios" element={<Servicios />} />
        <Route path="/contacto" element={<Contacto />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
