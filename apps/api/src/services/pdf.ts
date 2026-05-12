import PDFDocument from 'pdfkit'

// Paleta de marca
const CARBON = '#2C2C2A'
const PIEDRA = '#8C7B6B'
const ARENA = '#C4B09A'
const CREMA = '#F0E8DC'

interface PagoConRelaciones {
  id: string
  concepto: string
  monto: number
  moneda: string
  periodo?: string | null
  estado: string
  fechaVencimiento: Date
  fechaPago?: Date | null
  tipo: string
  persona?: { nombre: string; apellido: string; dni?: string | null } | null
  propiedad?: { direccion: string } | null
}

export function generarReciboPDF(pago: PagoConRelaciones) {
  const doc = new PDFDocument({ size: 'A5', margin: 40 })

  const formatMoney = (n: number) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

  const formatDate = (d: Date | null | undefined) =>
    d ? new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  // ── Header ───────────────────────────────────────────────────────────────
  doc.rect(0, 0, doc.page.width, 90).fill(CARBON)

  doc.fillColor('white').font('Helvetica-Bold').fontSize(18).text('GUTLEBER & ASOC.', 40, 22)
  doc.fillColor(ARENA).font('Helvetica').fontSize(8)
    .text('GESTIÓN · INVERSIÓN · PATRIMONIO', 40, 44)

  doc.fillColor(PIEDRA).fontSize(9).text(`Posadas, Misiones — Argentina`, 40, 58)

  // ── Título Recibo ────────────────────────────────────────────────────────
  doc.rect(0, 90, doc.page.width, 32).fill(PIEDRA)
  doc.fillColor('white').font('Helvetica-Bold').fontSize(13)
    .text('COMPROBANTE DE PAGO', 40, 100)

  // Número de comprobante
  doc.fillColor(CARBON).fontSize(9).font('Helvetica')
    .text(`N° ${pago.id.slice(-8).toUpperCase()}`, doc.page.width - 140, 100)

  // ── Cuerpo ───────────────────────────────────────────────────────────────
  let y = 140

  const field = (label: string, value: string) => {
    doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(8).text(label.toUpperCase(), 40, y)
    doc.fillColor(CARBON).font('Helvetica').fontSize(10).text(value, 40, y + 12)
    y += 36
  }

  field('Inquilino', `${pago.persona?.nombre || ''} ${pago.persona?.apellido || ''}`)
  if (pago.persona?.dni) field('DNI', pago.persona.dni)
  field('Propiedad', pago.propiedad?.direccion || '—')
  field('Concepto', pago.concepto)
  field('Período', pago.periodo || '—')
  field('Fecha de Vencimiento', formatDate(pago.fechaVencimiento))
  if (pago.fechaPago) field('Fecha de Pago', formatDate(pago.fechaPago))

  // ── Total ────────────────────────────────────────────────────────────────
  y += 10
  doc.rect(30, y, doc.page.width - 60, 44).fill(CREMA)
  doc.rect(30, y, doc.page.width - 60, 44).stroke(ARENA)

  doc.fillColor(PIEDRA).font('Helvetica-Bold').fontSize(10).text('TOTAL ABONADO', 50, y + 8)
  const montoStr = pago.moneda === 'USD'
    ? `USD ${pago.monto.toLocaleString('es-AR')}`
    : formatMoney(pago.monto)
  doc.fillColor(CARBON).font('Helvetica-Bold').fontSize(16).text(montoStr, 50, y + 22)

  y += 60

  // Estado
  const estadoColor = pago.estado === 'PAGADO' ? '#2D6A4F' : '#C0392B'
  doc.rect(30, y, 80, 20).fill(estadoColor)
  doc.fillColor('white').font('Helvetica-Bold').fontSize(9).text(pago.estado, 35, y + 5)

  // ── Footer ───────────────────────────────────────────────────────────────
  const footerY = doc.page.height - 50
  doc.rect(0, footerY, doc.page.width, 50).fill(CARBON)
  doc.fillColor(ARENA).font('Helvetica').fontSize(7)
    .text('Este comprobante fue generado por el sistema de gestión de Gutleber & Asoc.', 40, footerY + 10, { align: 'center', width: doc.page.width - 80 })
  doc.fillColor(PIEDRA).fontSize(7)
    .text(`Generado el ${new Date().toLocaleDateString('es-AR')}`, 40, footerY + 24, { align: 'center', width: doc.page.width - 80 })

  doc.end()
  return doc
}
