import { useState, useMemo } from 'react'
import { FileDown, RotateCcw, FilePlus } from 'lucide-react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Persona {
  articulo: string
  nombre: string
  dni: string
  cuit: string
  tipoVia: string
  domicilio: string
  ciudad: string
  provincia: string
  telefono: string
  email: string
}

interface ContratoState {
  locadora: Persona
  locataria: Persona
  garantiaTipo: 'sin' | '1garante' | '2garantes' | 'caucion'
  garante1: Persona
  garante2: Persona
  depositoTipo: 'efectivo' | 'pagare' | 'sin'
  depositoMonto: string
  inmuebleTipoVia: string
  inmuebleDireccion: string
  inmueblePartida: string
  pagoModalidad: 'cbu' | 'efectivo-domicilio' | 'inmobiliaria'
  pagoBanco: string
  pagoTipoCuenta: string
  pagoNroCuenta: string
  pagoCbu: string
  emsaConexion: string
  emsaDni: string
  emsaTitular: string
  samsaCuenta: string
  duracion: string
  fechaInicio: string
  precioMensual: string
  indice: 'IPC' | 'ICL'
  periodoAjuste: 'trimestral' | 'cuatrimestral' | 'semestral' | 'anual'
  incluirSellado: boolean
  incluirSeguro: boolean
  fechaFirma: string
  ciudadFirma: string
}

const personaVacia: Persona = {
  articulo: 'El Sr.', nombre: '', dni: '', cuit: '',
  tipoVia: 'calle', domicilio: '', ciudad: 'Posadas', provincia: 'Misiones',
  telefono: '', email: '',
}

const initial: ContratoState = {
  locadora: { ...personaVacia },
  locataria: { ...personaVacia },
  garantiaTipo: '1garante',
  garante1: { ...personaVacia },
  garante2: { ...personaVacia },
  depositoTipo: 'efectivo',
  depositoMonto: '',
  inmuebleTipoVia: 'calle',
  inmuebleDireccion: '',
  inmueblePartida: '',
  pagoModalidad: 'cbu',
  pagoBanco: 'Banco Macro',
  pagoTipoCuenta: 'Caja de ahorro en pesos',
  pagoNroCuenta: '',
  pagoCbu: '',
  emsaConexion: '',
  emsaDni: '',
  emsaTitular: '',
  samsaCuenta: '',
  duracion: '36',
  fechaInicio: '',
  precioMensual: '',
  indice: 'IPC',
  periodoAjuste: 'cuatrimestral',
  incluirSellado: true,
  incluirSeguro: false,
  fechaFirma: '',
  ciudadFirma: 'Posadas',
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const B = (v: string, f = '___________') => v.trim() || f

function fechaLarga(iso: string) {
  if (!iso) return '___________'
  const d = new Date(iso + 'T12:00:00')
  return d.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function sumarMeses(iso: string, m: number) {
  if (!iso) return '___________'
  const d = new Date(iso + 'T12:00:00')
  d.setMonth(d.getMonth() + m)
  return fechaLarga(d.toISOString().split('T')[0])
}

function formatPeso(v: string) {
  if (!v) return '___________'
  const n = parseInt(v.replace(/\D/g, ''))
  return isNaN(n) ? '___________' : `$ ${n.toLocaleString('es-AR')}`
}

const PERIODO_MESES: Record<string, string> = {
  trimestral: 'TRES (3)', cuatrimestral: 'CUATRO (4)',
  semestral: 'SEIS (6)', anual: 'DOCE (12)',
}

const ARTICULOS = ['El Sr.', 'La Sra.', 'La empresa']
const TIPO_VIAS = ['calle', 'avenida', 'pasaje', 'bulevar', 'ruta']
const TIPOS_CUENTA = ['Caja de ahorro en pesos', 'Cuenta corriente', 'Caja de ahorro en dólares']

// ── Contract HTML ─────────────────────────────────────────────────────────────

function buildHTML(s: ContratoState): string {
  const loc = s.locadora
  const lat = s.locataria
  const dur = parseInt(s.duracion) || 36
  const fechaFin = sumarMeses(s.fechaInicio, dur)
  const locNombre = `${loc.articulo} ${B(loc.nombre)}`
  const latNombre = `${lat.articulo} ${B(lat.nombre)}`
  const locDom = `${loc.tipoVia} ${B(loc.domicilio)}, ${B(loc.ciudad)}, ${B(loc.provincia)}`
  const latDom = `${lat.tipoVia} ${B(lat.domicilio)}, ${B(lat.ciudad)}, ${B(lat.provincia)}`
  const inmueble = `${s.inmuebleTipoVia} ${B(s.inmuebleDireccion)}`

  const pagoTexto = s.pagoModalidad === 'cbu'
    ? `transferencia bancaria al ${B(s.pagoTipoCuenta)}, N° ${B(s.pagoNroCuenta)}, CBU ${B(s.pagoCbu)}, del ${B(s.pagoBanco)}`
    : s.pagoModalidad === 'efectivo-domicilio'
    ? 'efectivo en el domicilio de la parte LOCADORA'
    : 'pago en las oficinas de la inmobiliaria'

  let garantiaHTML = ''
  if (s.garantiaTipo === '1garante' || s.garantiaTipo === '2garantes') {
    const g1 = s.garante1
    let txt = `La parte LOCATARIA presenta como fiador solidario, liso y llano pagador al ${g1.articulo} ${B(g1.nombre)}, DNI N° ${B(g1.dni)}, CUIT/CUIL ${B(g1.cuit)}, con domicilio en ${g1.tipoVia} ${B(g1.domicilio)}, ${B(g1.ciudad)}, ${B(g1.provincia)}.`
    if (s.garantiaTipo === '2garantes') {
      const g2 = s.garante2
      txt += ` Y al ${g2.articulo} ${B(g2.nombre)}, DNI N° ${B(g2.dni)}, CUIT/CUIL ${B(g2.cuit)}, con domicilio en ${g2.tipoVia} ${B(g2.domicilio)}, ${B(g2.ciudad)}, ${B(g2.provincia)}.`
    }
    txt += ` El/los garante/s acepta/n ser solidariamente responsable/s junto con la parte LOCATARIA por el cumplimiento de todas las obligaciones emergentes del presente contrato, incluyendo el pago de alquileres, expensas, servicios y cualquier otro concepto que se derive del mismo, hasta la efectiva restitución del inmueble.`
    garantiaHTML = `<p><b>QUINTA. GARANTÍA:</b> ${txt}</p>`
  } else if (s.garantiaTipo === 'caucion') {
    garantiaHTML = `<p><b>QUINTA. GARANTÍA:</b> La parte LOCATARIA garantiza el cumplimiento de sus obligaciones mediante caución (póliza de seguro de caución), la cual deberá mantenerse vigente durante toda la vigencia del contrato y sus eventuales prórrogas.</p>`
  } else {
    garantiaHTML = `<p><b>QUINTA. GARANTÍA:</b> Las partes acuerdan que el presente contrato se celebra sin garantía adicional, siendo responsabilidad exclusiva de la parte LOCATARIA el cumplimiento de todas las obligaciones emergentes del mismo.</p>`
  }

  let depositoTexto = ''
  if (s.depositoTipo === 'efectivo') {
    depositoTexto = `La parte LOCATARIA entrega en este acto, en concepto de depósito de garantía, la suma de ${formatPeso(s.depositoMonto)} en efectivo, importe equivalente a un (1) mes de alquiler. Dicha suma será devuelta a la finalización del contrato, actualizándose por el mismo índice y periodicidad pactados en el presente.`
  } else if (s.depositoTipo === 'pagare') {
    depositoTexto = `La parte LOCATARIA entrega en este acto, en concepto de depósito de garantía, un pagaré por la suma de ${formatPeso(s.depositoMonto)}, equivalente a un (1) mes de alquiler. Dicho pagaré será devuelto a la finalización del contrato y restitución del inmueble.`
  } else {
    depositoTexto = `Las partes acuerdan que el presente contrato se celebra sin depósito de garantía.`
  }

  const numExtra = (n: number) => {
    let extra = 0
    if (s.incluirSellado) extra++
    if (s.incluirSeguro) extra++
    return n + extra > 15 ? 16 + (n - 15) : n
  }
  void numExtra

  const clausulaN = (n: number) => {
    const nombres = ['', 'PRIMERA', 'SEGUNDA', 'TERCERA', 'CUARTA', 'QUINTA', 'SEXTA', 'SÉPTIMA', 'OCTAVA', 'NOVENA', 'DÉCIMA',
      'DÉCIMO PRIMERA', 'DÉCIMO SEGUNDA', 'DÉCIMO TERCERA', 'DÉCIMO CUARTA', 'DÉCIMO QUINTA', 'DÉCIMO SEXTA', 'DÉCIMO SÉPTIMA']
    return nombres[n] || `N° ${n}`
  }

  let clausulaIdx = 15
  const selladoHTML = s.incluirSellado
    ? `<p><b>${clausulaN(++clausulaIdx)}. SELLADO:</b> El sellado e impuesto que corresponda al presente contrato estará a cargo de ambas partes en un 50% cada una, debiendo ser abonado dentro de los plazos establecidos por la legislación provincial vigente.</p>`
    : ''
  const seguroHTML = s.incluirSeguro
    ? `<p><b>${clausulaN(++clausulaIdx)}. SEGURO DE INCENDIO:</b> La parte LOCATARIA se compromete a contratar y mantener vigente durante toda la duración del contrato un seguro de incendio por el valor del inmueble locado, debiendo presentar la póliza correspondiente a la parte LOCADORA dentro de los TREINTA (30) días de la firma del presente contrato.</p>`
    : ''

  const firmasGarantes = (s.garantiaTipo === '1garante' || s.garantiaTipo === '2garantes')
    ? `<table width="100%" style="margin-top:50px;"><tr>
        <td width="45%" style="text-align:center;border-top:1px solid #000;padding-top:8px;">
          <b>GARANTE</b><br/>${s.garante1.articulo} ${B(s.garante1.nombre)}<br/>DNI: ${B(s.garante1.dni)}
        </td>
        ${s.garantiaTipo === '2garantes' ? `<td width="10%"></td><td width="45%" style="text-align:center;border-top:1px solid #000;padding-top:8px;">
          <b>GARANTE 2</b><br/>${s.garante2.articulo} ${B(s.garante2.nombre)}<br/>DNI: ${B(s.garante2.dni)}
        </td>` : '<td width="55%"></td>'}
       </tr></table>`
    : ''

  return `<div style="font-family:'Times New Roman',Georgia,serif;font-size:12pt;line-height:1.6;color:#111;max-width:720px;margin:0 auto;">

<h1 style="text-align:center;font-size:15pt;font-weight:bold;margin-bottom:4pt;letter-spacing:1px;">CONTRATO DE LOCACIÓN</h1>

<p>Entre <b>${locNombre}</b>, DNI N° ${B(loc.dni)}, CUIT/CUIL ${B(loc.cuit)}, con domicilio en ${locDom}${loc.telefono ? `, Tel. ${loc.telefono}` : ''}${loc.email ? `, Email: ${loc.email}` : ''}, en adelante denominada la parte <b>LOCADORA</b> y <b>${latNombre}</b>, DNI N° ${B(lat.dni)}, CUIT/CUIL ${B(lat.cuit)}, con domicilio en ${latDom}${lat.telefono ? `, Tel. ${lat.telefono}` : ''}${lat.email ? `, Email: ${lat.email}` : ''}, en adelante denominada la parte <b>LOCATARIA</b>, convienen en formalizar el presente contrato de locación sujeto a las cláusulas del presente contrato y las disposiciones del Código Civil y Comercial de la Nación.</p>

<p><b>PRIMERA. OBJETO:</b> La parte LOCADORA da en locación a la parte LOCATARIA y ésta recibe de conformidad el inmueble de su propiedad sito en ${inmueble}, Posadas, Misiones, Partida Inmobiliaria ${B(s.inmueblePartida)}. El objeto del presente contrato de locación no podrá ser modificado, ni podrán cederse los derechos que de él emanan, salvo expresa conformidad de la parte LOCADORA de conformidad a los términos del presente contrato.</p>

<p><b>SEGUNDA. PLAZO:</b> El plazo de duración del presente contrato se establece por el término de ${B(s.duracion, '__')} meses, contados a partir del día ${fechaLarga(s.fechaInicio)}. El plazo contractual fenecerá el día ${fechaFin}, obligándose la parte LOCATARIA a restituir el inmueble locado en el mismo estado en que se lo recibe, libre de terceros ocupantes y de cosas.</p>

<p><b>TERCERA. PRECIO:</b> Las partes convienen un canon locativo de <b>${formatPeso(s.precioMensual)}</b> mensuales para los primeros ${PERIODO_MESES[s.periodoAjuste] || 'CUATRO (4)'} meses de locación. <b>Ajuste ${s.periodoAjuste}:</b> El canon locativo mensual se ajustará ${s.periodoAjuste}mente conforme al Art. 1199 del Código Civil y Comercial de la Nación, modificado por el Art. 257 del DNU N° 70/2023, utilizando el índice <b>${s.indice}</b> (${s.indice === 'IPC' ? 'Índice de Precios al Consumidor' : 'Índice para Contratos de Locación'}). Para ello la parte LOCADORA realizará el cálculo indexatorio con una anticipación no menor a DIEZ (10) días al vencimiento de cada período ${s.periodoAjuste} del contrato. El nuevo valor se le informará a la parte LOCATARIA por los medios electrónicos que el mismo constituye en este acto, al menos diez (10) días antes que venza el pago del primer mes de cada nuevo período.</p>

<p><b>CUARTA. CLÁUSULA ESPECIAL:</b> Las PARTES acuerdan que en caso de derogarse por el Congreso el DNU 70/2023 o bien si se dictase una nueva ley que cambie las disposiciones del presente, especialmente en lo referido a: Plazo, Precio, Moneda, Índice de ajuste, Períodos de Ajustes, Garantía y/o Resolución del Contrato, las PARTES de común acuerdo readecuarán las condiciones del presente a la nueva normativa vigente. En ningún caso las PARTES podrán ejercer unilateralmente ningún tipo de modificación retroactiva de las condiciones pactadas, ni rescindir el contrato como consecuencia de un cambio normativo.</p>

${garantiaHTML}

<p><b>SEXTA. DEPÓSITO:</b> ${depositoTexto}</p>

<p><b>SÉPTIMA. DESTINO:</b> El inmueble deberá ser destinado exclusivamente como vivienda de ${latNombre} y su grupo familiar, quedando expresamente establecida la prohibición de cambiar el destino, sin previo consentimiento de la parte LOCADORA. No podrá utilizar el inmueble para depósito de materiales explosivos, inflamables, corrosivos o malolientes de ninguna naturaleza, ni colocar chapas o carteles anunciadores que puedan causar perjuicios o molestias a la parte LOCADORA, a la propiedad o a los vecinos y/o condóminos, ni efectuar actos o hechos que atenten contra la moral y las buenas costumbres, dando cumplimiento al reglamento interno del edificio, siendo el incumplimiento de estas obligaciones motivo de rescisión del presente contrato.</p>

<p><b>OCTAVA. REPARACIONES:</b> El inmueble objeto del presente se entrega en perfectas condiciones, pintado a nuevo, en buen estado de mantenimiento y aseo, con las instalaciones eléctricas y sanitarias funcionando perfectamente, conforme se detalle en anexo. La parte LOCATARIA asume la obligación de devolverlo pintado a nuevo, hacerse cargo del buen mantenimiento del inmueble, lo que incluye limpieza periódica de canaletas correspondientes a los techos y de usar el inmueble de manera tal que a la finalización del contrato se encuentre en el mismo estado en que lo recibió, salvo los deterioros estructurales producidos por el tiempo, estando la parte LOCADORA a cargo de las mejoras del mismo. Contando la parte LOCATARIA con un plazo de 10 días para notificar por escrito y en forma documentada cualquier reclamo y/o desperfecto que observarse en el inmueble, iniciándose dicho plazo a partir del ingreso de la misma a la propiedad.</p>

<p><b>NOVENA. MEJORAS:</b> La parte LOCATARIA carece de autorización para efectuar en el inmueble obras o mejoras que alteren su actual estructura interior, exterior o fachada aunque las mismas fueran de carácter precario sin el consentimiento dado por escrito de la parte LOCADORA; en caso de hacerlo en infracción, la parte LOCADORA tendrá el derecho de solicitar su eliminación u optar por la facultad de considerarla incorporada definitivamente a la propiedad sin que ello genere ningún tipo de derecho a favor de la parte LOCATARIA y/o presuponga la generación de indemnizaciones en favor de la parte LOCATARIA.</p>

<p><b>DÉCIMA. DAÑOS:</b> La parte LOCADORA no se responsabiliza por los daños que pueda causar cualquier tipo de siniestro, su grupo conviviente y/o terceros que frecuenten la propiedad.</p>

<p><b>DÉCIMO PRIMERA. INSPECCIONES:</b> La parte LOCATARIA permitirá a la parte LOCADORA o a sus representantes el acceso a la propiedad en caso de que la parte LOCADORA así lo requiera, para inspeccionar el estado y buen uso de la unidad locada.</p>

<p><b>DÉCIMO SEGUNDA. ABANDONO DEL INMUEBLE:</b> Para el caso en que la parte LOCATARIA abandonara el inmueble sin formalizar la entrega del mismo, se obligan a pagar las mercedes locativas devengadas hasta la fecha en que el Tribunal Competente otorgase la posesión a la parte LOCADORA.</p>

<p><b>DÉCIMO TERCERA. RESCISIÓN:</b> Cualquiera de las partes puede resolver el contrato anticipadamente, previo aviso de TREINTA (30) días corridos enviados en forma fehaciente. Si la parte LOCATARIA resuelve el contrato antes de cumplir seis (6) meses de locación, deberá abonar a la parte LOCADORA, en concepto de indemnización, la suma equivalente a UN (1) mes y MEDIO de alquiler al momento de la rescisión. Si la parte LOCATARIA resuelve el contrato después de transcurridos los primeros seis (6) meses de vigencia, la indemnización será equivalente a UN (1) mes de alquiler al momento de la rescisión.</p>

<p><b>DÉCIMO CUARTA. FORMA DE PAGO:</b> El canon locativo mensual será abonado del 1 al 10 de cada mes mediante ${pagoTexto}. El atraso en el pago del alquiler facultará a la parte LOCADORA a exigir los intereses moratorios correspondientes.</p>

<p><b>DÉCIMO QUINTA. SERVICIOS:</b> La parte LOCATARIA se hace cargo a partir de la fecha del presente de abonar los servicios del inmueble: EMSA (Electricidad) Conexión N° ${B(s.emsaConexion)}, titular DNI ${B(s.emsaDni)}, a nombre de ${B(s.emsaTitular)}; y SAMSA (Agua) N° de cuenta ${B(s.samsaCuenta)}. Todo atraso en el pago de los servicios será de responsabilidad exclusiva de la parte LOCATARIA.</p>

${selladoHTML}${seguroHTML}

<p><b>CLÁUSULA DE CONSENTIMIENTO:</b> La parte LOCATARIA declara que le ha sido entregada una copia del presente contrato con su firma, que conoce y acepta todas las cláusulas del mismo, y que ha tenido oportunidad de consultar con un profesional de su confianza antes de suscribirlo.</p>

<br/>
<p>En la ciudad de <b>${B(s.ciudadFirma)}</b>, a los ${fechaLarga(s.fechaFirma)} se suscriben DOS (2) ejemplares de un mismo tenor y a un solo efecto.</p>

<table width="100%" style="margin-top:60px;">
  <tr>
    <td width="45%" style="text-align:center;border-top:1px solid #000;padding-top:8px;">
      <b>PARTE LOCADORA</b><br/>${locNombre}<br/>DNI: ${B(loc.dni)}
    </td>
    <td width="10%"></td>
    <td width="45%" style="text-align:center;border-top:1px solid #000;padding-top:8px;">
      <b>PARTE LOCATARIA</b><br/>${latNombre}<br/>DNI: ${B(lat.dni)}
    </td>
  </tr>
</table>

${firmasGarantes}

</div>`
}

// ── Download ──────────────────────────────────────────────────────────────────

function downloadDoc(html: string, locatariaNombre: string) {
  const doc = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  @page { margin: 2.5cm; }
  body { font-family: "Times New Roman", serif; font-size: 12pt; }
  p { text-align: justify; margin: 0 0 10pt; line-height: 1.5; }
  h1 { text-align: center; font-size: 14pt; }
  b { font-weight: bold; }
  table { border-collapse: collapse; width: 100%; }
</style>
</head>
<body>${html}</body></html>`

  const blob = new Blob(['﻿', doc], { type: 'application/msword' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const nombre = locatariaNombre.trim().replace(/\s+/g, '-').toLowerCase() || 'locatario'
  a.download = `contrato-locacion-${nombre}.doc`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Form helpers ──────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: string }) {
  return <p className="text-[9px] font-bold tracking-[0.2em] text-arena/70 uppercase mt-5 mb-2 border-b border-white/10 pb-1">{children}</p>
}

function Label({ children }: { children: string }) {
  return <label className="text-[10px] font-semibold text-arena/60 uppercase tracking-wide">{children}</label>
}

function Input({ value, onChange, placeholder, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white placeholder:text-white/20 focus:outline-none focus:border-arena/50"
    />
  )
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[]
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-white/5 border border-white/10 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-arena/50"
    >
      {options.map(o => <option key={o} value={o} className="bg-carbon">{o}</option>)}
    </select>
  )
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-1.5">
      <span className="text-xs text-arena">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-arena' : 'bg-white/10'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </label>
  )
}

function ChipGroup<T extends string>({ options, value, onChange }: {
  options: { value: T; label: string }[]; value: T; onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map(o => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded text-[11px] font-medium transition-colors ${
            value === o.value ? 'bg-arena text-carbon' : 'bg-white/5 text-arena/60 hover:bg-white/10'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function PersonaForm({ title, value, onChange }: {
  title: string; value: Persona; onChange: (p: Persona) => void
}) {
  const set = (k: keyof Persona) => (v: string) => onChange({ ...value, [k]: v })
  return (
    <div>
      <SectionTitle>{title}</SectionTitle>
      <div className="grid grid-cols-2 gap-x-2 gap-y-2">
        <div>
          <Label>Artículo</Label>
          <Select value={value.articulo} onChange={set('articulo')} options={ARTICULOS} />
        </div>
        <div>
          <Label>Nombre completo</Label>
          <Input value={value.nombre} onChange={set('nombre')} placeholder="Apellido Nombre" />
        </div>
        <div>
          <Label>DNI</Label>
          <Input value={value.dni} onChange={set('dni')} placeholder="00.000.000" />
        </div>
        <div>
          <Label>CUIT/CUIL</Label>
          <Input value={value.cuit} onChange={set('cuit')} placeholder="20-00000000-0" />
        </div>
        <div>
          <Label>Tipo vía</Label>
          <Select value={value.tipoVia} onChange={set('tipoVia')} options={TIPO_VIAS} />
        </div>
        <div>
          <Label>Domicilio</Label>
          <Input value={value.domicilio} onChange={set('domicilio')} placeholder="Nombre y número" />
        </div>
        <div>
          <Label>Ciudad</Label>
          <Input value={value.ciudad} onChange={set('ciudad')} />
        </div>
        <div>
          <Label>Provincia</Label>
          <Input value={value.provincia} onChange={set('provincia')} />
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={value.telefono} onChange={set('telefono')} placeholder="+54 376 ..." />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={value.email} onChange={set('email')} type="email" />
        </div>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ContratoGenerador() {
  const [form, setForm] = useState<ContratoState>(initial)
  const [saved, setSaved] = useState(false)

  const set = <K extends keyof ContratoState>(k: K) => (v: ContratoState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  const contractHTML = useMemo(() => buildHTML(form), [form])

  function handleDownload() {
    downloadDoc(contractHTML, form.locataria.nombre)
  }

  function handleReset() {
    if (confirm('¿Reiniciar el formulario? Se perderán todos los datos cargados.')) {
      setForm({ ...initial })
    }
  }

  function handleSave() {
    localStorage.setItem('contrato-gen-draft', JSON.stringify(form))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="flex h-full overflow-hidden">

      {/* ── Left panel: form ── */}
      <div className="w-[380px] min-w-[380px] bg-carbon overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="sticky top-0 z-10 bg-carbon border-b border-white/10 px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-white font-display text-sm">Generador de Contratos</p>
            <p className="text-[9px] text-arena/50 tracking-widest uppercase">Contrato de Locación</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleReset} title="Nuevo" className="p-1.5 rounded text-arena/60 hover:text-white hover:bg-white/10 transition-colors">
              <FilePlus size={14} />
            </button>
            <button onClick={handleReset} title="Reiniciar" className="p-1.5 rounded text-arena/60 hover:text-white hover:bg-white/10 transition-colors">
              <RotateCcw size={14} />
            </button>
            <button onClick={handleSave} className="text-[11px] bg-white/10 hover:bg-white/20 text-arena px-3 py-1 rounded transition-colors">
              {saved ? '✓ Guardado' : 'Guardar'}
            </button>
            <button onClick={handleDownload} className="flex items-center gap-1.5 text-[11px] bg-arena text-carbon hover:bg-arena/80 px-3 py-1 rounded font-semibold transition-colors">
              <FileDown size={12} /> DOCX
            </button>
          </div>
        </div>

        {/* Form */}
        <div className="px-4 pb-8">

          {/* Locadora */}
          <PersonaForm
            title="Locadora (Propietario)"
            value={form.locadora}
            onChange={set('locadora')}
          />

          {/* Locataria */}
          <PersonaForm
            title="Locataria (Inquilino)"
            value={form.locataria}
            onChange={set('locataria')}
          />

          {/* Garantía */}
          <SectionTitle>Garantía</SectionTitle>
          <Label>Tipo</Label>
          <div className="mt-1">
            <ChipGroup
              options={[
                { value: '1garante', label: '1 garante' },
                { value: '2garantes', label: '2 garantes' },
                { value: 'caucion', label: 'Caución (póliza)' },
                { value: 'sin', label: 'Sin garantía' },
              ]}
              value={form.garantiaTipo}
              onChange={set('garantiaTipo')}
            />
          </div>
          {(form.garantiaTipo === '1garante' || form.garantiaTipo === '2garantes') && (
            <PersonaForm title="Garante 1" value={form.garante1} onChange={set('garante1')} />
          )}
          {form.garantiaTipo === '2garantes' && (
            <PersonaForm title="Garante 2" value={form.garante2} onChange={set('garante2')} />
          )}

          {/* Depósito */}
          <SectionTitle>Depósito</SectionTitle>
          <div className="space-y-2">
            <div>
              <Label>Tipo</Label>
              <div className="mt-1">
                <ChipGroup
                  options={[
                    { value: 'efectivo', label: 'Efectivo' },
                    { value: 'pagare', label: 'Pagaré' },
                    { value: 'sin', label: 'Sin depósito' },
                  ]}
                  value={form.depositoTipo}
                  onChange={set('depositoTipo')}
                />
              </div>
            </div>
            {form.depositoTipo !== 'sin' && (
              <div>
                <Label>Monto</Label>
                <Input value={form.depositoMonto} onChange={set('depositoMonto')} placeholder="ARS 350.000" />
              </div>
            )}
          </div>

          {/* Inmueble */}
          <SectionTitle>Inmueble</SectionTitle>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div>
              <Label>Tipo vía</Label>
              <Select value={form.inmuebleTipoVia} onChange={set('inmuebleTipoVia')} options={TIPO_VIAS} />
            </div>
            <div>
              <Label>Dirección + Nro</Label>
              <Input value={form.inmuebleDireccion} onChange={set('inmuebleDireccion')} placeholder="Nombre y número" />
            </div>
            <div className="col-span-2">
              <Label>Partida Inmobiliaria</Label>
              <Input value={form.inmueblePartida} onChange={set('inmueblePartida')} />
            </div>
          </div>

          {/* Forma de pago */}
          <SectionTitle>Forma de pago</SectionTitle>
          <div className="space-y-2">
            <div>
              <Label>Modalidad</Label>
              <div className="mt-1 space-y-1">
                {([
                  ['cbu', 'Transferencia (CBU)'],
                  ['efectivo-domicilio', 'Efectivo en domicilio del propietario'],
                  ['inmobiliaria', 'Pago en inmobiliaria'],
                ] as [string, string][]).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => set('pagoModalidad')(v as ContratoState['pagoModalidad'])}
                    className={`w-full text-left px-3 py-1.5 rounded text-[11px] transition-colors ${
                      form.pagoModalidad === v ? 'bg-arena text-carbon font-semibold' : 'bg-white/5 text-arena/60 hover:bg-white/10'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            {form.pagoModalidad === 'cbu' && (
              <>
                <div>
                  <Label>Banco</Label>
                  <Input value={form.pagoBanco} onChange={set('pagoBanco')} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Tipo de cuenta</Label>
                    <Select value={form.pagoTipoCuenta} onChange={set('pagoTipoCuenta')} options={TIPOS_CUENTA} />
                  </div>
                  <div>
                    <Label>Nº de cuenta</Label>
                    <Input value={form.pagoNroCuenta} onChange={set('pagoNroCuenta')} />
                  </div>
                </div>
                <div>
                  <Label>CBU</Label>
                  <Input value={form.pagoCbu} onChange={set('pagoCbu')} placeholder="22 dígitos" />
                </div>
              </>
            )}
          </div>

          {/* Servicios */}
          <SectionTitle>Servicios del Inmueble</SectionTitle>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div>
              <Label>EMSA — Conexión Nº</Label>
              <Input value={form.emsaConexion} onChange={set('emsaConexion')} />
            </div>
            <div>
              <Label>EMSA — DNI titular</Label>
              <Input value={form.emsaDni} onChange={set('emsaDni')} />
            </div>
            <div className="col-span-2">
              <Label>EMSA — Titular</Label>
              <Input value={form.emsaTitular} onChange={set('emsaTitular')} placeholder="Apellido Nombre" />
            </div>
            <div className="col-span-2">
              <Label>SAMSA — Nº de cuenta</Label>
              <Input value={form.samsaCuenta} onChange={set('samsaCuenta')} />
            </div>
          </div>

          {/* Vigencia */}
          <SectionTitle>Vigencia</SectionTitle>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div className="col-span-2">
              <Label>Duración (meses)</Label>
              <Input value={form.duracion} onChange={set('duracion')} placeholder="36" />
            </div>
            <div>
              <Label>Inicio</Label>
              <Input value={form.fechaInicio} onChange={set('fechaInicio')} type="date" />
            </div>
            <div>
              <Label>Final (auto)</Label>
              <div className="w-full bg-white/5 border border-white/5 rounded px-2 py-1.5 text-xs text-arena/50">
                {form.fechaInicio && form.duracion
                  ? sumarMeses(form.fechaInicio, parseInt(form.duracion) || 36)
                  : 'dd/mm/aaaa'}
              </div>
            </div>
          </div>

          {/* Precio */}
          <SectionTitle>Precio</SectionTitle>
          <div className="space-y-2">
            <div>
              <Label>Precio alquiler mensual</Label>
              <Input value={form.precioMensual} onChange={set('precioMensual')} placeholder="ARS 350.000" />
            </div>
            <div>
              <Label>Índice de ajuste</Label>
              <div className="mt-1">
                <ChipGroup
                  options={[{ value: 'IPC', label: 'IPC' }, { value: 'ICL', label: 'ICL' }]}
                  value={form.indice}
                  onChange={set('indice')}
                />
              </div>
            </div>
            <div>
              <Label>Período de ajuste</Label>
              <div className="mt-1">
                <ChipGroup
                  options={[
                    { value: 'trimestral', label: 'Trimestral' },
                    { value: 'cuatrimestral', label: 'Cuatrimestral' },
                    { value: 'semestral', label: 'Semestral' },
                    { value: 'anual', label: 'Anual' },
                  ]}
                  value={form.periodoAjuste}
                  onChange={set('periodoAjuste')}
                />
              </div>
            </div>
          </div>

          {/* Opciones */}
          <SectionTitle>Opciones</SectionTitle>
          <Toggle checked={form.incluirSellado} onChange={set('incluirSellado')} label="Incluir cláusula de SELLADO" />
          <Toggle checked={form.incluirSeguro} onChange={set('incluirSeguro')} label="Incluir cláusula de SEGURO DE INCENDIO" />

          {/* Firma */}
          <SectionTitle>Firma</SectionTitle>
          <div className="grid grid-cols-2 gap-x-2 gap-y-2">
            <div>
              <Label>Fecha de firma</Label>
              <Input value={form.fechaFirma} onChange={set('fechaFirma')} type="date" />
            </div>
            <div>
              <Label>Ciudad de firma</Label>
              <Input value={form.ciudadFirma} onChange={set('ciudadFirma')} />
            </div>
          </div>

          <p className="text-[10px] text-white/15 mt-6 text-center">Nuevo borrador (sin guardar)</p>
        </div>
      </div>

      {/* ── Right panel: preview ── */}
      <div className="flex-1 overflow-y-auto bg-stone-200">
        <div className="py-8 px-6">
          <div
            className="bg-white shadow-xl mx-auto"
            style={{ maxWidth: 820, padding: '48px 56px', minHeight: '100vh' }}
            dangerouslySetInnerHTML={{ __html: contractHTML }}
          />
        </div>
      </div>

    </div>
  )
}
