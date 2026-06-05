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
  honorariosPct?: number
  gastos?: { descripcion: string; monto: number }[]
  conceptosInquilino?: { descripcion: string; monto: number }[]
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
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Alquiler:', M + 310, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(9).text(formatARS(d.alquiler), M + 346, y)
  y += 14

  // Otros conceptos
  if (d.conceptosExtra.length > 0) {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Otros conceptos:', M + 150, y); y += 10
    for (const c of d.conceptosExtra) {
      doc.fillColor(CARBON).font('Helvetica').fontSize(7.5)
         .text(c.descripcion, M + 162, y)
         .text(formatARS(c.monto), M + W - 2, y, { width: 80, align: 'right' })
      y += 10
    }
  }
  y += 12

  // Firma + total (debajo a la derecha)
  doc.moveTo(M, y).lineTo(M + 138, y).strokeColor(CARBON).lineWidth(0.5).stroke()
  doc.fillColor(CARBON).font('Helvetica').fontSize(7).text('Firma y aclaración', M + 14, y + 3)

  doc.rect(M + W - 158, y - 8, 158, 36).fill(CREMA)
  doc.rect(M + W - 158, y - 8, 158, 36).stroke(ARENA)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text('Total Recibo:', M + W - 152, y - 4)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(12)
     .text(formatARS(d.totalRecibo), M + W - 152, y + 8)
  y += 28

  // Pie
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(7.5).text(`** ${tipo} **`, M, y)
  doc.font('Helvetica').fontSize(7).text(`Recibi(mos) la suma de: ${enLetras(d.totalRecibo)}.`, M + 42, y)
  y += 10
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Forma de pago:', M + 42, y)
  doc.fillColor(CARBON).font('Helvetica').fontSize(7.5).text(d.formaPago, M + 100, y)
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
  const conceptosInq     = d.conceptosInquilino ?? []
  const totalGastos      = gastos.reduce((s, g) => s + g.monto, 0)
  const honorariosPct    = d.honorariosPct ?? 8
  const honorarios       = Math.round((d.totalLiquidacion - totalGastos) * honorariosPct / 100)
  const totalPagado      = d.totalLiquidacion - totalGastos - honorarios

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
  y += 14

  // Tabla inmueble/detalles/importe
  doc.rect(M, y, W, 14).fill(CREMA)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(8)
     .text('Inmueble', M + 4, y + 3)
     .text('Detalles', M + 270, y + 3)
     .text('Importe', M + W - 58, y + 3)
  doc.rect(M, y + 13, W, 0.5).fill(ARENA)
  y += 17

  const descProp = d.propiedad.codigo
    ? `(${d.propiedad.codigo}) ${d.propiedad.descripcion}`
    : d.propiedad.descripcion
  doc.fillColor(CARBON).font('Helvetica').fontSize(7.5)
     .text(descProp, M + 4, y, { width: 245 })
  doc.text(`${d.mes} [ pago ${d.pago} / ${d.totalPagos} ]`, M + 270, y, { width: 140 })
  doc.font('Helvetica-Bold').fontSize(8.5)
     .text(formatARS(d.totalLiquidacion), M + W - 2, y, { width: 70, align: 'right' })
  y += 14

  // Desglose conceptos cobrados al inquilino (si hay)
  if (conceptosInq.length > 0) {
    const montoBase = d.totalLiquidacion - conceptosInq.reduce((s, c) => s + c.monto, 0)
    doc.fillColor(PIEDRA).font('Helvetica').fontSize(6.5)
       .text(`  Alquiler base: ${formatARS(montoBase)}`, M + 4, y)
    y += 8
    for (const c of conceptosInq) {
      const signo = c.monto < 0 ? '−' : '+'
      doc.fillColor(PIEDRA).font('Helvetica').fontSize(6.5)
         .text(`  ${signo} ${c.descripcion}: ${formatARS(Math.abs(c.monto))}`, M + 4, y)
      y += 7
    }
    y += 4
  } else {
    y += 38
  }

  // Firma
  const firmaY = yBase + 255
  doc.moveTo(M, firmaY).lineTo(M + 138, firmaY).strokeColor(CARBON).lineWidth(0.5).stroke()
  doc.fillColor(CARBON).font('Helvetica').fontSize(7).text('Firma y aclaración', M + 14, firmaY + 3)

  // Gastos variables (izquierda, debajo de la tabla)
  if (gastos.length > 0) {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Gastos descontados:', M + 4, y)
    y += 10
    for (const g of gastos) {
      doc.fillColor(CARBON).font('Helvetica').fontSize(7.5).text(`• ${g.descripcion}`, M + 10, y)
      doc.text(`- ${formatARS(g.monto)}`, M + W - 2, y, { width: 80, align: 'right' })
      y += 9
    }
    y += 4
  }

  // Totales (abajo derecha)
  const rowCount = 2 + (gastos.length > 0 ? 1 : 0)
  const tw = 160, tx = M + W - tw
  const totH = 18 + rowCount * 16 + 6
  const totY = yBase + 220
  doc.rect(tx, totY, tw, totH).fill(CREMA)
  doc.rect(tx, totY, tw, totH).stroke(ARENA)

  let ty = totY + 6
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8.5).text('Total Liquidación:', tx + 6, ty)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9)
     .text(formatARS(d.totalLiquidacion), tx + 6, ty, { width: tw - 10, align: 'right' })
  ty += 16

  if (gastos.length > 0) {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8.5).text(`Gastos (${gastos.length}):`, tx + 6, ty)
    doc.fillColor(CARBON).font('Helvetica').fontSize(9)
       .text(`- ${formatARS(totalGastos)}`, tx + 6, ty, { width: tw - 10, align: 'right' })
    ty += 16
  }

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8.5).text(`Honorarios ${honorariosPct}%:`, tx + 6, ty)
  doc.fillColor(CARBON).font('Helvetica').fontSize(9)
     .text(`- ${formatARS(honorarios)}`, tx + 6, ty, { width: tw - 10, align: 'right' })
  ty += 14

  doc.rect(tx + 4, ty, tw - 8, 0.5).fill(CARBON)
  ty += 4

  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(9.5).text('Total Pagado:', tx + 6, ty)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(10)
     .text(formatARS(totalPagado), tx + 6, ty, { width: tw - 10, align: 'right' })

  // Pie
  const pieY = yBase + 285
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(7.5).text(`-- ${tipo} --`, M, pieY)
  doc.font('Helvetica').fontSize(7)
     .text(`Total a liquidar:  ${enLetras(totalPagado)}.`, M + 40, pieY)
  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(7.5).text('Forma de pago:', M + 40, pieY + 10)
  doc.fillColor(CARBON).font('Helvetica').fontSize(7.5).text(d.formaPago, M + 100, pieY + 10)
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
