/**
 * Generadores de documentos PDF — Gutleber & Asoc.
 *
 * Replica exactamente el formato del sistema actual:
 *   generarReciboPDF()     → recibo al inquilino (original + duplicado en A4)
 *   generarLiquidacionPDF()→ rendición al propietario (original + duplicado en A4)
 *
 * Formato comprobante: 0001-XXXXXXXX
 */

import PDFDocument from 'pdfkit'

// ─── Paleta ───────────────────────────────────────────────────────────────────

const CARBON  = '#2C2C2A'
const PIEDRA  = '#8C7B6B'
const ARENA   = '#C4B09A'
const WHITE   = '#FFFFFF'
const CREMA   = '#F5F0EA'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface ConceptoExtra {
  descripcion: string
  monto: number
  esInmobiliaria?: boolean
}

export interface DatosRecibo {
  nroRecibo?: number | null
  fechaPago: Date
  inquilino: { nombre: string; apellido: string; dni?: string | null; cuit?: string | null; iva?: string | null }
  contrato: { inicio: Date; fin?: Date | null; pago: number; totalPagos: number }
  propiedad: { direccion: string }
  propietario: string
  mes: string
  alquiler: number
  conceptosExtra: ConceptoExtra[]
  totalRecibo: number
  formaPago: string
}

export interface DatosLiquidacion {
  nroLiquidacion?: number | null
  fechaLiquidacion: Date
  propietario: {
    nombre: string; apellido: string
    cuit?: string | null
    iva?: string | null
    direccion?: string | null
  }
  propiedad: {
    codigo?: string | null
    descripcion: string
  }
  mes: string
  pago: number
  totalPagos: number
  totalLiquidacion: number
  alquilerBase?: number
  honorariosPct?: number
  gastos?: { descripcion: string; monto: number }[]
  conceptosInquilino?: { descripcion: string; monto: number; esInmobiliaria?: boolean }[]
  formaPago: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

const formatFecha = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })

const nroFormato = (n?: number | null) =>
  `0001-${String(n || 1).padStart(8, '0')}`

function numEnLetras(n: number): string {
  if (n === 0) return 'cero'
  if (n < 0) return `menos ${numEnLetras(-n)}`
  const unidades = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve',
    'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho',
    'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco',
    'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
  const decenas = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
  const centenas = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos',
    'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
  if (n === 100) return 'cien'
  if (n < 30) return unidades[n]
  if (n < 100) {
    const dec = Math.floor(n / 10), uni = n % 10
    return uni === 0 ? decenas[dec] : `${decenas[dec]} y ${unidades[uni]}`
  }
  if (n < 1000) {
    const cen = Math.floor(n / 100), resto = n % 100
    return resto === 0 ? centenas[cen] : `${centenas[cen]} ${numEnLetras(resto)}`
  }
  if (n < 1000000) {
    const miles = Math.floor(n / 1000), resto = n % 1000
    const ms = miles === 1 ? 'mil' : `${numEnLetras(miles)} mil`
    return resto === 0 ? ms : `${ms} ${numEnLetras(resto)}`
  }
  const mill = Math.floor(n / 1000000), resto = n % 1000000
  const ms = mill === 1 ? 'un millón' : `${numEnLetras(mill)} millones`
  return resto === 0 ? ms : `${ms} ${numEnLetras(resto)}`
}

function enLetras(n: number): string {
  return `Pesos ${numEnLetras(Math.floor(n))}`
}

// ─── Cabecera compartida ──────────────────────────────────────────────────────

function header(
  doc: InstanceType<typeof PDFDocument>,
  titulo: string,
  nro: string,
  fecha: string,
  M: number, y: number, PW: number
) {
  // Banda izquierda carbón con logo
  doc.rect(M, y, 198, 70).fill(CARBON)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(14).text('GUTLEBER', M + 10, y + 8)
  doc.fillColor(ARENA).font('Helvetica').fontSize(7).text('PROPIEDADES', M + 10, y + 26)
  doc.fillColor(CREMA).fontSize(6).text('Av. Mitre 1.782 | Tel:', M + 10, y + 38)
  doc.fillColor(CREMA).fontSize(6).text('(3300) Posadas | Misiones |  |', M + 10, y + 47)
  doc.fillColor(ARENA).fontSize(6).text('Responsable Monotributo', M + 10, y + 57)

  // Badge "X DOCUMENTO NO VALIDO COMO FACTURA"
  const bx = M + 208, by = y + 4
  doc.rect(bx, by, 52, 62).stroke(PIEDRA)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(24).text('X', bx + 11, by + 6)
  doc.fillColor(PIEDRA).font('Helvetica').fontSize(5)
     .text('DOCUMENTO', bx + 4, by + 38)
     .text('NO VALIDO', bx + 6, by + 46)
     .text('COMO FACTURA', bx + 2, by + 54)

  // Título derecha
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(22)
     .text(titulo, PW - M - 145, y + 5)
  doc.font('Helvetica').fontSize(9).fillColor(CARBON)
     .text(nro,   PW - M - 145, y + 33)
     .text(fecha, PW - M - 145, y + 46)
}

// ─── Dibujar recibo (mitad de página) ────────────────────────────────────────

function dibujarRecibo(
  doc: InstanceType<typeof PDFDocument>,
  d: DatosRecibo,
  yBase: number,
  tipo: 'ORIGINAL' | 'DUPLICADO'
) {
  const PW = doc.page.width
  const M  = 36
  const W  = PW - M * 2
  let y = yBase

  // Header
  header(doc, 'RECIBO', nroFormato(d.nroRecibo), formatFecha(d.fechaPago), M, y, PW)
  y += 76

  // Leyenda cobro por cuenta
  doc.rect(M, y, W, 13).fill(CREMA)
  doc.fillColor(CARBON).font('Helvetica').fontSize(6)
     .text('COBRO POR CUENTA Y ORDEN DE TERCEROS, IMPORTE PARA SER ENTREGADO AL PROPIETARIO O A QUIEN CORRESPONDA', M + 3, y + 3)
  y += 16

  // Línea
  doc.rect(M, y, W, 0.5).fill(ARENA); y += 4

  // Cliente
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Cliente:', M, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(9).text(`${d.inquilino.nombre} ${d.inquilino.apellido}`, M + 34, y)
  if (d.inquilino.cuit) {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('C.U.I.T:', M + 340, y)
    doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.inquilino.cuit, M + 370, y)
  }
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Dirección:', M, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('I.V.A:', M + 200, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.inquilino.iva || 'Consumidor Final', M + 222, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Localidad:', M + 340, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text('Posadas', M + 380, y)
  y += 14

  doc.rect(M, y, W, 0.5).fill(ARENA); y += 5

  // Datos contrato
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Contrato', M, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Inicio:', M + 52, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(formatFecha(d.contrato.inicio), M + 72, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Fin:', M + 168, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.contrato.fin ? formatFecha(d.contrato.fin) : '—', M + 180, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Pago:', M + W - 70, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(`${d.contrato.pago} / ${d.contrato.totalPagos}`, M + W - 42, y)
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('En concepto de:', M, y)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9).text('ALQUILER', M + 65, y)
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Dirección inmueble:', M, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.propiedad.direccion, M + 76, y, { width: 300 })
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Propietario:', M, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.propietario, M + 50, y)
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Correspondiente al mes de:', M, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.mes, M + 104, y)
  y += 12

  // ── Tabla de conceptos ────────────────────────────────────────────────────
  const AX = M + W - 104  // x-inicio columna importe
  const AW = 100           // ancho columna importe
  const DX = M + 4         // x-inicio columna descripción
  const DW = AX - DX - 6  // ancho columna descripción

  // Encabezado de tabla
  doc.rect(M, y, W, 14).fill(CARBON)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text('CONCEPTO', DX, y + 3.5)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text('IMPORTE', AX, y + 3.5, { width: AW, align: 'right' })
  y += 14

  // Alquiler base
  doc.rect(M, y, W, 14).fill(WHITE)
  doc.rect(M, y, W, 14).stroke(ARENA)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8.5).text(`Alquiler — ${d.mes}`, DX, y + 3, { width: DW })
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8.5).text(formatARS(d.alquiler), AX, y + 3, { width: AW, align: 'right' })
  y += 14

  // Conceptos extra
  for (const c of d.conceptosExtra.filter(x => x.descripcion?.trim())) {
    const esDesc = c.monto < 0
    doc.rect(M, y, W, 13).fill(esDesc ? '#FFF5F5' : '#F0FDF4')
    doc.rect(M, y, W, 13).stroke(ARENA)
    const prefix = esDesc ? '−  ' : '+  '
    doc.fillColor(CARBON).font('Helvetica').fontSize(8)
       .text(prefix + c.descripcion, DX + 4, y + 2.5, { width: DW - 4 })
    doc.fillColor(esDesc ? '#B91C1C' : '#166534').font('Helvetica-Bold').fontSize(8)
       .text(formatARS(Math.abs(c.monto)), AX, y + 2.5, { width: AW, align: 'right' })
    y += 13
  }

  // Fila total
  doc.rect(M, y, W, 1).fill(CARBON); y += 1
  doc.rect(M, y, W, 18).fill(CREMA)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9).text('TOTAL', DX, y + 5)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(11).text(formatARS(d.totalRecibo), AX, y + 4, { width: AW, align: 'right' })
  y += 18

  // En letras
  y += 6
  doc.rect(M, y, W, 12).fill(CREMA)
  doc.fillColor(PIEDRA).font('Helvetica').fontSize(6.5)
     .text(`Son: ${enLetras(d.totalRecibo)}.`, DX, y + 3, { width: W - 8 })
  y += 16

  // Firma + pie
  doc.moveTo(M, y).lineTo(M + 138, y).strokeColor(CARBON).lineWidth(0.5).stroke()
  doc.fillColor(CARBON).font('Helvetica').fontSize(7).text('Firma y aclaración', M + 14, y + 3)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(7.5).text(`** ${tipo} **`, M + 200, y)
  y += 14
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Forma de pago:', M + 200, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(7.5).text(d.formaPago, M + 262, y)
}

// ─── Dibujar liquidación (mitad de página) ────────────────────────────────────

function dibujarLiquidacion(
  doc: InstanceType<typeof PDFDocument>,
  d: DatosLiquidacion,
  yBase: number,
  tipo: 'ORIGINAL' | 'DUPLICADO'
) {
  const PW = doc.page.width
  const M  = 36
  const W  = PW - M * 2

  const gastos           = d.gastos ?? []
  const conceptosInq     = (d.conceptosInquilino ?? []).filter(c => c.descripcion?.trim())
  const conceptosProp    = conceptosInq.filter(c => !c.esInmobiliaria)
  const alquilerBase     = d.alquilerBase ?? d.totalLiquidacion
  const totalGastos      = gastos.reduce((s, g) => s + g.monto, 0)
  const honorariosPct    = d.honorariosPct ?? 8
  const honorarios       = Math.round(alquilerBase * honorariosPct / 100)
  const extrasParaProp   = conceptosProp.reduce((s, c) => s + c.monto, 0)
  const totalATransferir = (alquilerBase - honorarios) + extrasParaProp - totalGastos

  const AX = M + W - 104
  const AW = 100
  const DX = M + 4
  const DW = AX - DX - 6

  let y = yBase

  // Header
  header(doc, 'LIQUIDACIÓN', nroFormato(d.nroLiquidacion), formatFecha(d.fechaLiquidacion), M, y, PW)
  y += 76

  doc.rect(M, y, W, 0.5).fill(ARENA); y += 4

  // Datos propietario
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Cliente:', M, y)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9)
     .text(`${d.propietario.nombre} ${d.propietario.apellido}`, M + 34, y)
  if (d.propietario.cuit) {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('C.U.I.T:', M + 340, y)
    doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.propietario.cuit, M + 370, y)
  }
  y += 12

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Dirección:', M, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.propietario.direccion || '', M + 40, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('I.V.A:', M + 200, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text(d.propietario.iva || 'Responsable Monotributo', M + 220, y)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Localidad:', M + 340, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8).text('Posadas', M + 380, y)
  y += 16

  // Barra informativa inmueble
  doc.rect(M, y, W, 0.5).fill(ARENA); y += 4
  doc.rect(M, y, W, 14).fill(CREMA)
  const descProp = d.propiedad.codigo
    ? `(${d.propiedad.codigo}) ${d.propiedad.descripcion}`
    : d.propiedad.descripcion
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8)
     .text(`Inmueble: ${descProp}`, DX, y + 3, { width: 310 })
  doc.fillColor(PIEDRA).font('Helvetica').fontSize(7.5)
     .text(`${d.mes}  ·  Pago ${d.pago} / ${d.totalPagos}`, M + W - 180, y + 3.5, { width: 176, align: 'right' })
  y += 18

  // ── Tabla de conceptos ────────────────────────────────────────────────────

  // Encabezado tabla
  doc.rect(M, y, W, 14).fill(CARBON)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text('CONCEPTO', DX, y + 3.5)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(7.5).text('IMPORTE', AX, y + 3.5, { width: AW, align: 'right' })
  y += 14

  // Alquiler base
  doc.rect(M, y, W, 14).fill(WHITE)
  doc.rect(M, y, W, 14).stroke(ARENA)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8.5).text(`Alquiler base — ${d.mes}`, DX, y + 3, { width: DW })
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8.5).text(formatARS(alquilerBase), AX, y + 3, { width: AW, align: 'right' })
  y += 14

  // Extras para propietario
  for (const c of conceptosProp) {
    const esDesc = c.monto < 0
    doc.rect(M, y, W, 13).fill(esDesc ? '#FFF5F5' : '#F0FDF4')
    doc.rect(M, y, W, 13).stroke(ARENA)
    const prefix = esDesc ? '−  ' : '+  '
    doc.fillColor(CARBON).font('Helvetica').fontSize(8)
       .text(prefix + c.descripcion, DX + 4, y + 2.5, { width: DW - 4 })
    doc.fillColor(esDesc ? '#B91C1C' : '#166534').font('Helvetica-Bold').fontSize(8)
       .text(formatARS(Math.abs(c.monto)), AX, y + 2.5, { width: AW, align: 'right' })
    y += 13
  }

  // Subtotal cobrado al inquilino (solo si hay extras)
  if (conceptosProp.length > 0) {
    doc.rect(M, y, W, 0.5).fill(ARENA); y += 0.5
    doc.rect(M, y, W, 13).fill('#EEF2FF')
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5)
       .text('Total cobrado al inquilino', DX, y + 3, { width: DW })
    doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8)
       .text(formatARS(alquilerBase + extrasParaProp), AX, y + 2.5, { width: AW, align: 'right' })
    y += 13
  }

  // ── Deducciones ───────────────────────────────────────────────────────────
  y += 4
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('DEDUCCIONES', DX, y)
  y += 11

  // Honorarios (sobre alquiler base solamente)
  doc.rect(M, y, W, 13).fill('#FFF9E6')
  doc.rect(M, y, W, 13).stroke(ARENA)
  doc.fillColor(CARBON).font('Helvetica').fontSize(8)
     .text(`Honorarios administración (${honorariosPct}%)`, DX + 4, y + 2.5, { width: DW - 4 })
  doc.fillColor('#92400E').font('Helvetica-Bold').fontSize(8)
     .text(`- ${formatARS(honorarios)}`, AX, y + 2.5, { width: AW, align: 'right' })
  y += 13

  // Gastos
  for (const g of gastos) {
    doc.rect(M, y, W, 13).fill('#FFF5F5')
    doc.rect(M, y, W, 13).stroke(ARENA)
    doc.fillColor(CARBON).font('Helvetica').fontSize(8)
       .text(`Gastos: ${g.descripcion}`, DX + 4, y + 2.5, { width: DW - 4 })
    doc.fillColor('#B91C1C').font('Helvetica-Bold').fontSize(8)
       .text(`- ${formatARS(g.monto)}`, AX, y + 2.5, { width: AW, align: 'right' })
    y += 13
  }

  // ── Total a transferir ────────────────────────────────────────────────────
  doc.rect(M, y, W, 1.5).fill(CARBON); y += 1.5
  doc.rect(M, y, W, 19).fill(CARBON)
  doc.fillColor(ARENA).font('Helvetica-Bold').fontSize(9).text('TOTAL A TRANSFERIR', DX, y + 5)
  doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(11)
     .text(formatARS(totalATransferir), AX, y + 4, { width: AW, align: 'right' })
  y += 19

  // ── Firma + pie ───────────────────────────────────────────────────────────
  y += 8
  doc.moveTo(M, y).lineTo(M + 138, y).strokeColor(CARBON).lineWidth(0.5).stroke()
  doc.fillColor(CARBON).font('Helvetica').fontSize(7).text('Firma y aclaración', M + 14, y + 3)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(7.5).text(`-- ${tipo} --`, M + 200, y)
  y += 14
  doc.font('Helvetica').fontSize(7)
     .text(`Total a liquidar: ${enLetras(totalATransferir)}.`, M + 200, y, { width: W - 200 })
  y += 10
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Forma de pago:', M + 200, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(7.5).text(d.formaPago, M + 262, y)
}

// ─── Separador de corte ───────────────────────────────────────────────────────

function separador(doc: InstanceType<typeof PDFDocument>, y: number) {
  const linea = ' ------- '.repeat(28)
  doc.fillColor(PIEDRA).font('Helvetica').fontSize(5.5).text(linea, 0, y, { width: doc.page.width })
}

// ─── Exports principales ──────────────────────────────────────────────────────

/** Recibo al inquilino — A4 con ORIGINAL arriba y DUPLICADO abajo */
export function generarReciboPDF(datos: DatosRecibo): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    dibujarRecibo(doc, datos, 20, 'ORIGINAL')
    separador(doc, 408)
    dibujarRecibo(doc, datos, 420, 'DUPLICADO')
    doc.end()
  })
}

/** Liquidación al propietario — A4 con ORIGINAL arriba y DUPLICADO abajo */
export function generarLiquidacionPDF(datos: DatosLiquidacion): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)
    dibujarLiquidacion(doc, datos, 20, 'ORIGINAL')
    separador(doc, 408)
    dibujarLiquidacion(doc, datos, 420, 'DUPLICADO')
    doc.end()
  })
}

// ─── Resumen mensual para propietario ────────────────────────────────────────

export interface DatosResumenPropietario {
  propietario: { nombre: string; apellido: string }
  propiedad: { direccion: string; tipo: string; barrio?: string | null }
  inquilino?: { nombre: string; apellido: string } | null
  alquilerActual?: number | null
  honorariosPct: number
  flujoCaja: { mes: string; cobrado: number; neto: number; transferido: number }[]
  statsInquilino: { totalPagos: number; pagadosATiempo: number; promedioDiasDemora: number; enMora: number }
  proximoAjuste?: { fecha: Date | string; diasRestantes: number; alquilerActual?: number | null; indice?: string | null } | null
  fechaGeneracion: Date
}

export function generarResumenPropietarioPDF(d: DatosResumenPropietario): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 0, autoFirstPage: true })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const PW = doc.page.width  // 595
    const PH = doc.page.height // 841
    const M = 40
    const W = PW - M * 2
    let y = 30

    // ── Cabecera ──────────────────────────────────────────────────────────────
    doc.rect(M, y, W, 64).fill(CARBON)
    doc.fillColor(WHITE).font('Helvetica-Bold').fontSize(16).text('GUTLEBER', M + 14, y + 10)
    doc.fillColor(ARENA).font('Helvetica').fontSize(7.5).text('& ASOCIADOS  —  INMOBILIARIA BOUTIQUE', M + 14, y + 30)
    doc.fillColor(CREMA).fontSize(6.5).text('Av. Mitre 1.782 · Posadas, Misiones · Argentina', M + 14, y + 42)

    doc.fillColor(ARENA).font('Helvetica-Bold').fontSize(11)
       .text('RESUMEN DE PROPIEDAD', PW - M - 200, y + 10, { width: 190, align: 'right' })
    doc.fillColor(CREMA).font('Helvetica').fontSize(8)
       .text(formatFecha(d.fechaGeneracion), PW - M - 200, y + 28, { width: 190, align: 'right' })
    doc.fillColor(ARENA).fontSize(7)
       .text(`Propietario: ${d.propietario.nombre} ${d.propietario.apellido}`, PW - M - 200, y + 42, { width: 190, align: 'right' })
    y += 74

    // ── Datos de la propiedad ─────────────────────────────────────────────────
    doc.rect(M, y, W, 0.5).fill(ARENA)
    y += 8
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text('PROPIEDAD', M, y)
    y += 12
    doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(11).text(d.propiedad.direccion, M, y)
    const subtitulo = [d.propiedad.tipo, d.propiedad.barrio].filter(Boolean).join(' · ')
    doc.fillColor(PIEDRA).font('Helvetica').fontSize(8).text(subtitulo, M, y + 14)
    if (d.inquilino) {
      doc.fillColor(PIEDRA).font('Helvetica').fontSize(8)
         .text(`Inquilino: ${d.inquilino.nombre} ${d.inquilino.apellido}`, PW - M - 220, y + 4, { width: 210, align: 'right' })
    }
    if (d.alquilerActual) {
      doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8)
         .text(`Alquiler actual: ${formatARS(d.alquilerActual)}`, PW - M - 220, y + 16, { width: 210, align: 'right' })
    }
    y += 34
    doc.rect(M, y, W, 0.5).fill(ARENA)
    y += 12

    // ── Flujo de caja ─────────────────────────────────────────────────────────
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text('FLUJO DE CAJA — ÚLTIMOS MESES', M, y)
    y += 12

    // Cabecera tabla
    const cols = [M, M + 70, M + 160, M + 250, M + 330, M + 400]
    const headers = ['Período', 'Cobrado', `Honorarios (${d.honorariosPct}%)`, 'Neto propietario', 'Transferido', 'Saldo pendiente']
    doc.rect(M, y, W, 16).fill(CREMA)
    headers.forEach((h, i) => {
      doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(7)
         .text(h, cols[i] + 3, y + 4, { width: (cols[i + 1] ?? PW - M) - cols[i] - 6 })
    })
    y += 16

    // Filas
    let totalCobrado = 0, totalNeto = 0, totalTransferido = 0
    d.flujoCaja.forEach((f, idx) => {
      const bg = idx % 2 === 0 ? WHITE : '#F9F6F2'
      const honorarios = f.cobrado > 0 ? +(f.cobrado * d.honorariosPct / 100).toFixed(0) : 0
      const saldo = f.neto - f.transferido
      totalCobrado += f.cobrado; totalNeto += f.neto; totalTransferido += f.transferido
      doc.rect(M, y, W, 15).fill(bg)
      const vals = [f.mes, f.cobrado > 0 ? formatARS(f.cobrado) : '—', f.cobrado > 0 ? formatARS(honorarios) : '—', f.neto > 0 ? formatARS(f.neto) : '—', f.transferido > 0 ? formatARS(f.transferido) : '—', saldo > 0 ? formatARS(saldo) : '—']
      vals.forEach((v, i) => {
        const isNeg = i === 5 && saldo < 0
        doc.fillColor(isNeg ? '#B45309' : CARBON).font('Helvetica').fontSize(7.5)
           .text(v, cols[i] + 3, y + 4, { width: (cols[i + 1] ?? PW - M) - cols[i] - 6 })
      })
      y += 15
    })

    // Total
    const saldoTotal = totalNeto - totalTransferido
    doc.rect(M, y, W, 17).fill(CARBON)
    const totales = ['TOTAL', formatARS(totalCobrado), formatARS(+(totalCobrado * d.honorariosPct / 100).toFixed(0)), formatARS(totalNeto), formatARS(totalTransferido), formatARS(saldoTotal)]
    totales.forEach((v, i) => {
      doc.fillColor(i === 5 && saldoTotal > 0 ? '#A3E635' : ARENA).font('Helvetica-Bold').fontSize(7.5)
         .text(v, cols[i] + 3, y + 5, { width: (cols[i + 1] ?? PW - M) - cols[i] - 6 })
    })
    y += 24

    // ── Stats del inquilino ───────────────────────────────────────────────────
    y += 8
    doc.rect(M, y, W, 0.5).fill(ARENA)
    y += 10
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text('COMPORTAMIENTO DEL INQUILINO', M, y)
    y += 12

    const pctATiempo = d.statsInquilino.totalPagos
      ? +((d.statsInquilino.pagadosATiempo / d.statsInquilino.totalPagos) * 100).toFixed(0)
      : 0

    const statBoxes = [
      { label: 'Pagos a tiempo', valor: `${pctATiempo}%` },
      { label: 'Demora promedio', valor: `${d.statsInquilino.promedioDiasDemora} días` },
      { label: 'Pagos registrados', valor: `${d.statsInquilino.totalPagos}` },
      { label: 'En mora actualmente', valor: `${d.statsInquilino.enMora}` },
    ]
    const bw = W / 4
    statBoxes.forEach((s, i) => {
      const bx = M + i * bw
      doc.rect(bx, y, bw - 4, 38).fill(CREMA)
      doc.fillColor(PIEDRA).font('Helvetica').fontSize(7).text(s.label, bx + 6, y + 6, { width: bw - 16 })
      doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(14).text(s.valor, bx + 6, y + 16, { width: bw - 16 })
    })
    y += 48

    // ── Próximo ajuste ────────────────────────────────────────────────────────
    if (d.proximoAjuste) {
      y += 4
      doc.rect(M, y, W, 0.5).fill(ARENA)
      y += 10
      doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text('PRÓXIMO AJUSTE DE ALQUILER', M, y)
      y += 12
      doc.rect(M, y, W, 32).fill(CREMA)
      const pa = d.proximoAjuste
      const fechaAjuste = pa.fecha instanceof Date ? formatFecha(pa.fecha) : new Date(pa.fecha).toLocaleDateString('es-AR')
      doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9)
         .text(`Fecha: ${fechaAjuste}  ·  En ${pa.diasRestantes} días`, M + 10, y + 8)
      if (pa.alquilerActual) {
        doc.fillColor(PIEDRA).font('Helvetica').fontSize(8)
           .text(`Alquiler actual: ${formatARS(pa.alquilerActual)}  ·  Índice: ${pa.indice ?? 'ICL'}`, M + 10, y + 20)
      }
      y += 40
    }

    // ── Pie de página ─────────────────────────────────────────────────────────
    doc.rect(M, PH - 38, W, 0.5).fill(ARENA)
    doc.fillColor(PIEDRA).font('Helvetica').fontSize(6.5)
       .text('Gutleber & Asociados — Gestión · Inversión · Patrimonio — Posadas, Misiones — Argentina', M, PH - 28, { width: W, align: 'center' })
    doc.fillColor(ARENA).fontSize(6)
       .text('Documento informativo. No válido como comprobante fiscal.', M, PH - 18, { width: W, align: 'center' })

    doc.end()
  })
}
