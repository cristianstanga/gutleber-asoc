import { useState, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  CreditCard, Send, CheckCircle, ChevronRight,
  Plus, Minus, Trash2, FileText, X, Building2, User, Calendar,
  Home, Receipt, Wrench, Percent, RotateCcw, FileDown, AlertTriangle
} from 'lucide-react'
import { api, formatARS, formatFecha } from '../lib/api'
import { useAuthStore } from '../store/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Persona {
  id: string
  nombre: string
  apellido: string
  whatsapp?: string
}

interface Vinculo {
  id: string
  tipo: string
  fechaInicio: string
  fechaFin?: string
  alquilerActual?: number
  alquilerInicial?: number
  periodicidad?: number
  honorariosPct?: number
  activo: boolean
  persona: Persona
  propiedad: { id: string; direccion: string }
  pagos?: Pago[]
}

interface Gasto {
  id: string
  descripcion: string
  monto: number
  fecha: string
  estado: string
  vinculoId?: string
  propiedadId?: string
}

interface ConceptoExtra {
  descripcion: string
  monto: number
  esInmobiliaria?: boolean  // queda en el estudio, no va al propietario
}

interface Pago {
  id: string
  concepto: string
  monto: number
  moneda: string
  periodo?: string
  estado: string
  fechaVencimiento: string
  fechaPago?: string
  formaPago?: string
  conceptosExtra?: ConceptoExtra[]
  totalConExtras?: number
  nroRecibo?: number
  comprobanteEnviado: boolean
  pagadoAlPropietario: boolean
  fechaPagoPropietario?: string
  montoPropietario?: number
  honorariosAplicados?: number
  gastosAplicados?: number
  persona?: Persona
  propiedad?: { direccion: string; propietario?: { nombre: string; apellido: string } }
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: 'badge-yellow',
  PAGADO: 'badge-green',
  VENCIDO: 'badge-red',
  MORA: 'badge-red',
  ANULADO: 'badge-gray',
}
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: 'Pendiente', PAGADO: 'Pagado', VENCIDO: 'Vencido',
  MORA: 'En mora', ANULADO: 'Anulado',
}
const FORMAS_PAGO = ['Efectivo', 'Transferencia', 'Cheque', 'Depósito', 'Otro']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function nroFormato(n?: number | null) {
  if (!n) return '—'
  return `0001-${String(n).padStart(8, '0')}`
}

async function descargarPDF(id: string, tipo: 'recibo' | 'liquidacion', fallback: string) {
  const response = await api.get(`/pagos/${id}/${tipo}`, { responseType: 'blob' })
  const cd = response.headers['content-disposition'] as string | undefined
  const match = cd?.match(/filename="?([^";\n]+)"?/)
  const filename = match?.[1] ?? `${tipo}-${fallback}.pdf`
  const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Modal Cobro (confirmar + extras + descuentos) ────────────────────────────

interface ModalCobroProps {
  pago: Pago
  vinculo: Vinculo
  onClose: () => void
  onCobrado: () => void
}

function calcularMora(pago: Pago): { dias: number; monto: number } | null {
  if (pago.estado !== 'MORA') return null
  const venc = new Date(pago.fechaVencimiento)
  const firstDay = new Date(Date.UTC(venc.getUTCFullYear(), venc.getUTCMonth(), 1))
  const dias = Math.floor((Date.now() - firstDay.getTime()) / 86400000) + 1
  return { dias, monto: Math.round(pago.monto * dias / 100) }
}

function ModalCobro({ pago, vinculo, onClose, onCobrado }: ModalCobroProps) {
  const [formaPago, setFormaPago] = useState(pago.formaPago || 'Efectivo')
  const [conceptos, setConceptos] = useState<ConceptoExtra[]>(() => {
    if (pago.conceptosExtra && pago.conceptosExtra.length > 0) return pago.conceptosExtra
    const mora = calcularMora(pago)
    if (mora) return [{ descripcion: `Mora por retraso (${mora.dias} días — ${mora.dias}%)`, monto: mora.monto }]
    return []
  })
  const [toast, setToast] = useState('')

  const total = pago.monto + conceptos.reduce((s, c) => s + (Number(c.monto) || 0), 0)

  const cobrar = useMutation({
    mutationFn: () => api.patch(`/pagos/${pago.id}/marcar-pagado`, {
      formaPago,
      conceptosExtra: conceptos.filter(c => c.descripcion.trim()),
      totalConExtras: total,
    }),
    onSuccess: () => { onCobrado(); onClose() },
    onError: () => { setToast('Error al registrar el cobro'); setTimeout(() => setToast(''), 3000) },
  })

  function addConcepto(tipo: 'cargo' | 'descuento') {
    setConceptos(prev => [...prev, { descripcion: '', monto: tipo === 'descuento' ? -1 : 1, esInmobiliaria: false }])
  }

  function updateConcepto(i: number, key: 'descripcion' | 'monto', val: string) {
    setConceptos(prev => prev.map((c, idx) => {
      if (idx !== i) return c
      if (key === 'monto') {
        const abs = Math.abs(Number(val)) || 0
        const sign = c.monto < 0 ? -1 : 1
        return { ...c, monto: sign * abs }
      }
      return { ...c, [key]: val }
    }))
  }

  function toggleSign(i: number) {
    setConceptos(prev => prev.map((c, idx) => {
      if (idx !== i) return c
      const abs = Math.abs(c.monto) || 1
      return { ...c, monto: c.monto < 0 ? abs : -abs }
    }))
  }

  function toggleInmobiliaria(i: number) {
    setConceptos(prev => prev.map((c, idx) =>
      idx === i ? { ...c, esInmobiliaria: !c.esInmobiliaria } : c
    ))
  }

  return (
    <div className="fixed inset-0 bg-carbon/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena">
          <div>
            <h2 className="font-display text-lg text-carbon">Confirmar cobro</h2>
            <p className="text-xs text-piedra mt-0.5">
              {pago.periodo} · {vinculo.propiedad.direccion}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-crema text-piedra"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {toast && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{toast}</div>}

          {/* Banner mora */}
          {pago.estado === 'MORA' && (() => {
            const mora = calcularMora(pago)!
            return (
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-red-700">
                  <p className="font-semibold">Pago en mora — {mora.dias} días desde el 1° del mes ({mora.dias}%)</p>
                  <p className="text-red-500 mt-0.5">La mora sugerida es {formatARS(mora.monto)}. Podés ajustarla en "Conceptos adicionales".</p>
                </div>
              </div>
            )
          })()}

          {/* Datos base readonly */}
          <div className="bg-crema rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-piedra">Inquilino</span>
              <span className="text-sm font-medium text-carbon">{vinculo.persona.nombre} {vinculo.persona.apellido}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-piedra">Alquiler base</span>
              <span className="font-display text-lg text-carbon">{formatARS(pago.monto)}</span>
            </div>
          </div>

          {/* Conceptos adicionales */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-semibold text-carbon">Conceptos adicionales</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => addConcepto('cargo')}
                  className="text-xs flex items-center gap-1 font-semibold text-green-700 bg-green-100 hover:bg-green-200 px-3 py-1.5 rounded-lg transition-colors">
                  <Plus size={12} /> Cargo
                </button>
                <button type="button" onClick={() => addConcepto('descuento')}
                  className="text-xs flex items-center gap-1 font-semibold text-red-600 bg-red-100 hover:bg-red-200 px-3 py-1.5 rounded-lg transition-colors">
                  <Minus size={12} /> Descuento
                </button>
              </div>
            </div>
            {conceptos.length === 0 && (
              <p className="text-xs text-piedra/60 italic py-1">Sin conceptos extra. Usá los botones para agregar expensas, seguros, descuentos por arreglos, etc.</p>
            )}
            {conceptos.length > 0 && (
              <div className="space-y-2">
                {conceptos.map((c, i) => {
                  const esDescuento = c.monto < 0
                  const esInmo = !!c.esInmobiliaria
                  return (
                    <div key={i} className={`flex gap-2 items-center rounded-xl px-3 py-2 border-l-4 ${esInmo ? 'bg-amber-50 border-amber-400' : esDescuento ? 'bg-red-50 border-red-400' : 'bg-green-50 border-green-400'}`}>
                      <button type="button" onClick={() => toggleSign(i)} title="Cambiar a cargo/descuento"
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 transition-colors ${esDescuento ? 'bg-red-200 text-red-700 hover:bg-red-300' : 'bg-green-200 text-green-700 hover:bg-green-300'}`}>
                        {esDescuento ? '−' : '+'}
                      </button>
                      <input className="form-input flex-1 text-sm py-1.5 bg-white/80"
                        placeholder={esDescuento ? 'Ej: Arreglo tablero (asumido inquilino)' : 'Ej: Expensas junio'}
                        value={c.descripcion}
                        onChange={e => updateConcepto(i, 'descripcion', e.target.value)} />
                      <div className={`flex items-center gap-1 font-semibold text-sm w-32 ${esDescuento ? 'text-red-600' : 'text-green-700'}`}>
                        <span className="flex-shrink-0">{esDescuento ? '−' : '+'}</span>
                        <input type="number" className="form-input flex-1 text-sm py-1.5 bg-white/80 text-right"
                          placeholder="0"
                          value={Math.abs(c.monto) || ''}
                          min={0}
                          onChange={e => updateConcepto(i, 'monto', e.target.value)} />
                      </div>
                      <button type="button" onClick={() => toggleInmobiliaria(i)}
                        title={esInmo ? 'Queda en la inmobiliaria — click para quitar' : 'Marcar como ingreso de la inmobiliaria'}
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${esInmo ? 'bg-amber-400 text-white' : 'bg-white/60 text-piedra border border-arena hover:bg-amber-100 hover:text-amber-600'}`}>
                        <Building2 size={12} />
                      </button>
                      <button onClick={() => setConceptos(prev => prev.filter((_, idx) => idx !== i))}
                        className="text-piedra hover:text-red-500 flex-shrink-0"><Trash2 size={14} /></button>
                    </div>
                  )
                })}
                <p className="text-[10px] text-piedra/70 mt-1">
                  <Building2 size={9} className="inline mr-1" />El ícono de edificio marca conceptos que quedan en la inmobiliaria y no van al propietario.
                </p>
              </div>
            )}
          </div>

          {/* Forma de pago */}
          <div>
            <label className="form-label">Forma de pago</label>
            <select className="form-select" value={formaPago} onChange={e => setFormaPago(e.target.value)}>
              {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Desglose y total — siempre visible, se actualiza en tiempo real */}
          <div className="border border-arena rounded-xl overflow-hidden">
            <div className="bg-crema/50 px-4 py-2.5 border-b border-arena">
              <p className="text-xs font-semibold text-piedra uppercase tracking-wide">Vista previa del recibo</p>
            </div>
            <div className="divide-y divide-crema">
              {/* Alquiler base */}
              <div className="flex justify-between items-center px-4 py-3">
                <span className="text-sm text-carbon">Alquiler base</span>
                <span className="text-sm font-semibold text-carbon">{formatARS(pago.monto)}</span>
              </div>
              {/* Conceptos con color */}
              {conceptos.filter(c => c.descripcion.trim()).map((c, i) => {
                const esDescuento = c.monto < 0
                const esInmo = !!c.esInmobiliaria
                return (
                  <div key={i} className={`flex justify-between items-center px-4 py-3 ${esInmo ? 'bg-amber-50/60' : esDescuento ? 'bg-red-50/60' : 'bg-green-50/60'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${esInmo ? 'bg-amber-200 text-amber-700' : esDescuento ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                        {esInmo ? <Building2 size={9} /> : esDescuento ? '−' : '+'}
                      </span>
                      <span className="text-sm text-carbon">{c.descripcion}</span>
                      {esInmo && <span className="text-[9px] text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full font-semibold">inmob.</span>}
                    </div>
                    <span className={`text-sm font-bold ${esInmo ? 'text-amber-600' : esDescuento ? 'text-red-600' : 'text-green-700'}`}>
                      + {formatARS(Math.abs(c.monto))}
                    </span>
                  </div>
                )
              })}
              {/* Total */}
              <div className="flex justify-between items-center px-4 py-3 bg-carbon">
                <span className="text-sm font-bold text-white">Total cobrado</span>
                <span className="font-display text-xl text-white">{formatARS(total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={() => cobrar.mutate()} disabled={cobrar.isPending}
            className="btn-primary flex items-center gap-2">
            <CheckCircle size={14} />
            {cobrar.isPending ? 'Registrando...' : 'Confirmar cobro'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Nuevo Pago ─────────────────────────────────────────────────────────

interface ModalNuevoPagoProps {
  vinculo: Vinculo
  onClose: () => void
  onCreated: () => void
}

function ModalNuevoPago({ vinculo, onClose, onCreated }: ModalNuevoPagoProps) {
  const hoy = new Date()
  const [periodo, setPeriodo] = useState(
    hoy.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      .replace(/^\w/, c => c.toUpperCase())
  )
  const [fechaVenc, setFechaVenc] = useState(() => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), 10)
    return d.toISOString().slice(0, 10)
  })
  const [monto, setMonto] = useState(vinculo.alquilerActual ?? vinculo.alquilerInicial ?? 0)
  const [formaPago, setFormaPago] = useState('Efectivo')
  const [extras, setExtras] = useState<ConceptoExtra[]>([])
  const [toast, setToast] = useState('')

  const total = monto + extras.reduce((s, e) => s + (Number(e.monto) || 0), 0)

  const crear = useMutation({
    mutationFn: () => api.post('/pagos', {
      vinculoId: vinculo.id,
      propiedadId: vinculo.propiedad.id,
      personaId: vinculo.persona.id,
      tipo: 'ALQUILER',
      concepto: `Alquiler ${periodo}`,
      monto,
      moneda: 'ARS',
      periodo,
      fechaVencimiento: fechaVenc,
      formaPago,
      conceptosExtra: extras,
      totalConExtras: total,
    }),
    onSuccess: () => { onCreated(); onClose() },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error'
      setToast(msg)
      setTimeout(() => setToast(''), 3000)
    },
  })

  function addExtra() {
    setExtras([...extras, { descripcion: '', monto: 0, esInmobiliaria: false }])
  }
  function removeExtra(i: number) {
    setExtras(extras.filter((_, idx) => idx !== i))
  }
  function updateExtra(i: number, key: keyof ConceptoExtra, val: string) {
    setExtras(extras.map((e, idx) => idx === i ? { ...e, [key]: key === 'monto' ? Number(val) : val } : e))
  }
  function toggleExtraInmobiliaria(i: number) {
    setExtras(extras.map((e, idx) => idx === i ? { ...e, esInmobiliaria: !e.esInmobiliaria } : e))
  }

  return (
    <div className="fixed inset-0 bg-carbon/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena">
          <div>
            <h2 className="font-display text-lg text-carbon">Nuevo Pago</h2>
            <p className="text-xs text-piedra mt-0.5">{vinculo.propiedad.direccion} · {vinculo.persona.nombre} {vinculo.persona.apellido}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-crema text-piedra">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {toast && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{toast}</div>}

          {/* Período y vencimiento */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="form-label">Período</label>
              <input
                className="form-input"
                value={periodo}
                onChange={e => setPeriodo(e.target.value)}
                placeholder="Mayo 2026"
              />
            </div>
            <div>
              <label className="form-label">Fecha vencimiento</label>
              <input
                type="date"
                className="form-input"
                value={fechaVenc}
                onChange={e => setFechaVenc(e.target.value)}
              />
            </div>
          </div>

          {/* Monto base */}
          <div>
            <label className="form-label">Alquiler base (ARS)</label>
            <input
              type="number"
              className="form-input"
              value={monto}
              onChange={e => setMonto(Number(e.target.value))}
            />
          </div>

          {/* Conceptos extra */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="form-label mb-0">Otros conceptos</label>
              <button
                type="button"
                onClick={addExtra}
                className="text-xs text-carbon flex items-center gap-1 hover:text-arena transition-colors"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>
            {extras.length > 0 && (
              <div className="space-y-2">
                {extras.map((ex, i) => (
                  <div key={i} className={`flex gap-2 items-center rounded-lg px-2 py-1.5 border-l-2 ${ex.esInmobiliaria ? 'bg-amber-50 border-amber-400' : 'bg-white border-transparent'}`}>
                    <input
                      className="form-input flex-1 text-sm"
                      placeholder="Descripción (ej: Depósito de garantía)"
                      value={ex.descripcion}
                      onChange={e => updateExtra(i, 'descripcion', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input w-28 text-sm"
                      placeholder="Monto"
                      value={ex.monto || ''}
                      onChange={e => updateExtra(i, 'monto', e.target.value)}
                    />
                    <button type="button" onClick={() => toggleExtraInmobiliaria(i)}
                      title={ex.esInmobiliaria ? 'Queda en la inmobiliaria — click para quitar' : 'Marcar como ingreso de la inmobiliaria'}
                      className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${ex.esInmobiliaria ? 'bg-amber-400 text-white' : 'bg-crema text-piedra hover:bg-amber-100 hover:text-amber-600'}`}>
                      <Building2 size={12} />
                    </button>
                    <button onClick={() => removeExtra(i)} className="text-piedra hover:text-red-500 flex-shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] text-piedra/70">
                  <Building2 size={9} className="inline mr-1" />Activá el ícono de edificio en los conceptos que quedan en la inmobiliaria (comisión, firmas, etc.).
                </p>
              </div>
            )}
          </div>

          {/* Forma de pago */}
          <div>
            <label className="form-label">Forma de pago</label>
            <select
              className="form-select"
              value={formaPago}
              onChange={e => setFormaPago(e.target.value)}
            >
              {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* Total */}
          <div className="bg-crema rounded-xl px-4 py-3 flex items-center justify-between">
            <span className="text-sm text-piedra font-medium">Total a cobrar</span>
            <span className="font-display text-xl text-carbon">{formatARS(total)}</span>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={() => crear.mutate()}
            disabled={crear.isPending}
            className="btn-primary flex items-center gap-2"
          >
            <CreditCard size={14} />
            {crear.isPending ? 'Creando...' : 'Crear pago'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Liquidación ────────────────────────────────────────────────────────

interface ModalLiquidacionProps {
  pago: Pago
  vinculo: Vinculo
  onClose: () => void
  onSuccess: () => void
}

function ModalLiquidacion({ pago, vinculo, onClose, onSuccess }: ModalLiquidacionProps) {
  const [honorariosPct, setHonorariosPct] = useState(vinculo.honorariosPct ?? 8)
  const [gastosSeleccionados, setGastosSeleccionados] = useState<string[]>([])
  const [gastosExtra, setGastosExtra] = useState<{ descripcion: string; monto: number }[]>([])
  const [toast, setToast] = useState('')
  const [generando, setGenerando] = useState(false)

  const totalBase = pago.totalConExtras ?? pago.monto
  // Extras que van al propietario (excluye retenciones de la inmobiliaria)
  const extrasAlPropietario = (pago.conceptosExtra ?? [])
    .filter(c => !c.esInmobiliaria)
    .reduce((s, c) => s + c.monto, 0)

  // Gastos pendientes de esta propiedad/vínculo
  const { data: gastosPendientes = [] } = useQuery<Gasto[]>({
    queryKey: ['gastos-pendientes', vinculo.id],
    queryFn: () => api.get('/gastos', {
      params: { vinculoId: vinculo.id, estado: 'PENDIENTE' }
    }).then(r => r.data),
  })

  // Totales en tiempo real
  const montoGastosSeleccionados = gastosPendientes
    .filter(g => gastosSeleccionados.includes(g.id))
    .reduce((s, g) => s + g.monto, 0)
  const montoGastosExtra = gastosExtra.reduce((s, g) => s + (Number(g.monto) || 0), 0)
  const totalGastos = montoGastosSeleccionados + montoGastosExtra
  // Honorarios: sobre el alquiler base completo, independiente de los gastos
  const honorarios = Math.round(pago.monto * honorariosPct / 100)
  const totalPagado = (pago.monto - honorarios) + extrasAlPropietario - totalGastos

  function toggleGasto(id: string) {
    setGastosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  function addGastoExtra() {
    setGastosExtra(prev => [...prev, { descripcion: '', monto: 0 }])
  }

  function updateGastoExtra(i: number, key: 'descripcion' | 'monto', val: string) {
    setGastosExtra(prev => prev.map((g, idx) =>
      idx === i ? { ...g, [key]: key === 'monto' ? Number(val) : val } : g
    ))
  }

  async function generarPDF() {
    setGenerando(true)
    try {
      const response = await api.post(
        `/pagos/${pago.id}/liquidacion`,
        {
          honorariosPct,
          gastosIds: gastosSeleccionados,
          gastosExtra: gastosExtra.filter(g => g.descripcion && g.monto > 0),
        },
        { responseType: 'blob' }
      )
      const cd = response.headers['content-disposition'] as string | undefined
      const match = cd?.match(/filename="?([^";\n]+)"?/)
      const filename = match?.[1] ?? `Liquidacion_${pago.periodo || pago.id}.pdf`
      const url = URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }))
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      onSuccess()
    } catch {
      setToast('Error al generar la liquidación')
      setTimeout(() => setToast(''), 3000)
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-carbon/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena">
          <div>
            <h2 className="font-display text-lg text-carbon">Vista previa — Liquidación</h2>
            <p className="text-xs text-piedra mt-0.5">
              {pago.periodo} · {vinculo.propiedad.direccion}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-crema text-piedra">
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {toast && <div className="text-red-600 text-sm bg-red-50 px-3 py-2 rounded-lg">{toast}</div>}

          {/* Desglose cobro al inquilino — siempre visible */}
          <div>
            <p className="text-xs font-semibold text-piedra uppercase tracking-wide mb-2">Cobrado al inquilino</p>
            <div className="border border-arena rounded-xl overflow-hidden">
              <div className="flex justify-between items-center px-4 py-3 border-b border-crema">
                <span className="text-sm text-carbon">Alquiler base</span>
                <span className="text-sm font-semibold text-carbon">{formatARS(pago.monto)}</span>
              </div>
              {(pago.conceptosExtra || []).map((c, i) => {
                const esDescuento = c.monto < 0
                return (
                  <div key={i} className={`flex justify-between items-center px-4 py-3 border-b border-crema ${esDescuento ? 'bg-red-50/60' : 'bg-green-50/60'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${esDescuento ? 'bg-red-200 text-red-700' : 'bg-green-200 text-green-700'}`}>
                        {esDescuento ? '−' : '+'}
                      </span>
                      <span className="text-sm text-carbon">{c.descripcion}</span>
                    </div>
                    <span className={`text-sm font-bold ${esDescuento ? 'text-red-600' : 'text-green-700'}`}>
                      {esDescuento ? '−' : '+'} {formatARS(Math.abs(c.monto))}
                    </span>
                  </div>
                )
              })}
              <div className="flex justify-between items-center px-4 py-3 bg-crema">
                <span className="text-sm font-bold text-carbon">Total cobrado al inquilino</span>
                <span className="font-display text-base text-carbon">{formatARS(totalBase)}</span>
              </div>
            </div>
          </div>

          {/* Gastos pendientes del sistema */}
          {gastosPendientes.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Wrench size={13} className="text-piedra" />
                <p className="text-sm font-semibold text-carbon">Gastos pendientes</p>
                <span className="text-xs text-piedra">(tildar para descontar)</span>
              </div>
              <div className="border border-arena rounded-xl overflow-hidden">
                {gastosPendientes.map(g => (
                  <label
                    key={g.id}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-crema/60 cursor-pointer border-b border-crema last:border-0"
                  >
                    <input
                      type="checkbox"
                      checked={gastosSeleccionados.includes(g.id)}
                      onChange={() => toggleGasto(g.id)}
                      className="rounded border-arena accent-carbon"
                    />
                    <span className="flex-1 text-sm text-carbon">{g.descripcion}</span>
                    <span className="text-sm font-semibold text-red-600">-{formatARS(g.monto)}</span>
                    <span className="text-[10px] text-piedra">{formatFecha(g.fecha)}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Gastos extra en el momento */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wrench size={13} className="text-piedra" />
                <p className="text-sm font-semibold text-carbon">Agregar gasto ahora</p>
              </div>
              <button
                type="button"
                onClick={addGastoExtra}
                className="text-xs text-carbon flex items-center gap-1 hover:text-arena transition-colors"
              >
                <Plus size={12} /> Agregar
              </button>
            </div>
            {gastosExtra.length > 0 && (
              <div className="space-y-2">
                {gastosExtra.map((g, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input
                      className="form-input flex-1 text-sm"
                      placeholder="Descripción (ej: Plomería)"
                      value={g.descripcion}
                      onChange={e => updateGastoExtra(i, 'descripcion', e.target.value)}
                    />
                    <input
                      type="number"
                      className="form-input w-28 text-sm"
                      placeholder="Monto"
                      value={g.monto || ''}
                      onChange={e => updateGastoExtra(i, 'monto', e.target.value)}
                    />
                    <button
                      onClick={() => setGastosExtra(prev => prev.filter((_, idx) => idx !== i))}
                      className="text-piedra hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Honorarios */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Percent size={13} className="text-piedra" />
              <p className="text-sm font-semibold text-carbon">Honorarios de administración</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={20}
                step={0.5}
                value={honorariosPct}
                onChange={e => setHonorariosPct(Number(e.target.value))}
                className="flex-1 accent-carbon"
              />
              <div className="flex items-center gap-1 w-20">
                <input
                  type="number"
                  min={0}
                  max={20}
                  step={0.5}
                  value={honorariosPct}
                  onChange={e => setHonorariosPct(Number(e.target.value))}
                  className="form-input text-center font-semibold w-16 text-sm"
                />
                <span className="text-sm text-piedra">%</span>
              </div>
            </div>
          </div>

          {/* Resumen de cálculo */}
          <div className="border border-arena rounded-xl overflow-hidden text-sm">
            <div className="flex justify-between px-4 py-2.5 border-b border-crema">
              <span className="text-piedra">Alquiler base</span>
              <span className="font-semibold text-carbon">{formatARS(pago.monto)}</span>
            </div>
            {totalGastos > 0 && (
              <div className="flex justify-between px-4 py-2.5 border-b border-crema bg-red-50/50">
                <span className="text-red-600">Gastos descontados</span>
                <span className="font-semibold text-red-600">- {formatARS(totalGastos)}</span>
              </div>
            )}
            <div className="flex justify-between px-4 py-2.5 border-b border-crema">
              <span className="text-piedra">Honorarios ({honorariosPct}% sobre alquiler)</span>
              <span className="font-semibold text-piedra">- {formatARS(honorarios)}</span>
            </div>
            {extrasAlPropietario !== 0 && (
              <div className="flex justify-between px-4 py-2.5 border-b border-crema bg-blue-50/30">
                <span className="text-blue-700">Otros conceptos (expensas, depósito, etc.)</span>
                <span className={`font-semibold ${extrasAlPropietario >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {extrasAlPropietario >= 0 ? '+ ' : '- '}{formatARS(Math.abs(extrasAlPropietario))}
                </span>
              </div>
            )}
            <div className="flex justify-between px-4 py-3 bg-crema">
              <span className="font-bold text-carbon">A pagar al propietario</span>
              <span className="font-display text-lg text-carbon">{formatARS(totalPagado)}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button
            onClick={generarPDF}
            disabled={generando}
            className="btn-primary flex items-center gap-2"
          >
            <Receipt size={14} />
            {generando ? 'Generando...' : 'Generar liquidación PDF'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Modal Confirmar Transferencia al Propietario ─────────────────────────────

interface ModalConfirmarTransferenciaProps {
  pago: Pago
  vinculo: Vinculo
  onClose: () => void
  onConfirmar: () => void
  isPending: boolean
}

function ModalConfirmarTransferencia({ pago, vinculo, onClose, onConfirmar, isPending }: ModalConfirmarTransferenciaProps) {
  const honorariosPct = vinculo.honorariosPct ?? 8
  const conceptos = pago.conceptosExtra ?? []
  const liquidacionGenerada = pago.montoPropietario != null

  // Usar valores de la liquidación generada si existen; si no, calcular en tiempo real
  const honorarios = pago.honorariosAplicados ?? Math.round(pago.monto * honorariosPct / 100)
  const gastosAplicados = pago.gastosAplicados ?? 0

  const extrasParaPropietario = conceptos
    .filter(c => !c.esInmobiliaria)
    .reduce((s, c) => s + c.monto, 0)

  const extrasInmobiliaria = conceptos
    .filter(c => c.esInmobiliaria && c.monto > 0)
    .reduce((s, c) => s + c.monto, 0)

  const totalTransferir = pago.montoPropietario ?? ((pago.monto - honorarios) + extrasParaPropietario)

  return (
    <div className="fixed inset-0 bg-carbon/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-arena">
          <div>
            <h2 className="font-display text-lg text-carbon">Confirmar transferencia</h2>
            <p className="text-xs text-piedra mt-0.5">{pago.periodo} · {vinculo.propiedad.direccion}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-crema text-piedra"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Desglose */}
          <div className="border border-arena rounded-xl overflow-hidden text-sm">
            {/* Alquiler base */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-crema">
              <span className="text-piedra">Alquiler base</span>
              <span className="font-semibold text-carbon">{formatARS(pago.monto)}</span>
            </div>
            {/* Honorarios solo sobre el alquiler */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-crema bg-red-50/40">
              <span className="text-red-600">Honorarios administración ({honorariosPct}%)</span>
              <span className="font-semibold text-red-600">− {formatARS(honorarios)}</span>
            </div>
            {/* Gastos de la liquidación */}
            {gastosAplicados > 0 && (
              <div className="flex justify-between items-center px-4 py-3 border-b border-crema bg-orange-50/40">
                <span className="text-orange-700">Gastos descontados (liquidación)</span>
                <span className="font-semibold text-orange-700">− {formatARS(gastosAplicados)}</span>
              </div>
            )}
            {/* Extras al propietario */}
            {extrasParaPropietario !== 0 && (
              <div className="flex justify-between items-center px-4 py-3 border-b border-crema bg-blue-50/30">
                <span className="text-blue-700">Otros conceptos al propietario</span>
                <span className={`font-semibold ${extrasParaPropietario >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {extrasParaPropietario >= 0 ? '+' : '−'} {formatARS(Math.abs(extrasParaPropietario))}
                </span>
              </div>
            )}
            {/* Retención inmobiliaria (solo informativo) */}
            {extrasInmobiliaria > 0 && (
              <div className="flex justify-between items-center px-4 py-3 border-b border-crema bg-amber-50/40">
                <div className="flex items-center gap-1.5">
                  <Building2 size={12} className="text-amber-600" />
                  <span className="text-amber-700">Retención inmobiliaria</span>
                </div>
                <span className="font-semibold text-amber-600">+ {formatARS(extrasInmobiliaria)}</span>
              </div>
            )}
            {/* Total */}
            <div className="flex justify-between items-center px-4 py-4 bg-carbon">
              <span className="font-bold text-white">A transferir al propietario</span>
              <span className="font-display text-xl text-white">{formatARS(totalTransferir)}</span>
            </div>
          </div>

          {!liquidacionGenerada && (
            <p className="text-xs text-orange-700 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
              ⚠️ No se generó la liquidación todavía. Los gastos no están incluidos en este cálculo.
            </p>
          )}
          <p className="text-xs text-piedra bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Al confirmar se registra como pagado al propietario. Podés revertirlo si cometés un error.
          </p>
        </div>

        <div className="px-6 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancelar</button>
          <button onClick={onConfirmar} disabled={isPending} className="btn-primary flex items-center gap-2">
            <Send size={14} />
            {isPending ? 'Registrando...' : 'Registrar transferencia'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Panel de pagos del contrato ──────────────────────────────────────────────

interface PanelPagosProps {
  vinculo: Vinculo
  onBack?: () => void
}

function PanelPagos({ vinculo, onBack }: PanelPagosProps) {
  const qc = useQueryClient()
  const { usuario } = useAuthStore()
  const esAdmin = usuario?.rol === 'ADMIN'
  const [toast, setToast] = useState('')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [pagoLiquidar, setPagoLiquidar] = useState<Pago | null>(null)
  const [pagoACobrar, setPagoACobrar] = useState<Pago | null>(null)
  const [pagoATransferir, setPagoATransferir] = useState<Pago | null>(null)
  const [confirmRevertirId, setConfirmRevertirId] = useState<string | null>(null)
  const [confirmRevertirCobroId, setConfirmRevertirCobroId] = useState<string | null>(null)
  const [confirmEliminarId, setConfirmEliminarId] = useState<string | null>(null)

  const { data: pagos = [], isLoading } = useQuery<Pago[]>({
    queryKey: ['pagos', vinculo.id],
    queryFn: () => api.get('/pagos', { params: { vinculoId: vinculo.id } }).then(r => r.data),
  })

  const pagarPropietario = useMutation({
    mutationFn: (id: string) => api.patch(`/pagos/${id}/pagar-propietario`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
      setPagoATransferir(null)
      toast2('Transferencia al propietario registrada ✓')
    },
  })

  const revertirPago = useMutation({
    mutationFn: (id: string) => api.patch(`/pagos/${id}/revertir-pago-propietario`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
      setConfirmRevertirId(null)
      toast2('Transferencia revertida')
    },
  })

  const revertirCobro = useMutation({
    mutationFn: (id: string) => api.patch(`/pagos/${id}/revertir-cobro`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
      setConfirmRevertirCobroId(null)
      toast2('Cobro revertido — pago vuelve a Pendiente')
    },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Error al revertir'
      toast2(msg)
    },
  })

  const enviarWA = useMutation({
    mutationFn: (id: string) => api.post(`/pagos/${id}/enviar-whatsapp`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] }); toast2('Recibo enviado por WhatsApp ✓') },
    onError: (e: unknown) => {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Error al enviar'
      toast2(msg)
    },
  })

  const eliminarPago = useMutation({
    mutationFn: (id: string) => api.delete(`/pagos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
      setConfirmEliminarId(null)
      toast2('Pago eliminado')
    },
    onError: () => toast2('Error al eliminar'),
  })

  const generarRetroactivos = useMutation({
    mutationFn: () => api.post(`/vinculos/${vinculo.id}/generar-retroactivos`),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
      toast2(`${res.data.generados} pagos generados ✓`)
    },
    onError: () => toast2('Error al generar pagos'),
  })

  function toast2(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleDescargar(pago: Pago, tipo: 'recibo' | 'liquidacion') {
    try {
      await descargarPDF(pago.id, tipo, pago.periodo || pago.id)
    } catch {
      toast2('Error al generar PDF')
    }
  }

  const pagosOrdenados = [...pagos].sort(
    (a, b) => new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime()
  )

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-carbon text-white px-4 py-2 rounded-xl shadow-lg text-sm z-50">
          {toast}
        </div>
      )}

      {/* Header del panel */}
      <div className="px-4 md:px-6 py-4 border-b border-arena flex items-center justify-between bg-white gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-1.5 -ml-1 text-piedra hover:text-carbon shrink-0">
              <ChevronRight size={18} className="rotate-180" />
            </button>
          )}
          <div className="min-w-0">
          <h3 className="font-display text-base text-carbon truncate">
            {vinculo.propiedad.direccion}
          </h3>
          <div className="flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1 text-xs text-blue-700">
              <User size={11} />
              <span className="font-semibold">{vinculo.persona.nombre} {vinculo.persona.apellido}</span>
            </span>
            {pagosOrdenados[0]?.propiedad?.propietario && (
              <span className="flex items-center gap-1 text-xs text-amber-700">
                <Building2 size={11} />
                <span className="font-semibold">
                  {pagosOrdenados[0].propiedad.propietario.nombre} {pagosOrdenados[0].propiedad.propietario.apellido}
                </span>
              </span>
            )}
            <span className="text-xs text-piedra hidden sm:inline">
              {formatFecha(vinculo.fechaInicio)} — {vinculo.fechaFin ? formatFecha(vinculo.fechaFin) : 'Sin fin'} ·{' '}
              {formatARS(vinculo.alquilerActual ?? vinculo.alquilerInicial ?? 0)}/mes
            </span>
          </div>
          </div>
        </div>
        <button
          onClick={() => setModalNuevo(true)}
          className="btn-primary flex items-center gap-2 text-sm shrink-0"
        >
          <Plus size={14} /> <span className="hidden sm:inline">Nuevo pago</span><span className="sm:hidden">Nuevo</span>
        </button>
      </div>

      {/* Tabla de pagos */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && <p className="p-6 text-sm text-piedra animate-pulse">Cargando pagos...</p>}

        {!isLoading && pagosOrdenados.length === 0 && (
          <div className="p-8">
            {vinculo.tipo === 'ALQUILER' ? (
              <div className="border border-amber-200 bg-amber-50 rounded-xl p-5 flex flex-col items-center gap-3 text-center">
                <AlertTriangle size={28} className="text-amber-500" />
                <div>
                  <p className="font-semibold text-carbon">Este contrato no tiene pagos generados</p>
                  <p className="text-xs text-piedra mt-1">
                    El contrato inició el {formatFecha(vinculo.fechaInicio)}. Podés generar todos los meses
                    faltantes automáticamente — los anteriores al mes actual quedarán en <strong>mora</strong>.
                  </p>
                </div>
                <button
                  onClick={() => generarRetroactivos.mutate()}
                  disabled={generarRetroactivos.isPending}
                  className="btn-primary flex items-center gap-2"
                >
                  <Receipt size={14} />
                  {generarRetroactivos.isPending ? 'Generando...' : `Generar pagos desde ${formatFecha(vinculo.fechaInicio)}`}
                </button>
              </div>
            ) : (
              <div className="text-center text-piedra text-sm py-8">
                <CreditCard size={32} className="mx-auto mb-3 opacity-30" />
                No hay pagos registrados para este contrato
              </div>
            )}
          </div>
        )}

        {pagosOrdenados.length > 0 && (
          <table className="w-full text-sm">
            <thead className="bg-crema border-b border-arena sticky top-0">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Nro recibo</th>
                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Período</th>
                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide hidden lg:table-cell">Vencimiento</th>
                <th className="text-right px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Alquiler</th>
                <th className="text-right px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Total</th>
                <th className="text-left px-4 py-2.5 text-xs text-piedra uppercase tracking-wide">Estado</th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-blue-600"><User size={11} /> Inquilino</span>
                </th>
                <th className="px-4 py-2.5 text-xs uppercase tracking-wide">
                  <span className="flex items-center gap-1 text-amber-600"><Building2 size={11} /> Propietario</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {pagosOrdenados.map((p, idx) => (
                <tr
                  key={p.id}
                  className={`border-b border-crema last:border-0 hover:bg-crema/40 transition-colors ${
                    p.estado === 'ANULADO' ? 'opacity-50' : ''
                  }`}
                >
                  {/* Nro */}
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-piedra">{nroFormato(p.nroRecibo)}</span>
                    <p className="text-[10px] text-muted mt-0.5">Pago #{idx + 1}</p>
                  </td>

                  {/* Período */}
                  <td className="px-4 py-3">
                    <p className="font-semibold text-carbon">{p.periodo || '—'}</p>
                    <p className="text-[11px] text-piedra">{p.formaPago || 'Efectivo'}</p>
                  </td>

                  {/* Vencimiento */}
                  <td className="px-4 py-3 text-carbon hidden lg:table-cell">
                    {formatFecha(p.fechaVencimiento)}
                    {p.fechaPago && (
                      <p className="text-[11px] text-green-600">Pagado: {formatFecha(p.fechaPago)}</p>
                    )}
                  </td>

                  {/* Monto base */}
                  <td className="px-4 py-3 text-right text-carbon">{formatARS(p.monto)}</td>

                  {/* Total con extras */}
                  <td className="px-4 py-3 text-right">
                    <span className="font-semibold text-carbon">
                      {formatARS(p.totalConExtras ?? p.monto)}
                    </span>
                    {p.conceptosExtra && p.conceptosExtra.length > 0 && (
                      <p className="text-[10px] text-piedra">+{p.conceptosExtra.length} conceptos</p>
                    )}
                  </td>

                  {/* Estado */}
                  <td className="px-4 py-3">
                    <span className={ESTADO_BADGE[p.estado] || 'badge-gray'}>
                      {ESTADO_LABEL[p.estado] || p.estado}
                    </span>
                    {p.comprobanteEnviado && (
                      <p className="text-[10px] text-green-600 mt-0.5">✓ WA enviado</p>
                    )}
                    {esAdmin && (
                      confirmEliminarId === p.id ? (
                        <div className="flex items-center gap-1 mt-1">
                          <span className="text-[10px] text-red-700">¿Eliminar?</span>
                          <button
                            onClick={() => eliminarPago.mutate(p.id)}
                            disabled={eliminarPago.isPending}
                            className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                          >Sí</button>
                          <button
                            onClick={() => setConfirmEliminarId(null)}
                            className="text-[10px] text-piedra px-1.5 py-0.5 rounded bg-crema hover:bg-arena/30 transition-colors"
                          >No</button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmEliminarId(p.id)}
                          className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-600 mt-1 transition-colors"
                        >
                          <Trash2 size={9} /> Eliminar
                        </button>
                      )
                    )}
                  </td>

                  {/* Acciones — Inquilino */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {p.estado !== 'PAGADO' && p.estado !== 'ANULADO' && (
                        <button
                          onClick={() => setPagoACobrar(p)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors whitespace-nowrap"
                        >
                          <CheckCircle size={13} /> Cobrar
                        </button>
                      )}
                      {p.estado === 'PAGADO' && (
                        <>
                          <button
                            onClick={() => handleDescargar(p, 'recibo')}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-crema hover:bg-arena/40 text-carbon text-xs font-medium transition-colors whitespace-nowrap"
                          >
                            <FileText size={12} /> Recibo PDF
                          </button>
                          {vinculo.persona.whatsapp && (
                            <button
                              onClick={() => enviarWA.mutate(p.id)}
                              disabled={enviarWA.isPending}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium transition-colors whitespace-nowrap"
                            >
                              <Send size={12} /> {p.comprobanteEnviado ? 'Reenviar WA' : 'Enviar WA'}
                            </button>
                          )}
                          {!p.pagadoAlPropietario && (
                            confirmRevertirCobroId === p.id ? (
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[10px] text-red-700">¿Revertir cobro?</span>
                                <button
                                  onClick={() => revertirCobro.mutate(p.id)}
                                  disabled={revertirCobro.isPending}
                                  className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                                >
                                  Sí
                                </button>
                                <button
                                  onClick={() => setConfirmRevertirCobroId(null)}
                                  className="text-[10px] text-piedra hover:text-carbon px-1.5 py-0.5 rounded bg-crema hover:bg-arena/30 transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmRevertirCobroId(p.id)}
                                className="flex items-center gap-1 text-[10px] text-red-500 hover:text-red-700 mt-0.5 transition-colors"
                              >
                                <RotateCcw size={10} /> Revertir cobro
                              </button>
                            )
                          )}
                        </>
                      )}
                      {p.estado === 'ANULADO' && (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </div>
                  </td>

                  {/* Acciones — Propietario */}
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {p.estado !== 'PAGADO' && (
                        <span className="text-xs text-muted">Esperando cobro</span>
                      )}
                      {p.estado === 'PAGADO' && !p.pagadoAlPropietario && (
                        <>
                          {p.montoPropietario != null ? (
                            // Estado 2: liquidación generada — mostrar tick + acciones
                            <>
                              <div className="flex items-center gap-1 text-[11px] text-green-700 font-semibold">
                                <CheckCircle size={11} /> Liquidación realizada
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => descargarPDF(p.id, 'liquidacion', p.id)}
                                  className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
                                >
                                  <FileDown size={10} /> PDF
                                </button>
                                <button
                                  onClick={() => setPagoLiquidar(p)}
                                  className="flex items-center gap-1 text-[10px] text-piedra hover:text-carbon transition-colors"
                                >
                                  <RotateCcw size={9} /> Re-liquidar
                                </button>
                              </div>
                              <button
                                onClick={() => setPagoATransferir(p)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-piedra hover:bg-carbon text-white text-xs font-semibold transition-colors whitespace-nowrap"
                              >
                                <Send size={12} /> Transferir pago {formatARS(p.montoPropietario)}
                              </button>
                            </>
                          ) : (
                            // Estado 1: sin liquidación
                            <button
                              onClick={() => setPagoLiquidar(p)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold transition-colors whitespace-nowrap"
                            >
                              <Receipt size={12} /> Liquidar
                            </button>
                          )}
                        </>
                      )}
                      {p.estado === 'PAGADO' && p.pagadoAlPropietario && (
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-1 rounded-full font-medium whitespace-nowrap">
                            <CheckCircle size={11} /> Cobró
                            {p.fechaPagoPropietario && <span className="text-green-500 ml-0.5">{formatFecha(p.fechaPagoPropietario)}</span>}
                          </span>
                          {p.montoPropietario != null && (
                            <button
                              onClick={() => descargarPDF(p.id, 'liquidacion', p.id)}
                              className="flex items-center gap-1 text-[10px] text-amber-600 hover:text-amber-800 transition-colors"
                            >
                              <FileDown size={10} /> PDF liquidación
                            </button>
                          )}
                          {/* Revertir — con confirmación inline */}
                          {confirmRevertirId === p.id ? (
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className="text-[10px] text-amber-700">¿Revertir?</span>
                              <button
                                onClick={() => revertirPago.mutate(p.id)}
                                disabled={revertirPago.isPending}
                                className="text-[10px] font-semibold text-red-600 hover:text-red-700 px-1.5 py-0.5 rounded bg-red-50 hover:bg-red-100 transition-colors"
                              >
                                Sí
                              </button>
                              <button
                                onClick={() => setConfirmRevertirId(null)}
                                className="text-[10px] text-piedra hover:text-carbon px-1.5 py-0.5 rounded bg-crema hover:bg-arena/30 transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmRevertirId(p.id)}
                              className="flex items-center gap-1 text-[10px] text-piedra hover:text-amber-700 transition-colors mt-0.5"
                            >
                              <RotateCcw size={9} /> Revertir
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {modalNuevo && (
        <ModalNuevoPago
          vinculo={vinculo}
          onClose={() => setModalNuevo(false)}
          onCreated={() => qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })}
        />
      )}

      {pagoLiquidar && (
        <ModalLiquidacion
          pago={pagoLiquidar}
          vinculo={vinculo}
          onClose={() => setPagoLiquidar(null)}
          onSuccess={() => {
            qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
            setPagoLiquidar(null)
          }}
        />
      )}

      {pagoACobrar && (
        <ModalCobro
          pago={pagoACobrar}
          vinculo={vinculo}
          onClose={() => setPagoACobrar(null)}
          onCobrado={() => {
            qc.invalidateQueries({ queryKey: ['pagos', vinculo.id] })
            toast2('Cobro registrado ✓')
          }}
        />
      )}

      {pagoATransferir && (
        <ModalConfirmarTransferencia
          pago={pagoATransferir}
          vinculo={vinculo}
          onClose={() => setPagoATransferir(null)}
          onConfirmar={() => pagarPropietario.mutate(pagoATransferir.id)}
          isPending={pagarPropietario.isPending}
        />
      )}
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function Pagos() {
  const location = useLocation()
  const vinculoIdDesdeNav = (location.state as { vinculoId?: string } | null)?.vinculoId
  const [vinculoSeleccionado, setVinculoSeleccionado] = useState<Vinculo | null>(null)
  const [filtroActivo, setFiltroActivo] = useState(true)

  const { data: vinculos = [], isLoading } = useQuery<Vinculo[]>({
    queryKey: ['vinculos-alquiler', filtroActivo],
    queryFn: () =>
      api.get('/vinculos', { params: { tipo: 'ALQUILER', activo: filtroActivo } })
        .then(r => r.data),
  })

  // Auto-seleccionar si se llegó desde el Dashboard via búsqueda
  useEffect(() => {
    if (vinculoIdDesdeNav && vinculos.length > 0 && !vinculoSeleccionado) {
      const v = vinculos.find(v => v.id === vinculoIdDesdeNav)
      if (v) setVinculoSeleccionado(v)
    }
  }, [vinculoIdDesdeNav, vinculos])

  // Ordenar: primero los que tienen próximo vencimiento
  const vinculosOrdenados = [...vinculos].sort((a, b) => {
    if (!a.fechaFin && !b.fechaFin) return 0
    if (!a.fechaFin) return 1
    if (!b.fechaFin) return -1
    return new Date(a.fechaFin).getTime() - new Date(b.fechaFin).getTime()
  })

  function diasParaVencer(fechaFin?: string) {
    if (!fechaFin) return null
    const diff = Math.ceil((new Date(fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    return diff
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* ── Panel izquierdo: lista de contratos ─────────────────────────────── */}
      <div className={`flex-shrink-0 border-r border-arena flex-col bg-white w-full md:w-80 ${vinculoSeleccionado ? 'hidden md:flex' : 'flex'}`}>
        {/* Header */}
        <div className="px-4 py-4 border-b border-arena">
          <h1 className="font-display text-lg text-carbon">Contratos</h1>
          <p className="text-xs text-piedra mt-0.5">{vinculos.length} alquileres</p>
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setFiltroActivo(true)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                filtroActivo
                  ? 'bg-carbon text-white'
                  : 'bg-crema text-piedra hover:bg-arena/30'
              }`}
            >
              Activos
            </button>
            <button
              onClick={() => setFiltroActivo(false)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${
                !filtroActivo
                  ? 'bg-carbon text-white'
                  : 'bg-crema text-piedra hover:bg-arena/30'
              }`}
            >
              Inactivos
            </button>
          </div>
        </div>

        {/* Lista */}
        <div className="flex-1 overflow-y-auto divide-y divide-crema">
          {isLoading && (
            <p className="p-4 text-sm text-piedra animate-pulse">Cargando contratos...</p>
          )}

          {!isLoading && vinculosOrdenados.length === 0 && (
            <div className="p-8 text-center text-piedra text-sm">
              <Home size={28} className="mx-auto mb-2 opacity-30" />
              No hay contratos {filtroActivo ? 'activos' : 'inactivos'}
            </div>
          )}

          {vinculosOrdenados.map((v) => {
            const dias = diasParaVencer(v.fechaFin)
            const activo = vinculoSeleccionado?.id === v.id
            const alertaVence = dias !== null && dias <= 30 && dias > 0
            const vencido = dias !== null && dias <= 0

            return (
              <button
                key={v.id}
                onClick={() => setVinculoSeleccionado(v)}
                className={`w-full text-left px-4 py-3 transition-colors hover:bg-crema/60 ${
                  activo ? 'bg-crema border-l-2 border-carbon' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    {/* Dirección */}
                    <p className="font-semibold text-sm text-carbon truncate leading-tight">
                      {v.propiedad.direccion}
                    </p>
                    {/* Inquilino */}
                    <p className="text-xs text-piedra mt-0.5 flex items-center gap-1">
                      <User size={10} className="opacity-50" />
                      {v.persona.nombre} {v.persona.apellido}
                    </p>
                    {/* Fechas */}
                    <p className="text-[11px] text-muted mt-1 flex items-center gap-1">
                      <Calendar size={10} className="opacity-50" />
                      {formatFecha(v.fechaInicio)} — {v.fechaFin ? formatFecha(v.fechaFin) : '∞'}
                    </p>
                    {/* Monto */}
                    <p className="text-xs font-semibold text-carbon mt-1">
                      {formatARS(v.alquilerActual ?? v.alquilerInicial ?? 0)}
                      <span className="text-[10px] font-normal text-piedra">/mes</span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <ChevronRight size={14} className={activo ? 'text-carbon' : 'text-arena'} />
                    {alertaVence && (
                      <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full">
                        {dias}d
                      </span>
                    )}
                    {vencido && (
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">
                        Venció
                      </span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Panel derecho: detalle de pagos ─────────────────────────────────── */}
      <div className={`flex-1 flex-col overflow-hidden bg-white ${vinculoSeleccionado ? 'flex' : 'hidden md:flex'}`}>
        {vinculoSeleccionado ? (
          <PanelPagos vinculo={vinculoSeleccionado} onBack={() => setVinculoSeleccionado(null)} />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-piedra gap-3">
            <Building2 size={48} className="opacity-20" />
            <p className="text-sm">Seleccioná un contrato para ver los pagos</p>
            <p className="text-xs text-muted">
              {vinculos.length} contrato{vinculos.length !== 1 ? 's' : ''} disponible{vinculos.length !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
