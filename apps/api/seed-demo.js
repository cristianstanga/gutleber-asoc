// Script de datos demo — ejecutar dentro del contenedor
// docker cp seed-demo.js gutleber-gutleber-vblotx-gutleber-api-1:/app/apps/api/seed-demo.js
// docker exec gutleber-gutleber-vblotx-gutleber-api-1 node /app/apps/api/seed-demo.js

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Sembrando datos demo...')

  // ── Propietarios ────────────────────────────────────────────────────────────
  const propietarios = await Promise.all([
    prisma.persona.create({ data: { nombre: 'Juan',     apellido: 'García',     tipo: 'PROPIETARIO', whatsapp: '3764100001', email: 'juan.garcia@email.com' } }),
    prisma.persona.create({ data: { nombre: 'María',    apellido: 'López',      tipo: 'PROPIETARIO', whatsapp: '3764100002', email: 'maria.lopez@email.com' } }),
    prisma.persona.create({ data: { nombre: 'Carlos',   apellido: 'Rodríguez',  tipo: 'PROPIETARIO', whatsapp: '3764100003', email: 'carlos.rodriguez@email.com' } }),
    prisma.persona.create({ data: { nombre: 'Ana',      apellido: 'Martínez',   tipo: 'PROPIETARIO', whatsapp: '3764100004', email: 'ana.martinez@email.com' } }),
    prisma.persona.create({ data: { nombre: 'Roberto',  apellido: 'Fernández',  tipo: 'PROPIETARIO', whatsapp: '3764100005', email: 'roberto.fernandez@email.com' } }),
    prisma.persona.create({ data: { nombre: 'Laura',    apellido: 'González',   tipo: 'PROPIETARIO', whatsapp: '3764100006', email: 'laura.gonzalez@email.com' } }),
  ])
  console.log('✅ 6 propietarios creados')

  // ── Inquilinos ──────────────────────────────────────────────────────────────
  const inquilinos = await Promise.all([
    prisma.persona.create({ data: { nombre: 'Pablo',    apellido: 'Sosa',       tipo: 'INQUILINO', whatsapp: '3764200001' } }),
    prisma.persona.create({ data: { nombre: 'Claudia',  apellido: 'Benítez',    tipo: 'INQUILINO', whatsapp: '3764200002' } }),
    prisma.persona.create({ data: { nombre: 'Diego',    apellido: 'Villalba',   tipo: 'INQUILINO', whatsapp: '3764200003' } }),
    prisma.persona.create({ data: { nombre: 'Natalia',  apellido: 'Ojeda',      tipo: 'INQUILINO', whatsapp: '3764200004' } }),
    prisma.persona.create({ data: { nombre: 'Héctor',   apellido: 'Cabrera',    tipo: 'INQUILINO', whatsapp: '3764200005' } }),
    prisma.persona.create({ data: { nombre: 'Silvana',  apellido: 'Leiva',      tipo: 'INQUILINO', whatsapp: '3764200006' } }),
    prisma.persona.create({ data: { nombre: 'Rodrigo',  apellido: 'Acosta',     tipo: 'INQUILINO', whatsapp: '3764200007' } }),
    prisma.persona.create({ data: { nombre: 'Florencia',apellido: 'Ramírez',    tipo: 'INQUILINO', whatsapp: '3764200008' } }),
    prisma.persona.create({ data: { nombre: 'Marcos',   apellido: 'Giménez',    tipo: 'INQUILINO', whatsapp: '3764200009' } }),
    prisma.persona.create({ data: { nombre: 'Valeria',  apellido: 'Pereyra',    tipo: 'INQUILINO', whatsapp: '3764200010' } }),
  ])
  console.log('✅ 10 inquilinos creados')

  // ── Propiedades ─────────────────────────────────────────────────────────────
  // Juan García → 1 prop
  // María López → 2 props
  // Carlos Rodríguez → 1 prop
  // Ana Martínez → 2 props
  // Roberto Fernández → 2 props
  // Laura González → 2 props
  const props = await Promise.all([
    // Juan García (1)
    prisma.propiedad.create({ data: { direccion: 'Av. Quaranta 1234', tipo: 'CASA', dormitorios: 3, banos: 2, superficie: 120, enAlquiler: true, alquilerBase: 180000, barrio: 'Centro', propietarioId: propietarios[0].id } }),
    // María López (2)
    prisma.propiedad.create({ data: { direccion: 'San Lorenzo 456, 3°B', tipo: 'DEPARTAMENTO', dormitorios: 2, banos: 1, superficie: 65, enAlquiler: true, alquilerBase: 130000, barrio: 'Centro', propietarioId: propietarios[1].id } }),
    prisma.propiedad.create({ data: { direccion: 'Colón 789 PB', tipo: 'LOCAL', superficie: 80, enAlquiler: true, alquilerBase: 220000, barrio: 'Microcentro', propietarioId: propietarios[1].id } }),
    // Carlos Rodríguez (1)
    prisma.propiedad.create({ data: { direccion: 'Mitre 321', tipo: 'CASA', dormitorios: 4, banos: 2, superficie: 180, enAlquiler: true, alquilerBase: 250000, barrio: 'Villa Sarita', propietarioId: propietarios[2].id } }),
    // Ana Martínez (2)
    prisma.propiedad.create({ data: { direccion: 'Junín 654, 2°A', tipo: 'DEPARTAMENTO', dormitorios: 1, banos: 1, superficie: 45, enAlquiler: true, alquilerBase: 95000, barrio: 'Centro', propietarioId: propietarios[3].id } }),
    prisma.propiedad.create({ data: { direccion: 'La Rioja 890', tipo: 'CASA', dormitorios: 3, banos: 1, superficie: 100, enAlquiler: true, alquilerBase: 160000, barrio: 'San Isidro', propietarioId: propietarios[3].id } }),
    // Roberto Fernández (2)
    prisma.propiedad.create({ data: { direccion: 'Av. Roca 2100', tipo: 'DEPARTAMENTO', dormitorios: 2, banos: 1, superficie: 70, enAlquiler: true, alquilerBase: 140000, barrio: 'Bº Liber', propietarioId: propietarios[4].id } }),
    prisma.propiedad.create({ data: { direccion: 'Fleming 430, Of. 5', tipo: 'OFICINA', superficie: 50, enAlquiler: true, alquilerBase: 190000, barrio: 'Microcentro', propietarioId: propietarios[4].id } }),
    // Laura González (2)
    prisma.propiedad.create({ data: { direccion: 'Bolívar 1100', tipo: 'CASA', dormitorios: 2, banos: 1, superficie: 90, enAlquiler: true, alquilerBase: 150000, barrio: 'Bº Ansenuza', propietarioId: propietarios[5].id } }),
    prisma.propiedad.create({ data: { direccion: 'Chacabuco 567, 1°C', tipo: 'DEPARTAMENTO', dormitorios: 1, banos: 1, superficie: 42, enAlquiler: false, enVenta: true, valorVenta: 25000000, barrio: 'Centro', propietarioId: propietarios[5].id } }),
  ])
  console.log('✅ 10 propiedades creadas')

  // ── Vinculos ALQUILER (8 propiedades alquiladas, 2 disponibles) ─────────────
  const hoy = new Date()
  const hace6m = (n) => { const d = new Date(hoy); d.setMonth(d.getMonth() - n); return d }
  const en18m  = (n) => { const d = new Date(hoy); d.setMonth(d.getMonth() + n); return d }

  const vinculos = await Promise.all([
    prisma.vinculo.create({ data: { propiedadId: props[0].id, personaId: inquilinos[0].id, tipo: 'ALQUILER', fechaInicio: hace6m(6), fechaFin: en18m(18), duracionMeses: 24, alquilerInicial: 180000, alquilerActual: 200000, indice: 'ICL', periodicidad: 3, administrado: true, honorariosPct: 8, activo: true, proximaActualizacion: en18m(3) } }),
    prisma.vinculo.create({ data: { propiedadId: props[1].id, personaId: inquilinos[1].id, tipo: 'ALQUILER', fechaInicio: hace6m(4), fechaFin: en18m(20), duracionMeses: 24, alquilerInicial: 130000, alquilerActual: 145000, indice: 'ICL', periodicidad: 3, administrado: true, honorariosPct: 8, activo: true, proximaActualizacion: en18m(2) } }),
    prisma.vinculo.create({ data: { propiedadId: props[2].id, personaId: inquilinos[2].id, tipo: 'ALQUILER', fechaInicio: hace6m(8), fechaFin: en18m(16), duracionMeses: 24, alquilerInicial: 220000, alquilerActual: 260000, indice: 'IPC', periodicidad: 3, administrado: true, honorariosPct: 10, activo: true, proximaActualizacion: en18m(1) } }),
    prisma.vinculo.create({ data: { propiedadId: props[3].id, personaId: inquilinos[3].id, tipo: 'ALQUILER', fechaInicio: hace6m(3), fechaFin: en18m(21), duracionMeses: 24, alquilerInicial: 250000, alquilerActual: 270000, indice: 'ICL', periodicidad: 3, administrado: false, honorariosPct: 0, activo: true, proximaActualizacion: en18m(3) } }),
    prisma.vinculo.create({ data: { propiedadId: props[4].id, personaId: inquilinos[4].id, tipo: 'ALQUILER', fechaInicio: hace6m(5), fechaFin: en18m(19), duracionMeses: 24, alquilerInicial: 95000,  alquilerActual: 108000, indice: 'ICL', periodicidad: 3, administrado: true, honorariosPct: 8, activo: true, proximaActualizacion: en18m(1) } }),
    prisma.vinculo.create({ data: { propiedadId: props[5].id, personaId: inquilinos[5].id, tipo: 'ALQUILER', fechaInicio: hace6m(2), fechaFin: en18m(22), duracionMeses: 24, alquilerInicial: 160000, alquilerActual: 165000, indice: 'ICL', periodicidad: 3, administrado: true, honorariosPct: 8, activo: true, proximaActualizacion: en18m(4) } }),
    prisma.vinculo.create({ data: { propiedadId: props[6].id, personaId: inquilinos[6].id, tipo: 'ALQUILER', fechaInicio: hace6m(10), fechaFin: en18m(14), duracionMeses: 24, alquilerInicial: 140000, alquilerActual: 175000, indice: 'IPC', periodicidad: 3, administrado: true, honorariosPct: 8, activo: true, proximaActualizacion: en18m(2) } }),
    prisma.vinculo.create({ data: { propiedadId: props[7].id, personaId: inquilinos[7].id, tipo: 'ALQUILER', fechaInicio: hace6m(1), fechaFin: en18m(23), duracionMeses: 24, alquilerInicial: 190000, alquilerActual: 192000, indice: 'ICL', periodicidad: 3, administrado: true, honorariosPct: 10, activo: true, proximaActualizacion: en18m(5) } }),
    // props[8] y props[9] sin inquilino (disponibles)
  ])

  // Marcar propiedades como administradas
  await Promise.all(props.slice(0, 8).map((p) => prisma.propiedad.update({ where: { id: p.id }, data: { administrada: true } })))
  console.log('✅ 8 vínculos de alquiler creados')

  // ── Pagos (6 meses por contrato) ────────────────────────────────────────────
  const pagosData = []
  for (let i = 0; i < vinculos.length; i++) {
    const v = vinculos[i]
    for (let m = 5; m >= 0; m--) {
      const venc = new Date(hoy)
      venc.setDate(10)
      venc.setMonth(venc.getMonth() - m)
      const esPasado = m > 0
      const esMora = m === 1 && i % 4 === 0 // alguno en mora
      const estado = esMora ? 'MORA' : esPasado ? 'PAGADO' : 'PENDIENTE'
      const fechaPago = esPasado && !esMora ? new Date(venc.getTime() + 3 * 86400000) : null
      const pagadoProp = esPasado && !esMora && m > 1
      pagosData.push({
        tipo: 'ALQUILER',
        concepto: `Alquiler ${venc.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}`,
        monto: v.alquilerActual,
        moneda: 'ARS',
        estado,
        fechaVencimiento: venc,
        fechaPago,
        pagadoAlPropietario: pagadoProp,
        fechaPagoPropietario: pagadoProp ? new Date(venc.getTime() + 8 * 86400000) : null,
        propiedadId: props[i].id,
        personaId: v.personaId,
        vinculoId: v.id,
      })
    }
  }
  await prisma.pago.createMany({ data: pagosData })
  console.log(`✅ ${pagosData.length} pagos creados`)

  // ── Usuarios para propietarios e inquilinos ─────────────────────────────────
  const pass = await bcrypt.hash('Gutleber2026!', 12)
  await Promise.all([
    ...propietarios.map((p, i) => prisma.usuario.create({ data: { nombre: `${p.nombre} ${p.apellido}`, email: p.email, password: pass, rol: 'PROPIETARIO', personaId: p.id } })),
    prisma.usuario.create({ data: { nombre: 'Pablo Sosa',      email: 'pablo.sosa@email.com',      password: pass, rol: 'INQUILINO', personaId: inquilinos[0].id } }),
    prisma.usuario.create({ data: { nombre: 'Claudia Benítez', email: 'claudia.benitez@email.com',  password: pass, rol: 'INQUILINO', personaId: inquilinos[1].id } }),
    prisma.usuario.create({ data: { nombre: 'Diego Villalba',  email: 'diego.villalba@email.com',   password: pass, rol: 'INQUILINO', personaId: inquilinos[2].id } }),
  ])
  console.log('✅ 6 usuarios propietario + 3 usuarios inquilino creados')
  console.log('')
  console.log('📋 Credenciales de prueba (todos con contraseña: Gutleber2026!)')
  console.log('   Propietario: juan.garcia@email.com')
  console.log('   Propietario: maria.lopez@email.com  (2 propiedades)')
  console.log('   Inquilino:   pablo.sosa@email.com')
  console.log('   Inquilino:   claudia.benitez@email.com')
  console.log('')
  console.log('🎉 Datos demo listos')
}

main()
  .catch((e) => { console.error('❌ Error:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
