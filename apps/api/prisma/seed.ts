import { PrismaClient, TipoPropiedad, TipoPersona, TipoVinculo, Indice, TipoPago, EstadoPago, Moneda, Canal, TipoMensaje } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Iniciando seed...')

  // Usuarios
  const hash1 = await bcrypt.hash('gutleber2026', 10)
  const hash2 = await bcrypt.hash('gutleber2026', 10)

  await prisma.usuario.upsert({
    where: { email: 'cintia@gutleber.com.ar' },
    update: {},
    create: { nombre: 'Cintia', email: 'cintia@gutleber.com.ar', password: hash1 },
  })
  await prisma.usuario.upsert({
    where: { email: 'socio@gutleber.com.ar' },
    update: {},
    create: { nombre: 'Socio', email: 'socio@gutleber.com.ar', password: hash2 },
  })

  // Propiedades
  const prop1 = await prisma.propiedad.create({
    data: {
      direccion: 'Av. Costanera 1250, Posadas',
      tipo: TipoPropiedad.DEPARTAMENTO,
      superficie: 65,
      enAlquiler: true,
      enVenta: false,
      administrada: true,
      alquilerBase: 180000,
      indiceActual: Indice.ICL,
    },
  })

  const prop2 = await prisma.propiedad.create({
    data: {
      direccion: 'Calle San Martín 480, Posadas',
      tipo: TipoPropiedad.CASA,
      superficie: 120,
      enAlquiler: true,
      enVenta: true,
      administrada: true,
      alquilerBase: 250000,
      indiceActual: Indice.IPC,
      valorVenta: 45000,
    },
  })

  const prop3 = await prisma.propiedad.create({
    data: {
      direccion: 'Ruta 12 km 5, Local Comercial, Posadas',
      tipo: TipoPropiedad.LOCAL,
      superficie: 80,
      enAlquiler: false,
      enVenta: true,
      administrada: false,
      valorVenta: 75000,
    },
  })

  // Personas
  const inquilino1 = await prisma.persona.create({
    data: {
      nombre: 'Marcos',
      apellido: 'Villalba',
      dni: '32541890',
      whatsapp: '543764100001',
      email: 'marcos.villalba@gmail.com',
      tipo: TipoPersona.INQUILINO,
    },
  })

  const inquilino2 = await prisma.persona.create({
    data: {
      nombre: 'Laura',
      apellido: 'Fernández',
      dni: '28963412',
      whatsapp: '543764100002',
      email: 'laura.fer@gmail.com',
      tipo: TipoPersona.INQUILINO,
    },
  })

  const propietario1 = await prisma.persona.create({
    data: {
      nombre: 'Roberto',
      apellido: 'Acuña',
      dni: '18345670',
      whatsapp: '543764100003',
      email: 'roberto.acuna@yahoo.com',
      tipo: TipoPersona.PROPIETARIO,
    },
  })

  // Vínculos (contratos activos)
  const hoy = new Date()
  const inicioContrato1 = new Date('2024-01-01')
  const inicioContrato2 = new Date('2023-07-01')

  const vinculo1 = await prisma.vinculo.create({
    data: {
      propiedadId: prop1.id,
      personaId: inquilino1.id,
      tipo: TipoVinculo.ALQUILER,
      fechaInicio: inicioContrato1,
      alquilerInicial: 120000,
      alquilerActual: 180000,
      indice: Indice.ICL,
      periodicidad: 3,
      proximaActualizacion: new Date('2025-07-01'),
      activo: true,
    },
  })

  const vinculo2 = await prisma.vinculo.create({
    data: {
      propiedadId: prop2.id,
      personaId: inquilino2.id,
      tipo: TipoVinculo.ALQUILER,
      fechaInicio: inicioContrato2,
      alquilerInicial: 150000,
      alquilerActual: 250000,
      indice: Indice.IPC,
      periodicidad: 3,
      proximaActualizacion: new Date('2025-10-01'),
      activo: true,
    },
  })

  // Pagos — últimos 5 meses
  const meses = ['ene-25', 'feb-25', 'mar-25', 'abr-25', 'may-25']
  const montos1 = [140000, 150000, 165000, 180000, 180000]
  const montos2 = [180000, 200000, 225000, 250000, 250000]

  for (let i = 0; i < meses.length; i++) {
    const venc1 = new Date(2025, i, 5)
    const venc2 = new Date(2025, i, 10)
    const pagado = i < 4

    await prisma.pago.create({
      data: {
        tipo: TipoPago.ALQUILER,
        concepto: `Alquiler ${meses[i]} — ${prop1.direccion}`,
        monto: montos1[i],
        moneda: Moneda.ARS,
        periodo: meses[i],
        estado: pagado ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
        fechaVencimiento: venc1,
        fechaPago: pagado ? new Date(venc1.getTime() - 86400000) : null,
        comprobanteEnviado: pagado,
        propiedadId: prop1.id,
        personaId: inquilino1.id,
        vinculoId: vinculo1.id,
      },
    })

    await prisma.pago.create({
      data: {
        tipo: TipoPago.ALQUILER,
        concepto: `Alquiler ${meses[i]} — ${prop2.direccion}`,
        monto: montos2[i],
        moneda: Moneda.ARS,
        periodo: meses[i],
        estado: pagado ? EstadoPago.PAGADO : EstadoPago.PENDIENTE,
        fechaVencimiento: venc2,
        fechaPago: pagado ? new Date(venc2.getTime() - 86400000) : null,
        comprobanteEnviado: i < 3,
        propiedadId: prop2.id,
        personaId: inquilino2.id,
        vinculoId: vinculo2.id,
      },
    })
  }

  // Mensajes de inbox
  await prisma.inboxItem.create({
    data: {
      canal: Canal.WHATSAPP,
      mensaje: 'Hola, quería confirmar el pago del mes pasado. ¿Lo recibieron?',
      tipo: TipoMensaje.ENTRANTE,
      personaId: inquilino1.id,
      propiedadId: prop1.id,
      leido: false,
    },
  })

  await prisma.inboxItem.create({
    data: {
      canal: Canal.WHATSAPP,
      mensaje: 'Buen día Marcos, sí lo recibimos. Le enviamos el comprobante.',
      tipo: TipoMensaje.SALIENTE,
      personaId: inquilino1.id,
      propiedadId: prop1.id,
      leido: true,
    },
  })

  await prisma.inboxItem.create({
    data: {
      canal: Canal.WHATSAPP,
      mensaje: 'Buenas tardes, el grifo de la cocina tiene una pérdida.',
      tipo: TipoMensaje.ENTRANTE,
      personaId: inquilino2.id,
      propiedadId: prop2.id,
      leido: false,
    },
  })

  console.log('✅ Seed completo')
  console.log('   → Usuarios: cintia@gutleber.com.ar / socio@gutleber.com.ar (pass: gutleber2026)')
  console.log(`   → Propiedades: ${prop1.direccion}, ${prop2.direccion}, ${prop3.direccion}`)
  console.log(`   → Inquilinos: ${inquilino1.nombre} ${inquilino1.apellido}, ${inquilino2.nombre} ${inquilino2.apellido}`)
  console.log('   → Pagos: 5 meses para cada contrato')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
