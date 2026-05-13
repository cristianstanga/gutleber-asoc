/**
 * Generador de contratos de locación en PDF.
 * Usa pdfkit para generar un documento profesional pre-llenado
 * con los datos del vínculo, persona e inmueble.
 *
 * Gutleber & Asoc. — Posadas, Misiones
 */

import PDFDocument from 'pdfkit'

// ─── Tipos de entrada ────────────────────────────────────────────────────────

export interface DatosContrato {
  // Propiedad
  propiedad: {
    direccion: string
    tipo: string
    superficie?: number | null
    dormitorios?: number | null
    banos?: number | null
    piso?: string | null
    cochera?: boolean
  }
  // Inquilino / locatario
  inquilino: {
    nombre: string
    apellido: string
    dni?: string | null
    whatsapp?: string | null
    email?: string | null
  }
  // Propietario / locador (opcional — puede ser blank)
  propietario?: {
    nombre: string
    apellido: string
    dni?: string | null
  } | null
  // Condiciones del contrato
  contrato: {
    fechaInicio: Date
    fechaFin?: Date | null
    alquilerInicial: number
    alquilerActual: number
    indice?: string | null
    periodicidad?: number
    notas?: string | null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatARS = (n: number) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(n)

const formatFecha = (d: Date) =>
  d.toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' })

const TIPO_LABEL: Record<string, string> = {
  CASA: 'casa', DEPARTAMENTO: 'departamento', LOCAL: 'local comercial',
  TERRENO: 'terreno', OFICINA: 'oficina',
}

const INDICE_LABEL: Record<string, string> = {
  ICL: 'ICL (Índice para Contratos de Locación, BCRA)',
  IPC: 'IPC (Índice de Precios al Consumidor, INDEC)',
  UVA: 'UVA (Unidades de Valor Adquisitivo, BCRA)',
}

// ─── Generador PDF ────────────────────────────────────────────────────────────

export function generarContratoPDF(datos: DatosContrato): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 60 })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    doc.on('end', () => resolve(Buffer.concat(chunks)))
    doc.on('error', reject)

    const { propiedad, inquilino, propietario, contrato } = datos
    const W = doc.page.width - 120  // ancho útil

    // ── Paleta ────────────────────────────────────────────────────────────────
    const CARBON  = '#2C2C2A'
    const PIEDRA  = '#8C7B6B'
    const ARENA   = '#C4B09A'
    const CREMA   = '#F0E8DC'

    // ── Header ────────────────────────────────────────────────────────────────
    // Banda superior de color
    doc.rect(0, 0, doc.page.width, 72).fill(CARBON)

    doc.fillColor('#FFFFFF').fontSize(18).font('Helvetica-Bold')
       .text('GUTLEBER & ASOC.', 60, 20)

    doc.fillColor(ARENA).fontSize(8).font('Helvetica')
       .text('GESTIÓN · INVERSIÓN · PATRIMONIO', 60, 44)
       .text('Posadas, Misiones  |  gutleber.com.ar', 0, 44, { align: 'right', width: doc.page.width - 60 })

    doc.y = 100

    // ── Título del contrato ───────────────────────────────────────────────────
    doc.fillColor(CARBON).fontSize(16).font('Helvetica-Bold')
       .text('CONTRATO DE LOCACIÓN DE INMUEBLE', { align: 'center' })
    doc.moveDown(0.3)

    const ciudadFecha = `En la ciudad de Posadas, provincia de Misiones, a los ${formatFecha(new Date())},`
    doc.fillColor(PIEDRA).fontSize(9).font('Helvetica')
       .text(ciudadFecha, { align: 'center' })
    doc.moveDown(1.2)

    // ── Línea separadora ──────────────────────────────────────────────────────
    function hline(color = ARENA) {
      doc.moveTo(60, doc.y).lineTo(60 + W, doc.y).strokeColor(color).lineWidth(0.5).stroke()
      doc.moveDown(0.6)
    }

    // ── Sección helper ────────────────────────────────────────────────────────
    function seccion(titulo: string) {
      doc.moveDown(0.5)
      doc.rect(60, doc.y, W, 18).fill(CREMA)
      doc.fillColor(CARBON).fontSize(9).font('Helvetica-Bold')
         .text(titulo.toUpperCase(), 68, doc.y + 4)
      doc.moveDown(1.2)
    }

    function campo(etiqueta: string, valor: string) {
      doc.fillColor(PIEDRA).fontSize(8).font('Helvetica-Bold')
         .text(etiqueta + ': ', { continued: true })
      doc.fillColor(CARBON).fontSize(9).font('Helvetica')
         .text(valor || '___________________________')
    }

    // ── 1. PARTES ─────────────────────────────────────────────────────────────
    seccion('1. Las Partes')

    doc.fillColor(CARBON).fontSize(9).font('Helvetica-Bold').text('LOCADOR / PROPIETARIO:')
    doc.moveDown(0.2)
    campo('Nombre y apellido', propietario ? `${propietario.nombre} ${propietario.apellido}` : '')
    doc.moveDown(0.2)
    campo('DNI / CUIT', propietario?.dni || '')
    doc.moveDown(0.6)

    doc.fillColor(CARBON).fontSize(9).font('Helvetica-Bold').text('LOCATARIO / INQUILINO:')
    doc.moveDown(0.2)
    campo('Nombre y apellido', `${inquilino.nombre} ${inquilino.apellido}`)
    doc.moveDown(0.2)
    campo('DNI / CUIT', inquilino.dni || '')
    doc.moveDown(0.2)
    campo('Teléfono / WhatsApp', inquilino.whatsapp ? `+${inquilino.whatsapp}` : '')
    doc.moveDown(0.2)
    campo('E-mail', inquilino.email || '')

    // ── 2. OBJETO ─────────────────────────────────────────────────────────────
    seccion('2. Objeto del Contrato')

    const tipoStr = TIPO_LABEL[propiedad.tipo] || propiedad.tipo
    const characts: string[] = []
    if (propiedad.superficie) characts.push(`superficie: ${propiedad.superficie} m²`)
    if (propiedad.dormitorios) characts.push(`${propiedad.dormitorios} dormitorio${propiedad.dormitorios > 1 ? 's' : ''}`)
    if (propiedad.banos) characts.push(`${propiedad.banos} baño${propiedad.banos > 1 ? 's' : ''}`)
    if (propiedad.cochera) characts.push('cochera')
    if (propiedad.piso) characts.push(`piso/unidad: ${propiedad.piso}`)
    const charactStr = characts.length > 0 ? ` (${characts.join(', ')})` : ''

    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text(`El LOCADOR da en locación al LOCATARIO, el siguiente inmueble: `)
    doc.moveDown(0.2)
    doc.fillColor(CARBON).fontSize(10).font('Helvetica-Bold')
       .text(`${tipoStr.toUpperCase()} — ${propiedad.direccion}${charactStr}`, { indent: 20 })
    doc.moveDown(0.3)
    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text('ubicado en la ciudad de Posadas, provincia de Misiones, Argentina.')

    // ── 3. PLAZO ──────────────────────────────────────────────────────────────
    seccion('3. Plazo')

    const meses = contrato.fechaFin
      ? Math.round((contrato.fechaFin.getTime() - contrato.fechaInicio.getTime()) / (30.44 * 24 * 60 * 60 * 1000))
      : 24
    campo('Inicio', formatFecha(contrato.fechaInicio))
    doc.moveDown(0.2)
    campo('Vencimiento', contrato.fechaFin ? formatFecha(contrato.fechaFin) : `${meses} meses desde el inicio`)
    doc.moveDown(0.2)
    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text(`El plazo de locación es de ${meses} (${numEnLetras(meses)}) meses.`)

    // ── 4. PRECIO Y AJUSTE ────────────────────────────────────────────────────
    seccion('4. Precio y Ajuste')

    campo('Alquiler inicial', formatARS(contrato.alquilerInicial))
    doc.moveDown(0.2)
    campo('Alquiler actual', formatARS(contrato.alquilerActual))
    doc.moveDown(0.3)

    if (contrato.indice) {
      doc.fillColor(CARBON).fontSize(9).font('Helvetica')
         .text(`El precio se ajustará cada ${contrato.periodicidad || 3} meses según el índice `)
         .text(INDICE_LABEL[contrato.indice] || contrato.indice, { indent: 0 })
    } else {
      doc.fillColor(CARBON).fontSize(9).font('Helvetica')
         .text('No se establece índice de ajuste automático.')
    }
    doc.moveDown(0.3)
    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text('El pago se realizará dentro de los primeros cinco (5) días hábiles de cada mes, en el domicilio de la inmobiliaria o por transferencia bancaria.')

    // ── 5. DESTINO ────────────────────────────────────────────────────────────
    seccion('5. Destino')

    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text('El inmueble se destina exclusivamente a uso habitacional / comercial (según corresponda). Queda expresamente prohibida la sublocación total o parcial sin autorización escrita del LOCADOR.')

    // ── 6. OBLIGACIONES ───────────────────────────────────────────────────────
    seccion('6. Obligaciones del Locatario')

    const obligaciones = [
      'Abonar el alquiler puntualmente dentro del plazo estipulado.',
      'Conservar el inmueble en buen estado y realizar las reparaciones menores a su cargo.',
      'No realizar modificaciones estructurales sin autorización escrita del LOCADOR.',
      'Permitir el acceso del LOCADOR o de la Inmobiliaria para verificar el estado del inmueble, con aviso previo de 48 horas.',
      'Abonar los servicios (luz, gas, agua, expensas) en tiempo y forma.',
      'Entregar el inmueble al vencimiento del contrato en las mismas condiciones en que fue recibido.',
    ]

    obligaciones.forEach((o, i) => {
      doc.fillColor(CARBON).fontSize(9).font('Helvetica')
         .text(`${i + 1}. ${o}`, { indent: 10 })
      doc.moveDown(0.15)
    })

    // ── 7. NOTAS / CLÁUSULAS PARTICULARES ────────────────────────────────────
    if (contrato.notas) {
      seccion('7. Cláusulas Particulares')
      doc.fillColor(CARBON).fontSize(9).font('Helvetica')
         .text(contrato.notas)
    }

    // ── 8. JURISDICCIÓN ───────────────────────────────────────────────────────
    seccion(contrato.notas ? '8. Jurisdicción' : '7. Jurisdicción')

    doc.fillColor(CARBON).fontSize(9).font('Helvetica')
       .text('Para todos los efectos legales derivados del presente contrato, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la ciudad de Posadas, Misiones, Argentina, renunciando a cualquier otro fuero que pudiera corresponder.')

    // ── Firmas ────────────────────────────────────────────────────────────────
    doc.moveDown(1.5)
    hline(ARENA)
    doc.moveDown(0.5)

    doc.fillColor(CARBON).fontSize(9).font('Helvetica-Bold')
       .text('FIRMAS DE LAS PARTES', { align: 'center' })
    doc.moveDown(1.5)

    // Tres columnas de firma
    const colW = W / 3
    const firmaY = doc.y

    function firmaCol(x: number, nombre: string, rol: string) {
      doc.moveTo(x + 10, firmaY).lineTo(x + colW - 10, firmaY)
         .strokeColor(CARBON).lineWidth(0.5).stroke()
      doc.fillColor(CARBON).fontSize(8).font('Helvetica-Bold')
         .text(nombre, x, firmaY + 6, { width: colW, align: 'center' })
      doc.fillColor(PIEDRA).fontSize(7).font('Helvetica')
         .text(rol, x, firmaY + 18, { width: colW, align: 'center' })
    }

    const locadorNombre = propietario ? `${propietario.nombre} ${propietario.apellido}` : 'LOCADOR'
    firmaCol(60, locadorNombre, 'Locador / Propietario')
    firmaCol(60 + colW, `${inquilino.nombre} ${inquilino.apellido}`, 'Locatario / Inquilino')
    firmaCol(60 + colW * 2, 'Gutleber & Asoc.', 'Inmobiliaria Interviniente')

    // ── Footer ────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 40
    doc.rect(0, footerY - 8, doc.page.width, 48).fill('#F5F0EA')
    doc.fillColor(PIEDRA).fontSize(7).font('Helvetica')
       .text('Gutleber & Asoc. — Posadas, Misiones, Argentina — gutleber.com.ar', 60, footerY)
       .text(`Generado el ${formatFecha(new Date())}`, 0, footerY, { align: 'right', width: doc.page.width - 60 })

    doc.end()
  })
}

// ─── Número en letras (simple, hasta 60) ─────────────────────────────────────

function numEnLetras(n: number): string {
  const tabla: Record<number, string> = {
    1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco',
    6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
    11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince',
    16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
    20: 'veinte', 24: 'veinticuatro', 36: 'treinta y seis', 48: 'cuarenta y ocho',
    60: 'sesenta',
  }
  return tabla[n] || n.toString()
}
