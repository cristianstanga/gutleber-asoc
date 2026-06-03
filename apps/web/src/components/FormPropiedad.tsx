import { Component, useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import { X, ChevronRight, ChevronLeft, Upload, Trash2, Sparkles, MapPin, Check, Loader2, Video, Key, ExternalLink } from 'lucide-react'

const MapPickerLeaflet = lazy(() => import('./MapPickerLeaflet'))

// ── Error boundary to prevent map crashes from unmounting the wizard ──────────
class MapBoundary extends Component<{ children: ReactNode }, { err: string | null }> {
  state = { err: null }
  static getDerivedStateFromError(e: Error) { return { err: e.message } }
  componentDidCatch(e: Error, i: ErrorInfo) { console.error('[MapBoundary]', e, i) }
  render() {
    if (this.state.err) return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1a1a1a] gap-3 p-6">
        <MapPin size={28} className="text-white/20" />
        <p className="text-white/50 text-sm text-center">El mapa no pudo cargar.</p>
        <p className="text-white/30 text-xs text-center">Podés continuar sin ubicación — el barrio lo podés escribir en el campo de texto.</p>
      </div>
    )
    return this.props.children
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface PropForm {
  id?: string
  direccion: string
  tipo: string
  superficie: number | ''
  dormitorios: number | ''
  banos: number | ''
  cochera: boolean
  antiguedad: number | ''
  piso: string
  enAlquiler: boolean
  enVenta: boolean
  administrada: boolean
  alquilerBase: number | ''
  indiceActual: string
  valorVenta: number | ''
  descripcion: string
  notas: string
  lat: number | null
  lng: number | null
  barrio: string
  propietarioId: string
}

interface PersonaSimple { id: string; nombre: string; apellido: string; tipo: string }

interface Imagen { id: string; url: string; orden: number }
interface VideoItem { id: string; url: string; orden: number; titulo?: string }

// Accept both '' (empty string from form) and undefined (from API) for numeric fields
interface PropiedadConMedia {
  id?: string
  direccion?: string
  tipo?: string
  superficie?: number | '' | null
  dormitorios?: number | '' | null
  banos?: number | '' | null
  cochera?: boolean
  antiguedad?: number | '' | null
  piso?: string | null
  enAlquiler?: boolean
  enVenta?: boolean
  administrada?: boolean
  alquilerBase?: number | '' | null
  indiceActual?: string | null
  valorVenta?: number | '' | null
  descripcion?: string | null
  notas?: string | null
  lat?: number | null
  lng?: number | null
  barrio?: string | null
  propietarioId?: string | null
  imagenes?: Imagen[]
  videos?: VideoItem[]
}

interface Props {
  propiedad?: PropiedadConMedia | null
  onClose: () => void
}

function fromProp(p?: PropiedadConMedia | null): PropForm {
  return {
    id: p?.id,
    direccion: p?.direccion ?? '',
    tipo: p?.tipo ?? 'DEPARTAMENTO',
    superficie: p?.superficie != null ? p.superficie : '',
    dormitorios: p?.dormitorios != null ? p.dormitorios : '',
    banos: p?.banos != null ? p.banos : '',
    cochera: p?.cochera ?? false,
    antiguedad: p?.antiguedad != null ? p.antiguedad : '',
    piso: p?.piso ?? '',
    enAlquiler: p?.enAlquiler ?? false,
    enVenta: p?.enVenta ?? false,
    administrada: p?.administrada ?? false,
    alquilerBase: p?.alquilerBase != null ? p.alquilerBase : '',
    indiceActual: p?.indiceActual ?? '',
    valorVenta: p?.valorVenta != null ? p.valorVenta : '',
    descripcion: p?.descripcion ?? '',
    notas: p?.notas ?? '',
    lat: p?.lat ?? null,
    lng: p?.lng ?? null,
    barrio: p?.barrio ?? '',
    propietarioId: p?.propietarioId ?? '',
  }
}


const TIPOS = [
  { v: 'DEPARTAMENTO', l: 'Departamento' }, { v: 'CASA', l: 'Casa' },
  { v: 'LOCAL', l: 'Local' }, { v: 'OFICINA', l: 'Oficina' },
  { v: 'TERRENO', l: 'Terreno' },
]

const INDICES = [
  { v: '', l: 'Sin índice' }, { v: 'ICL', l: 'ICL (BCRA)' },
  { v: 'IPC', l: 'IPC (INDEC)' }, { v: 'UVA', l: 'UVA' },
]

const CARACTS = ['Cochera', 'Pileta', 'Jardín', 'Terraza', 'Balcón', 'Parrilla', 'Seguridad', 'Amueblado', 'Calefacción']
const MAX_FOTOS  = 14
const MAX_VIDEOS = 2

// ── Section label ─────────────────────────────────────────────────────────────
function SL({ children }: { children: React.ReactNode }) {
  return <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">{children}</p>
}

// ── Field wrapper ─────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><SL>{label}</SL>{children}</div>
}

const INPUT = "w-full bg-white/5 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-arena transition-colors"
const SELECT = INPUT + " cursor-pointer"

// ── Main component ────────────────────────────────────────────────────────────
export default function FormPropiedad({ propiedad, onClose }: Props) {
  const qc = useQueryClient()

  const { data: propietarios = [] } = useQuery<PersonaSimple[]>({
    queryKey: ['personas'],
    queryFn: () => api.get('/personas').then(r => r.data),
    select: (data) => data.filter((p) => p.tipo === 'PROPIETARIO'),
  })

  const [form, setForm] = useState<PropForm>(() => fromProp(propiedad))
  const [phase, setPhase] = useState<1 | 2 | 3>(1)
  const [savedId, setSavedId] = useState<string | undefined>(propiedad?.id)
  const [imagenes, setImagenes] = useState<Imagen[]>(propiedad?.imagenes ?? [])
  const [videos,   setVideos]   = useState<VideoItem[]>(propiedad?.videos ?? [])
  const [uploadingImg, setUploadingImg] = useState(false)
  const [uploadingVid, setUploadingVid] = useState(false)
  const [geocoding, setGeocoding] = useState(false)
  const [geocodeQ, setGeocodeQ] = useState('')
  const [geocodeResults, setGeocodeResults] = useState<Array<{ lat: string; lon: string; display_name: string }>>([])
  const [iaLoading, setIaLoading] = useState(false)
  const [iaError, setIaError] = useState('')
  const [iaResult, setIaResult] = useState<{ instagram: string; whatsapp: string; descripcion: string } | null>(null)
  const [caracts, setCaracts] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const imgInputRef = useRef<HTMLInputElement>(null)
  const vidInputRef = useRef<HTMLInputElement>(null)
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => { setForm(fromProp(propiedad)); setSavedId(propiedad?.id); setImagenes(propiedad?.imagenes ?? []); setVideos(propiedad?.videos ?? []) }, [propiedad])

  const set = useCallback(<K extends keyof PropForm>(k: K, v: PropForm[K]) => setForm(f => ({ ...f, [k]: v })), [])

  // ── Geocode (Nominatim) ───────────────────────────────────────────────────
  function triggerGeocode(q: string) {
    setGeocodeQ(q)
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current)
    if (q.length < 4) { setGeocodeResults([]); return }
    geocodeTimer.current = setTimeout(async () => {
      setGeocoding(true)
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q + ' Posadas Misiones Argentina')}&format=json&limit=4&addressdetails=1`)
        const data = await r.json()
        setGeocodeResults(data)
      } catch { /* silently fail */ }
      finally { setGeocoding(false) }
    }, 500)
  }

  function pickLocation(lat: number, lng: number, displayName?: string) {
    set('lat', lat)
    set('lng', lng)
    if (displayName) {
      const parts = displayName.split(',')
      const barrio = parts[1]?.trim() || parts[0]?.trim() || ''
      set('barrio', barrio)
    }
    setGeocodeResults([])
    setGeocodeQ('')
  }

  // ── Save phase 1 ─────────────────────────────────────────────────────────
  async function savePhase1() {
    setSaving(true); setSaveError('')
    const data = {
      ...form,
      superficie: form.superficie !== '' ? Number(form.superficie) : undefined,
      dormitorios: form.dormitorios !== '' ? Number(form.dormitorios) : undefined,
      banos: form.banos !== '' ? Number(form.banos) : undefined,
      antiguedad: form.antiguedad !== '' ? Number(form.antiguedad) : undefined,
      piso: form.piso || undefined,
      alquilerBase: form.alquilerBase !== '' ? Number(form.alquilerBase) : undefined,
      valorVenta: form.valorVenta !== '' ? Number(form.valorVenta) : undefined,
      indiceActual: form.indiceActual || undefined,
      propietarioId: form.propietarioId || undefined,
    }
    try {
      if (savedId) {
        await api.put(`/propiedades/${savedId}`, data)
      } else {
        const r = await api.post('/propiedades', data)
        setSavedId(r.data.id)
      }
      setPhase(2)
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch { setSaveError('Error al guardar. Verificá los datos.') }
    finally { setSaving(false) }
  }

  // ── Save phase 2 (location) ───────────────────────────────────────────────
  async function savePhase2() {
    if (!savedId) { setPhase(3); return }
    setSaving(true)
    try {
      await api.put(`/propiedades/${savedId}`, { lat: form.lat, lng: form.lng, barrio: form.barrio })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      setPhase(3)
    } catch { /* proceed anyway */ }
    finally { setSaving(false) }
  }

  // ── Upload photos ─────────────────────────────────────────────────────────
  async function handleFotos(files: FileList | null) {
    if (!files || !files.length || !savedId) return
    const disponibles = MAX_FOTOS - imagenes.length
    if (disponibles <= 0) return
    const toUpload = Array.from(files).slice(0, disponibles)
    setUploadingImg(true)
    const fd = new FormData()
    toUpload.forEach(f => fd.append('imagenes', f))
    try {
      const r = await api.post(`/propiedades/${savedId}/imagenes`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setImagenes(prev => [...prev, ...(r.data ?? [])])
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch { /* silently fail */ }
    finally { setUploadingImg(false) }
  }

  async function deleteFoto(id: string) {
    if (!savedId) return
    await api.delete(`/propiedades/${savedId}/imagenes/${id}`)
    setImagenes(prev => prev.filter(i => i.id !== id))
    qc.invalidateQueries({ queryKey: ['propiedades'] })
  }

  // ── Upload videos ─────────────────────────────────────────────────────────
  async function handleVideos(files: FileList | null) {
    if (!files || !files.length || !savedId) return
    const disponibles = MAX_VIDEOS - videos.length
    if (disponibles <= 0) return
    const toUpload = Array.from(files).slice(0, disponibles)
    setUploadingVid(true)
    const fd = new FormData()
    toUpload.forEach(f => fd.append('videos', f))
    try {
      const r = await api.post(`/propiedades/${savedId}/videos`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setVideos(prev => [...prev, ...(r.data ?? [])])
      qc.invalidateQueries({ queryKey: ['propiedades'] })
    } catch { /* silently fail */ }
    finally { setUploadingVid(false) }
  }

  async function deleteVideo(id: string) {
    if (!savedId) return
    await api.delete(`/propiedades/${savedId}/videos/${id}`)
    setVideos(prev => prev.filter(v => v.id !== id))
    qc.invalidateQueries({ queryKey: ['propiedades'] })
  }

  // ── Generate AI description ───────────────────────────────────────────────
  async function generateIA() {
    setIaLoading(true); setIaError('')
    try {
      const r = await api.post('/ia/generar-descripcion', {
        tipo: form.tipo, direccion: form.direccion, barrio: form.barrio,
        superficie: form.superficie || undefined,
        dormitorios: form.dormitorios || undefined,
        banos: form.banos || undefined,
        cochera: form.cochera,
        piso: form.piso || undefined,
        antiguedad: form.antiguedad || undefined,
        enAlquiler: form.enAlquiler, enVenta: form.enVenta,
        alquilerBase: form.alquilerBase || undefined,
        valorVenta: form.valorVenta || undefined,
        caracteristicas: Array.from(caracts),
      })
      setIaResult(r.data)
      if (r.data.descripcion) set('descripcion', r.data.descripcion)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al conectar con IA'
      setIaError(msg)
    } finally { setIaLoading(false) }
  }

  // ── Final save & close ────────────────────────────────────────────────────
  async function finalize() {
    setSaving(true)
    try {
      if (savedId) await api.put(`/propiedades/${savedId}`, { descripcion: form.descripcion, notas: form.notas })
      qc.invalidateQueries({ queryKey: ['propiedades'] })
      onClose()
    } catch { setSaveError('Error al guardar.') }
    finally { setSaving(false) }
  }

  const phaseLabels = ['DATOS', 'FOTOS & MAPA', 'DESCRIPCIÓN IA']

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-[#0d0d0d] text-white z-50 flex flex-col">

      {/* ── Topbar ───────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 px-6 py-3 border-b border-white/10 bg-[#0a0a0a] shrink-0">
        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded transition-colors">
          <X size={16} className="text-arena" />
        </button>
        <span className="font-semibold text-sm text-arena">
          {propiedad?.id ? 'Editar propiedad' : 'Nueva propiedad'}
        </span>
        {savedId && <span className="text-white/40 text-xs">ID guardado</span>}
        <div className="ml-auto flex gap-2">
          {phaseLabels.map((label, i) => {
            const n = (i + 1) as 1 | 2 | 3
            return (
              <button
                key={n}
                onClick={() => n < phase || savedId ? setPhase(n) : undefined}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                  phase === n ? 'bg-arena text-carbon'
                  : n < phase ? 'bg-white/15 text-white/80 hover:bg-white/20'
                  : 'bg-white/8 text-white/40 cursor-default'
                }`}
              >
                <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] border ${phase === n ? 'border-carbon' : 'border-current'}`}>
                  {n < phase ? <Check size={9} /> : n}
                </span>
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Body ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════════════════════════ PHASE 1: DATOS ════════════════════════ */}
        {phase === 1 && (
          <>
            {/* Left: form */}
            <div className="w-[420px] shrink-0 overflow-y-auto bg-[#141414] border-r border-white/12 p-5 space-y-5">

              <Field label="Tipo de propiedad">
                <div className="flex flex-wrap gap-1.5">
                  {TIPOS.map(t => (
                    <button key={t.v} onClick={() => set('tipo', t.v)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        form.tipo === t.v ? 'bg-arena text-carbon border-arena' : 'border-white/25 text-white/70 hover:border-arena/60'
                      }`}>{t.l}</button>
                  ))}
                </div>
              </Field>

              <Field label="Dirección">
                <input className={INPUT} value={form.direccion}
                  onChange={e => set('direccion', e.target.value)}
                  placeholder="Av. San Martín 1250, Centro" required />
              </Field>

              <Field label="Propietario">
                <select className={SELECT} value={form.propietarioId}
                  onChange={e => set('propietarioId', e.target.value)}>
                  <option value="">— Sin propietario asignado —</option>
                  {propietarios.map(p => (
                    <option key={p.id} value={p.id}>{p.apellido}, {p.nombre}</option>
                  ))}
                </select>
                {propietarios.length === 0 && (
                  <p className="text-[11px] text-white/40 mt-1">
                    No hay personas con tipo Propietario. Cargalas en la sección Personas.
                  </p>
                )}
              </Field>

              <div className="grid grid-cols-3 gap-3">
                <Field label="Superficie (m²)">
                  <input className={INPUT} type="number" min="0" value={form.superficie}
                    onChange={e => set('superficie', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="85" />
                </Field>
                <Field label="Dormitorios">
                  <input className={INPUT} type="number" min="0" max="20" value={form.dormitorios}
                    onChange={e => set('dormitorios', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="2" />
                </Field>
                <Field label="Baños">
                  <input className={INPUT} type="number" min="0" max="10" value={form.banos}
                    onChange={e => set('banos', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="1" />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Piso / Unidad">
                  <input className={INPUT} value={form.piso}
                    onChange={e => set('piso', e.target.value)} placeholder="3°B, PB..." />
                </Field>
                <Field label="Antigüedad (años)">
                  <input className={INPUT} type="number" min="0" value={form.antiguedad}
                    onChange={e => set('antiguedad', e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="10" />
                </Field>
              </div>

              <Field label="Operación">
                <div className="flex flex-wrap gap-2">
                  {[
                    { k: 'enAlquiler' as const, l: 'Alquiler' },
                    { k: 'enVenta' as const, l: 'Venta' },
                    { k: 'administrada' as const, l: 'Administrada' },
                  ].map(({ k, l }) => (
                    <button key={k} onClick={() => set(k, !form[k])}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                        form[k] ? 'bg-piedra text-white border-piedra' : 'border-white/25 text-white/70 hover:border-arena/60'
                      }`}>{l}</button>
                  ))}
                </div>
              </Field>

              {form.enAlquiler && (
                <div className="rounded-xl bg-white/4 border border-white/10 p-4 space-y-3">
                  <SL>Alquiler</SL>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] text-white/50 mb-1">Base (ARS)</p>
                      <input className={INPUT} type="number" min="0" value={form.alquilerBase}
                        onChange={e => set('alquilerBase', e.target.value === '' ? '' : Number(e.target.value))}
                        placeholder="420000" />
                    </div>
                    <div>
                      <p className="text-[11px] text-white/50 mb-1">Índice de ajuste</p>
                      <select className={SELECT} value={form.indiceActual}
                        onChange={e => set('indiceActual', e.target.value)}>
                        {INDICES.map(i => <option key={i.v} value={i.v}>{i.l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {form.enVenta && (
                <div className="rounded-xl bg-white/4 border border-white/10 p-4">
                  <SL>Precio de venta</SL>
                  <div className="flex gap-2 items-center">
                    <span className="text-arena text-sm font-bold shrink-0">USD</span>
                    <input className={INPUT} type="number" min="0" value={form.valorVenta}
                      onChange={e => set('valorVenta', e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="65000" />
                  </div>
                </div>
              )}

              <Field label="Notas internas">
                <textarea className={INPUT + " resize-none"} rows={2} value={form.notas}
                  onChange={e => set('notas', e.target.value)}
                  placeholder="Solo visible en el sistema..." />
              </Field>

              {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

              <div className="flex justify-between pt-2 border-t border-white/10">
                <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-white/60 hover:text-white transition-colors">
                  Cancelar
                </button>
                <button onClick={savePhase1} disabled={!form.direccion || saving}
                  className="flex items-center gap-2 px-5 py-2 bg-arena hover:bg-[#d4c0aa] text-carbon font-bold text-sm rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Right: property summary preview */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-[#111]">
              <div className="w-full max-w-sm bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-arena">Vista previa</span>
                </div>
                <div>
                  <span className={`inline-block text-[11px] font-bold px-2.5 py-1 rounded-full mb-3 ${
                    form.enAlquiler && form.enVenta ? 'bg-piedra text-white'
                    : form.enAlquiler ? 'bg-piedra/80 text-white'
                    : form.enVenta ? 'bg-arena text-carbon'
                    : 'bg-white/10 text-white/50'
                  }`}>
                    {form.enAlquiler && form.enVenta ? 'ALQUILER · VENTA' : form.enAlquiler ? 'EN ALQUILER' : form.enVenta ? 'EN VENTA' : 'Sin operación'}
                  </span>
                  <p className="text-xs text-arena font-semibold uppercase tracking-wider">
                    {TIPOS.find(t => t.v === form.tipo)?.l ?? '—'}
                  </p>
                  <p className="text-xl font-display text-white mt-1 leading-tight">
                    {form.direccion || <span className="text-white/30">Dirección...</span>}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm text-white/70">
                  {form.superficie ? <span>{form.superficie} m²</span> : null}
                  {form.dormitorios ? <span>{form.dormitorios} dorm.</span> : null}
                  {form.banos ? <span>{form.banos} baños</span> : null}
                  {form.piso ? <span>Piso {form.piso}</span> : null}
                </div>
                {(form.enAlquiler && form.alquilerBase) ? (
                  <p className="text-2xl font-display text-white">
                    ${Number(form.alquilerBase).toLocaleString('es-AR')}
                    <span className="text-sm text-arena/70 ml-1">/ mes</span>
                  </p>
                ) : (form.enVenta && form.valorVenta) ? (
                  <p className="text-2xl font-display text-white">
                    USD {Number(form.valorVenta).toLocaleString('es-AR')}
                  </p>
                ) : null}
                <div className="pt-3 border-t border-white/8">
                  <p className="text-[10px] text-white/30 text-center">Completá los datos y hacé clic en Siguiente para guardar</p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ══════════════════════ PHASE 2: FOTOS & MAPA ═══════════════════ */}
        {phase === 2 && (
          <>
            {/* Left: photos + videos + location */}
            <div className="w-[400px] shrink-0 overflow-y-auto bg-[#141414] border-r border-white/12 p-5 space-y-5">

              {/* ── FOTOS ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SL>Fotos</SL>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    imagenes.length >= MAX_FOTOS ? 'bg-red-900/50 text-red-400' : 'bg-white/8 text-white/50'
                  }`}>{imagenes.length} / {MAX_FOTOS}</span>
                </div>
                {imagenes.length > 0 && (
                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {imagenes.map((img, idx) => (
                      <div key={img.id} className="relative group aspect-square">
                        <img src={img.url.replace(/^https?:\/\/localhost:\d+/, '')} alt=""
                          className={`w-full h-full object-cover rounded-lg border-2 ${idx === 0 ? 'border-arena' : 'border-transparent'}`} />
                        <button onClick={() => deleteFoto(img.id)}
                          className="absolute top-0.5 right-0.5 bg-red-600 rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={8} />
                        </button>
                        {idx === 0 && (
                          <span className="absolute bottom-0.5 left-0.5 bg-carbon/80 text-white text-[7px] px-1 py-0.5 rounded">★</span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                {imagenes.length < MAX_FOTOS ? (
                  <>
                    <div onClick={() => imgInputRef.current?.click()} onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleFotos(e.dataTransfer.files) }}
                      className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-arena/50 transition-colors">
                      {uploadingImg ? (
                        <div className="flex items-center justify-center gap-2 text-arena text-sm">
                          <Loader2 size={14} className="animate-spin" /> Subiendo fotos...
                        </div>
                      ) : (
                        <>
                          <Upload size={18} className="text-white/40 mx-auto mb-1" />
                          <p className="text-sm text-white/70">Arrastrá fotos o hacé clic</p>
                          <p className="text-xs text-white/40 mt-0.5">JPG · PNG · WEBP · máx. {MAX_FOTOS - imagenes.length} más</p>
                        </>
                      )}
                    </div>
                    <input ref={imgInputRef} type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden"
                      onChange={e => handleFotos(e.target.files)} />
                  </>
                ) : (
                  <p className="text-xs text-red-400 text-center py-2">Límite de {MAX_FOTOS} fotos alcanzado</p>
                )}
              </div>

              <div className="h-px bg-white/10" />

              {/* ── VIDEOS ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <SL>Videos</SL>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    videos.length >= MAX_VIDEOS ? 'bg-red-900/50 text-red-400' : 'bg-white/8 text-white/50'
                  }`}>{videos.length} / {MAX_VIDEOS}</span>
                </div>
                {videos.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {videos.map((vid, idx) => (
                      <div key={vid.id} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 group">
                        <Video size={14} className="text-arena shrink-0" />
                        <span className="flex-1 text-xs text-white/70 truncate">{vid.titulo || `Video ${idx + 1}`}</span>
                        <button onClick={() => deleteVideo(vid.id)}
                          className="text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {videos.length < MAX_VIDEOS ? (
                  <>
                    <div onClick={() => vidInputRef.current?.click()} onDragOver={e => e.preventDefault()}
                      onDrop={e => { e.preventDefault(); handleVideos(e.dataTransfer.files) }}
                      className="border-2 border-dashed border-white/20 rounded-xl p-4 text-center cursor-pointer hover:border-piedra/50 transition-colors">
                      {uploadingVid ? (
                        <div className="flex items-center justify-center gap-2 text-arena text-sm">
                          <Loader2 size={14} className="animate-spin" /> Subiendo video... (puede tardar)
                        </div>
                      ) : (
                        <>
                          <Video size={18} className="text-white/40 mx-auto mb-1" />
                          <p className="text-sm text-white/70">Arrastrá un video o hacé clic</p>
                          <p className="text-xs text-white/40 mt-0.5">MP4 · MOV · WEBM · máx. {MAX_VIDEOS - videos.length} más</p>
                        </>
                      )}
                    </div>
                    <input ref={vidInputRef} type="file" accept="video/mp4,video/quicktime,video/webm" className="hidden"
                      onChange={e => handleVideos(e.target.files)} />
                  </>
                ) : (
                  <p className="text-xs text-red-400 text-center py-2">Límite de {MAX_VIDEOS} videos alcanzado</p>
                )}
              </div>

              <div className="h-px bg-white/10" />

              <Field label="Barrio / Zona">
                <div className="relative">
                  <input className={INPUT} value={geocodeQ || form.barrio}
                    onChange={e => { set('barrio', e.target.value); triggerGeocode(e.target.value) }}
                    placeholder="Ej: Centro, Villa Urquiza, Itaembé..." />
                  {geocoding && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-arena animate-spin" />}
                </div>
                {geocodeResults.length > 0 && (
                  <div className="mt-1 bg-[#1a1a1a] border border-white/15 rounded-lg overflow-hidden">
                    {geocodeResults.map((r, i) => (
                      <button key={i} onClick={() => pickLocation(+r.lat, +r.lon, r.display_name)}
                        className="w-full text-left px-3 py-2 text-xs text-white/70 hover:bg-white/8 border-b border-white/8 last:border-0 truncate">
                        <MapPin size={10} className="inline mr-1 text-arena" />
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </Field>

              {form.lat && form.lng && (
                <div className="rounded-lg bg-white/5 px-3 py-2 flex items-center gap-2">
                  <MapPin size={12} className="text-arena shrink-0" />
                  <span className="text-xs text-white/60">
                    {form.lat.toFixed(5)}, {form.lng.toFixed(5)}
                  </span>
                </div>
              )}

              <div className="flex justify-between pt-2 border-t border-white/10">
                <button onClick={() => setPhase(1)} className="flex items-center gap-1 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
                  <ChevronLeft size={15} /> Atrás
                </button>
                <button onClick={savePhase2} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-arena hover:bg-[#d4c0aa] text-carbon font-bold text-sm rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : null}
                  Siguiente <ChevronRight size={15} />
                </button>
              </div>
            </div>

            {/* Right: Leaflet map — absolute inset-0 inside relative container gives Leaflet real dimensions */}
            <div className="flex-1 relative" style={{ minHeight: 0 }}>
              <MapBoundary>
                <Suspense fallback={
                  <div className="absolute inset-0 flex items-center justify-center bg-[#1a1a1a]">
                    <div className="text-center space-y-2">
                      <Loader2 size={24} className="text-arena animate-spin mx-auto" />
                      <p className="text-white/40 text-sm">Cargando mapa...</p>
                    </div>
                  </div>
                }>
                  <MapPickerLeaflet lat={form.lat} lng={form.lng} onMove={pickLocation} />
                </Suspense>
              </MapBoundary>
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-[#111]/90 border border-white/15 rounded-full px-4 py-1.5 text-xs text-white/70 pointer-events-none">
                Hacé clic en el mapa para marcar la ubicación exacta
              </div>
            </div>
          </>
        )}

        {/* ════════════════════ PHASE 3: DESCRIPCIÓN IA ════════════════════ */}
        {phase === 3 && (
          <>
            {/* Left: IA controls + editable text */}
            <div className="w-[420px] shrink-0 overflow-y-auto bg-[#141414] border-r border-white/12 p-5 space-y-5">

              <div className="rounded-xl bg-white/4 border border-white/10 p-4 space-y-3">
                <SL>Características destacadas</SL>
                <div className="flex flex-wrap gap-1.5">
                  {CARACTS.map(c => (
                    <button key={c} onClick={() => setCaracts(prev => { const s = new Set(prev); s.has(c) ? s.delete(c) : s.add(c); return s })}
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                        caracts.has(c) ? 'bg-piedra text-white border-piedra' : 'border-white/25 text-white/70 hover:border-arena/60'
                      }`}>{c}</button>
                  ))}
                </div>
                <button onClick={generateIA} disabled={iaLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 bg-gradient-to-r from-piedra to-arena text-carbon font-bold text-sm rounded-xl hover:opacity-90 transition-opacity disabled:opacity-60">
                  {iaLoading ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  {iaLoading ? 'Generando...' : 'Generar con IA'}
                </button>
                {iaError && (
                  <div className="rounded-lg bg-red-950/40 border border-red-800/40 px-3 py-2">
                    <p className="text-red-400 text-xs leading-relaxed">{iaError}</p>
                    {iaError.includes('ANTHROPIC_API_KEY') && (
                      <p className="text-red-400/70 text-[10px] mt-1">→ Seguí los pasos de la guía a la derecha para configurarla.</p>
                    )}
                  </div>
                )}
              </div>

              <Field label="Descripción pública">
                <textarea className={INPUT + " resize-none"} rows={5} value={form.descripcion}
                  onChange={e => set('descripcion', e.target.value)}
                  placeholder="Se usa al publicar en redes sociales y en el bot de WhatsApp..." />
              </Field>

              <Field label="Notas internas">
                <textarea className={INPUT + " resize-none"} rows={2} value={form.notas}
                  onChange={e => set('notas', e.target.value)}
                  placeholder="Solo visible en el sistema..." />
              </Field>

              {saveError && <p className="text-red-400 text-xs">{saveError}</p>}

              <div className="flex justify-between pt-2 border-t border-white/10">
                <button onClick={() => setPhase(2)} className="flex items-center gap-1 px-4 py-2 text-sm text-white/60 hover:text-white transition-colors">
                  <ChevronLeft size={15} /> Atrás
                </button>
                <button onClick={finalize} disabled={saving}
                  className="flex items-center gap-2 px-5 py-2 bg-arena hover:bg-[#d4c0aa] text-carbon font-bold text-sm rounded-xl transition-colors disabled:opacity-50">
                  {saving ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                  Guardar y finalizar
                </button>
              </div>
            </div>

            {/* Right: AI result or idle state */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 gap-4 bg-[#111] overflow-y-auto">
              {!iaResult ? (
                <div className="w-full max-w-md space-y-5">
                  <div className="text-center">
                    <Sparkles size={36} className="text-arena/50 mx-auto mb-3" />
                    <p className="text-white/70 text-sm font-semibold">Generación de textos con IA</p>
                    <p className="text-white/40 text-xs mt-1">Elegí características y presioná "Generar con IA"</p>
                  </div>
                  {/* API key setup guide — only when no error (error means key is set, just failed) */}
                  {!iaError && <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center gap-2">
                      <Key size={14} className="text-arena" />
                      <p className="text-[11px] font-bold uppercase tracking-widest text-arena">Configurar API Key</p>
                    </div>
                    <p className="text-xs text-white/60 leading-relaxed">
                      Para usar la IA necesitás una API key de Anthropic. Es gratis empezar con $5 de crédito.
                    </p>
                    <ol className="space-y-2">
                      {[
                        { n: '1', text: 'Entrá a console.anthropic.com', link: 'https://console.anthropic.com' },
                        { n: '2', text: 'Creá una cuenta (o iniciá sesión)' },
                        { n: '3', text: 'Andá a API Keys → Create Key' },
                        { n: '4', text: 'Copiá la clave (empieza con sk-ant-...)' },
                        { n: '5', text: 'Abrí el archivo apps/api/.env y pegala en ANTHROPIC_API_KEY=TU_CLAVE' },
                        { n: '6', text: 'Reiniciá el servidor API' },
                      ].map(({ n, text, link }) => (
                        <li key={n} className="flex items-start gap-2.5 text-xs text-white/60">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-arena/20 text-arena font-bold flex items-center justify-center text-[10px]">{n}</span>
                          {link ? (
                            <a href={link} target="_blank" rel="noreferrer" className="text-arena hover:text-white transition-colors flex items-center gap-1">
                              {text} <ExternalLink size={10} />
                            </a>
                          ) : (
                            <span>{text}</span>
                          )}
                        </li>
                      ))}
                    </ol>
                    <div className="mt-2 bg-black/30 rounded-lg px-3 py-2 font-mono text-[10px] text-arena/80 select-all">
                      ANTHROPIC_API_KEY=sk-ant-api03-...
                    </div>
                    <p className="text-[10px] text-white/30 mt-1">Sin API key podés igualmente guardar la propiedad con descripción manual.</p>
                  </div>}
                </div>
              ) : (
                <div className="w-full max-w-lg space-y-4">
                  {[
                    { label: 'Instagram', key: 'instagram' as const, icon: '📸', rows: 3 },
                    { label: 'WhatsApp', key: 'whatsapp' as const, icon: '💬', rows: 3 },
                    { label: 'Descripción portal', key: 'descripcion' as const, icon: '🏠', rows: 4 },
                  ].map(({ label, key, icon, rows }) => (
                    <div key={key} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-arena mb-2">{icon} {label}</p>
                      <textarea
                        value={iaResult[key]}
                        onChange={e => setIaResult(prev => prev ? { ...prev, [key]: e.target.value } : null)}
                        className="w-full bg-transparent text-sm text-white/80 resize-none focus:outline-none leading-relaxed"
                        rows={rows}
                      />
                      <button
                        onClick={() => { navigator.clipboard.writeText(iaResult[key]) }}
                        className="mt-2 text-[10px] text-arena/60 hover:text-arena transition-colors"
                      >
                        Copiar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
