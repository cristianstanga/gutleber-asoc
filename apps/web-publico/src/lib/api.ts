import axios from 'axios'

export const api = axios.create({ baseURL: '/api/public' })

// ── Tipos ────────────────────────────────────────────────────────────────────

export interface PropiedadImagen { id: string; url: string; orden: number }
export interface PropiedadVideo { id: string; url: string; titulo: string | null; orden: number }
export interface PropiedadTour360 { id: string; url: string; etiqueta: string | null; orden: number }

export interface Propiedad {
  id: string
  direccion: string
  tipo: 'CASA' | 'DEPARTAMENTO' | 'LOCAL' | 'TERRENO' | 'OFICINA'
  superficie: number | null
  dormitorios: number | null
  banos: number | null
  cochera: boolean
  antiguedad: number | null
  piso: string | null
  enAlquiler: boolean
  enVenta: boolean
  alquilerBase: number | null
  valorVenta: number | null
  descripcion: string | null
  destacada: boolean
  amenities: string[]
  lat: number | null
  lng: number | null
  barrio: string | null
  imagenes: PropiedadImagen[]
  videos: PropiedadVideo[]
  tours360: PropiedadTour360[]
}

export interface PropiedadDetalle extends Propiedad {
  similares: Propiedad[]
}

export interface ConfigPublica {
  contacto_telefono: string
  contacto_whatsapp: string
  contacto_email: string
  instagram_usuario: string
  texto_nosotros: string
  texto_servicios: string
  horarios_atencion: string
}

export interface BlogPostResumen {
  id: string
  titulo: string
  slug: string
  resumen: string | null
  imagenPortada: string | null
  publicadoEn: string | null
}

export interface BlogPostCompleto extends BlogPostResumen {
  contenido: string
}

export interface FiltrosPropiedades {
  operacion?: 'venta' | 'alquiler'
  tipo?: Propiedad['tipo']
  barrio?: string
  precioMin?: number
  precioMax?: number
  dormitorios?: number
  destacada?: boolean
}

// ── Llamadas ─────────────────────────────────────────────────────────────────

export async function getPropiedades(filtros: FiltrosPropiedades = {}): Promise<Propiedad[]> {
  const { data } = await api.get('/propiedades', { params: filtros })
  return data
}

export async function getPropiedad(id: string): Promise<PropiedadDetalle> {
  const { data } = await api.get(`/propiedades/${id}`)
  return data
}

export async function getConfig(): Promise<ConfigPublica> {
  const { data } = await api.get('/config')
  return data
}

export async function getBlog(): Promise<BlogPostResumen[]> {
  const { data } = await api.get('/blog')
  return data
}

export async function getBlogPost(slug: string): Promise<BlogPostCompleto> {
  const { data } = await api.get(`/blog/${slug}`)
  return data
}

// ── Formato ──────────────────────────────────────────────────────────────────

export const formatUSD = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n)

export const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

export function precioPropiedad(p: Pick<Propiedad, 'enAlquiler' | 'enVenta' | 'alquilerBase' | 'valorVenta'>): string {
  if (p.enVenta && p.valorVenta) return formatUSD(p.valorVenta)
  if (p.enAlquiler && p.alquilerBase) return `${formatARS(p.alquilerBase)}/mes`
  return 'Consultar precio'
}

export const TIPO_LABEL: Record<Propiedad['tipo'], string> = {
  CASA: 'Casa',
  DEPARTAMENTO: 'Departamento',
  LOCAL: 'Local comercial',
  TERRENO: 'Terreno',
  OFICINA: 'Oficina',
}

export function waLink(numero: string, texto: string): string {
  return `https://wa.me/${numero}?text=${encodeURIComponent(texto)}`
}
