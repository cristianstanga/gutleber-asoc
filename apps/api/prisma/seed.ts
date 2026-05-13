import { PrismaClient, TipoPropiedad, TipoPersona, TipoVinculo, Indice, TipoPago, EstadoPago, Moneda, Canal, TipoMensaje } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // ── Usuarios ───────────────────────────────────────────────────────────────
  const hash1 = await bcrypt.hash('gutleber2026', 10)
  const hash2 = await bcrypt.hash('gutleber2026', 10)

  await prisma.usuario.upsert({
    where: { email: 'cintia@gutleber.com.ar' },
    update: {},
    create: { nombre: 'Cintia Gutleber', email: 'cintia@gutleber.com.ar', password: hash1 },
  })
  await prisma.usuario.upsert({
    where: { email: 'socio@gutleber.com.ar' },
    update: {},
    create: { nombre: 'Socio', email: 'socio@gutleber.com.ar', password: hash2 },
  })

  // ── Personas ───────────────────────────────────────────────────────────────
  const inquilino1 = await prisma.persona.upsert({
    where: { dni: '32541890' },
    update: {},
    create: {
      nombre: 'Marcos', apellido: 'Villalba', dni: '32541890',
      whatsapp: '543764100001', email: 'marcos.villalba@gmail.com', tipo: TipoPersona.INQUILINO,
    },
  })

  const inquilino2 = await prisma.persona.upsert({
    where: { dni: '28963412' },
    update: {},
    create: {
      nombre: 'Laura', apellido: 'Fernández', dni: '28963412',
      whatsapp: '543764100002', email: 'laura.fer@gmail.com', tipo: TipoPersona.INQUILINO,
    },
  })

  // ── 5 Propiedades demo con fotos de Unsplash ───────────────────────────────
  const propsDemoData = [
    {
      direccion: 'San Martín 1234, Centro — Posadas',
      tipo: TipoPropiedad.DEPARTAMENTO,
      superficie: 65,
      enAlquiler: true,
      enVenta: false,
      administrada: true,
      alquilerBase: 280000,
      indiceActual: Indice.ICL,
      descripcion: '2 dormitorios, 1 baño, cocina equipada. Edificio con ascensor y seguridad 24hs. A pasos del centro comercial.',
      fotos: [
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80',
        'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80',
      ],
    },
    {
      direccion: 'Av. Costanera 520, Costanera — Posadas',
      tipo: TipoPropiedad.CASA,
      superficie: 180,
      enAlquiler: false,
      enVenta: true,
      administrada: false,
      valorVenta: 95000,
      descripcion: '3 dormitorios, 2 baños, jardín y piscina. Vista al río Paraná. Cochera doble. Zona residencial exclusiva.',
      fotos: [
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
        'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
        'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
        'https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=800&q=80',
      ],
    },
    {
      direccion: 'Bolívar 780, Microcentro — Posadas',
      tipo: TipoPropiedad.LOCAL,
      superficie: 95,
      enAlquiler: true,
      enVenta: false,
      administrada: true,
      alquilerBase: 450000,
      indiceActual: Indice.IPC,
      descripcion: 'Local comercial en pleno microcentro. Vidriera de 6 metros, baño, depósito trasero. Apto para gastronómico, indumentaria o servicios.',
      fotos: [
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80',
        'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80',
      ],
    },
    {
      direccion: 'Los Lapachos 345, Urquiza — Posadas',
      tipo: TipoPropiedad.DEPARTAMENTO,
      superficie: 45,
      enAlquiler: true,
      enVenta: false,
      administrada: true,
      alquilerBase: 195000,
      indiceActual: Indice.ICL,
      descripcion: 'Monoambiente amplio, totalmente amoblado. Aire frío/calor. A 5 minutos de la universidad. Ideal estudiante o profesional.',
      fotos: [
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
        'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&q=80',
      ],
    },
    {
      direccion: 'Ruta 12 km 4.5, El Alcázar — Posadas',
      tipo: TipoPropiedad.TERRENO,
      superficie: 600,
      enAlquiler: false,
      enVenta: true,
      administrada: false,
      valorVenta: 28000,
      descripcion: 'Terreno en barrio cerrado en valorización. Servicios completos: agua, luz, cloacas, gas. A 10 min del centro. Escritura lista.',
      fotos: [
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80',
        'https://images.unsplash.com/photo-1534430480872-3498386e7856?w=800&q=80',
      ],
    },
  ]

  const props: Record<string, Awaited<ReturnType<typeof prisma.propiedad.create>>> = {}

  for (const demo of propsDemoData) {
    const { fotos, ...propData } = demo
    const existe = await prisma.propiedad.findFirst({ where: { direccion: propData.direccion } })
    let prop
    if (existe) {
      prop = existe
      console.log(`ℹ️  Propiedad ya existe: ${propData.direccion}`)
    } else {
      prop = await prisma.propiedad.create({ data: propData })
      // Crear imágenes
      for (let i = 0; i < fotos.length; i++) {
        await prisma.propiedadImagen.create({
          data: {
            propiedadId: prop.id,
            url: fotos[i],
            nombre: `demo-${prop.id}-foto${i + 1}.jpg`,
            orden: i,
          },
        })
      }
      console.log(`✅ Propiedad creada: ${propData.direccion} (${fotos.length} fotos)`)
    }
    props[propData.direccion] = prop
  }

  // ── Vínculos y pagos demo ──────────────────────────────────────────────────
  const propAlquiler1 = Object.values(props).find(p => p.direccion.includes('San Martín'))
  const propAlquiler2 = Object.values(props).find(p => p.direccion.includes('Los Lapachos'))

  if (propAlquiler1) {
    const existeVinculo = await prisma.vinculo.findFirst({ where: { propiedadId: propAlquiler1.id, personaId: inquilino1.id } })
    if (!existeVinculo) {
      const vinculo1 = await prisma.vinculo.create({
        data: {
          propiedadId: propAlquiler1.id,
          personaId: inquilino1.id,
          tipo: TipoVinculo.ALQUILER,
          fechaInicio: new Date('2024-01-01'),
          alquilerInicial: 180000,
          alquilerActual: 280000,
          indice: Indice.ICL,
          periodicidad: 3,
          proximaActualizacion: new Date('2025-10-01'),
          activo: true,
        },
      })

      const meses = ['ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25']
      const montos = [210000, 230000, 255000, 270000, 280000]
      for (let i = 0; i < meses.length; i++) {
        const venc = new Date(2025, i, 5)
        await prisma.pago.create({
          data: {
            tipo: TipoPago.ALQUILER,
            concepto: `Alquiler ${meses[i]} — ${propAlquiler1.direccion}`,
            monto: montos[i], moneda: Moneda.ARS, periodo: meses[i],
            estado: i < 4 ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
            fechaVencimiento: venc,
            fechaPago: i < 4 ? new Date(venc.getTime() - 86400000) : null,
            comprobanteEnviado: i < 3,
            propiedadId: propAlquiler1.id,
            personaId: inquilino1.id,
            vinculoId: vinculo1.id,
          },
        })
      }
      console.log(`✅ Contrato + 5 pagos: Marcos Villalba ↔ ${propAlquiler1.direccion}`)
    }
  }

  if (propAlquiler2) {
    const existeVinculo2 = await prisma.vinculo.findFirst({ where: { propiedadId: propAlquiler2.id, personaId: inquilino2.id } })
    if (!existeVinculo2) {
      const vinculo2 = await prisma.vinculo.create({
        data: {
          propiedadId: propAlquiler2.id,
          personaId: inquilino2.id,
          tipo: TipoVinculo.ALQUILER,
          fechaInicio: new Date('2023-07-01'),
          alquilerInicial: 120000,
          alquilerActual: 195000,
          indice: Indice.ICL,
          periodicidad: 3,
          proximaActualizacion: new Date('2025-10-01'),
          activo: true,
        },
      })
      const meses = ['ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25']
      const montos = [150000, 160000, 175000, 185000, 195000]
      for (let i = 0; i < meses.length; i++) {
        const venc = new Date(2025, i, 10)
        await prisma.pago.create({
          data: {
            tipo: TipoPago.ALQUILER,
            concepto: `Alquiler ${meses[i]} — ${propAlquiler2.direccion}`,
            monto: montos[i], moneda: Moneda.ARS, periodo: meses[i],
            estado: i < 4 ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
            fechaVencimiento: venc,
            fechaPago: i < 4 ? new Date(venc.getTime() - 86400000) : null,
            comprobanteEnviado: i < 3,
            propiedadId: propAlquiler2.id,
            personaId: inquilino2.id,
            vinculoId: vinculo2.id,
          },
        })
      }
      console.log(`✅ Contrato + 5 pagos: Laura Fernández ↔ ${propAlquiler2.direccion}`)
    }
  }

  console.log('\n🎉 Seed completado.')
  console.log('   → Login: cintia@gutleber.com.ar / gutleber2026')
}

main()
  .catch((e) => { console.error('❌ Seed error:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())
