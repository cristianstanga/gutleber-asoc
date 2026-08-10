import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../index'

const router = Router()

const EMAIL_DEMO = 'demo.propietario@gutleberyasociados.com'

// DELETE /api/seed-demo — limpia todos los datos demo
router.delete('/', async (_req, res) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { email: EMAIL_DEMO }, include: { persona: true } })
    if (!usuario) return res.json({ ok: true, mensaje: 'No había datos demo.' })

    const personaId = usuario.personaId

    // Borrar en orden por FK
    if (personaId) {
      const props = await prisma.propiedad.findMany({ where: { propietarioId: personaId } })
      const propIds = props.map(p => p.id)
      await prisma.visita.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.gasto.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.pago.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.vinculo.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.propiedad.deleteMany({ where: { propietarioId: personaId } })
      const inquilinosDnis = ['30111001','31222002','28333003','33444004','29555005','34666006','27777007']
      await prisma.persona.deleteMany({ where: { dni: { in: inquilinosDnis } } })
    }

    await prisma.usuario.delete({ where: { email: EMAIL_DEMO } })
    if (personaId) await prisma.persona.delete({ where: { id: personaId } }).catch(() => {})

    return res.json({ ok: true, mensaje: 'Datos demo eliminados.' })
  } catch (err: unknown) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

// POST /api/seed-demo — crea datos demo para el cliente propietario
router.post('/', async (_req, res) => {
  try {
    // Limpiar datos demo previos (parciales o completos) antes de recrear
    const usuarioExistente = await prisma.usuario.findUnique({ where: { email: EMAIL_DEMO }, include: { persona: true } })
    if (usuarioExistente?.personaId) {
      const personaId = usuarioExistente.personaId
      const props = await prisma.propiedad.findMany({ where: { propietarioId: personaId } })
      const propIds = props.map(p => p.id)
      await prisma.visita.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.gasto.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.pago.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.vinculo.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.propiedad.deleteMany({ where: { propietarioId: personaId } })
      const inquilinosDnis = ['30111001','31222002','28333003','33444004','29555005','34666006','27777007']
      await prisma.persona.deleteMany({ where: { dni: { in: inquilinosDnis } } })
    }
    if (usuarioExistente) await prisma.usuario.delete({ where: { email: EMAIL_DEMO } })
    if (usuarioExistente?.personaId) await prisma.persona.delete({ where: { id: usuarioExistente.personaId } }).catch(() => {})

    // ─── Persona propietario ────────────────────────────────────────────────
    const propietarioPersona = await prisma.persona.create({
      data: {
        nombre: 'Cristian',
        apellido: 'Stanga',
        dni: '20345678',
        whatsapp: '3764900001',
        email: EMAIL_DEMO,
        tipo: 'PROPIETARIO',
        notas: 'Cliente demo — 7 propiedades en Posadas',
      },
    })

    // ─── Usuario propietario ────────────────────────────────────────────────
    const hash = await bcrypt.hash('Demo2026!', 10)
    await prisma.usuario.create({
      data: {
        nombre: 'Cristian Stanga',
        email: EMAIL_DEMO,
        password: hash,
        rol: 'PROPIETARIO',
        personaId: propietarioPersona.id,
      },
    })

    // ─── 7 Propiedades ──────────────────────────────────────────────────────
    const propData = [
      { direccion: 'Av. Uruguay 1250, Piso 3°B', tipo: 'DEPARTAMENTO' as const, dormitorios: 3, banos: 2, superficie: 85,  alquilerBase: 980000,  indiceActual: 'ICL' as const, barrio: 'Centro'       },
      { direccion: 'San Lorenzo 456, Piso 1°A',  tipo: 'DEPARTAMENTO' as const, dormitorios: 2, banos: 1, superficie: 58,  alquilerBase: 720000,  indiceActual: 'ICL' as const, barrio: 'Centro'       },
      { direccion: 'Bolívar 890',                tipo: 'CASA'         as const, dormitorios: 4, banos: 2, superficie: 160, alquilerBase: 1250000, indiceActual: 'IPC' as const, barrio: 'Villa Sarita'  },
      { direccion: 'Junín 234, Piso 2°C',        tipo: 'DEPARTAMENTO' as const, dormitorios: 2, banos: 1, superficie: 62,  alquilerBase: 750000,  indiceActual: 'ICL' as const, barrio: 'Centro'       },
      { direccion: 'Santa Fe 1567',              tipo: 'CASA'         as const, dormitorios: 3, banos: 2, superficie: 130, alquilerBase: 1100000, indiceActual: 'IPC' as const, barrio: 'Extensión'    },
      { direccion: 'Av. Mitre 789, Piso 2°A',   tipo: 'DEPARTAMENTO' as const, dormitorios: 1, banos: 1, superficie: 42,  alquilerBase: 700000,  indiceActual: 'ICL' as const, barrio: 'Centro'       },
      { direccion: 'Colón 321',                  tipo: 'CASA'         as const, dormitorios: 4, banos: 3, superficie: 200, alquilerBase: 1300000, indiceActual: 'IPC' as const, barrio: 'Chacra 183'   },
    ]

    const propiedades = await Promise.all(
      propData.map(p =>
        prisma.propiedad.create({
          data: {
            ...p,
            enAlquiler: true,
            administrada: true,
            propietarioId: propietarioPersona.id,
            vistas: Math.floor(Math.random() * 80) + 20,
          },
        })
      )
    )

    // ─── 7 Inquilinos + Vínculos + Pagos ───────────────────────────────────
    const inquilinosData = [
      { nombre: 'Lucas',   apellido: 'Herrera',   dni: '30111001', whatsapp: '3764800001' },
      { nombre: 'Ana',     apellido: 'Rodríguez', dni: '31222002', whatsapp: '3764800002' },
      { nombre: 'Martín',  apellido: 'Pérez',     dni: '28333003', whatsapp: '3764800003' },
      { nombre: 'Sofía',   apellido: 'González',  dni: '33444004', whatsapp: '3764800004' },
      { nombre: 'Diego',   apellido: 'Fernández', dni: '29555005', whatsapp: '3764800005' },
      { nombre: 'Laura',   apellido: 'Martínez',  dni: '34666006', whatsapp: '3764800006' },
      { nombre: 'Pablo',   apellido: 'López',     dni: '27777007', whatsapp: '3764800007' },
    ]

    const iniciosContrato = [
      new Date('2025-02-01'), new Date('2025-04-01'), new Date('2025-01-01'),
      new Date('2025-06-01'), new Date('2024-10-01'), new Date('2025-08-01'),
      new Date('2025-03-01'),
    ]

    const mesesParaProxima = [1, 3, 2, 4, 1, 3, 2]

    for (let i = 0; i < 7; i++) {
      const inquilino = await prisma.persona.create({
        data: { ...inquilinosData[i], tipo: 'INQUILINO' },
      })

      const prop = propiedades[i]
      const inicio = iniciosContrato[i]

      const proxima = new Date('2026-08-10')
      proxima.setMonth(proxima.getMonth() + mesesParaProxima[i])
      proxima.setDate(1)

      const vinculo = await prisma.vinculo.create({
        data: {
          propiedadId: prop.id,
          personaId: inquilino.id,
          tipo: 'ALQUILER',
          fechaInicio: inicio,
          fechaFin: new Date(inicio.getFullYear() + 3, inicio.getMonth(), inicio.getDate()),
          duracionMeses: 36,
          alquilerInicial: prop.alquilerBase! * 0.6,
          alquilerActual: prop.alquilerBase,
          indice: prop.indiceActual,
          periodicidad: 3,
          proximaActualizacion: proxima,
          activo: true,
          honorariosPct: 8,
        },
      })

      const mesesPagados = [
        { mes: '2026-05', venc: new Date('2026-05-10'), pago: new Date('2026-05-08') },
        { mes: '2026-06', venc: new Date('2026-06-10'), pago: new Date('2026-06-09') },
        { mes: '2026-07', venc: new Date('2026-07-10'), pago: new Date('2026-07-10') },
      ]

      for (const m of mesesPagados) {
        const monto = prop.alquilerBase!
        const honorarios = monto * (vinculo.honorariosPct / 100)
        await prisma.pago.create({
          data: {
            tipo: 'ALQUILER',
            concepto: `Alquiler ${m.mes}`,
            monto,
            periodo: m.mes,
            estado: 'PAGADO',
            fechaVencimiento: m.venc,
            fechaPago: m.pago,
            formaPago: i % 2 === 0 ? 'Transferencia' : 'Efectivo',
            totalConExtras: monto,
            pagadoAlPropietario: true,
            fechaPagoPropietario: new Date(m.pago.getTime() + 2 * 86400000),
            montoPropietario: monto - honorarios,
            honorariosAplicados: honorarios,
            gastosAplicados: 0,
            propiedadId: prop.id,
            personaId: inquilino.id,
            vinculoId: vinculo.id,
            comprobanteEnviado: true,
          },
        })
      }

      // Agosto 2026: los primeros 3 ya pagaron
      const pagoAgosto = i < 3
      await prisma.pago.create({
        data: {
          tipo: 'ALQUILER',
          concepto: 'Alquiler 2026-08',
          monto: prop.alquilerBase!,
          periodo: '2026-08',
          estado: pagoAgosto ? 'PAGADO' : 'PENDIENTE',
          fechaVencimiento: new Date('2026-08-10'),
          fechaPago: pagoAgosto ? new Date('2026-08-07') : null,
          formaPago: pagoAgosto ? 'Transferencia' : null,
          totalConExtras: prop.alquilerBase!,
          pagadoAlPropietario: false,
          propiedadId: prop.id,
          personaId: inquilino.id,
          vinculoId: vinculo.id,
        },
      })
    }

    // ─── Gastos de reparación ───────────────────────────────────────────────
    const gastosData = [
      { desc: 'Reparación cañería baño',          monto: 45000,  propIdx: 0, estado: 'PENDIENTE' as const },
      { desc: 'Pintura interior completa',         monto: 85000,  propIdx: 2, estado: 'APLICADO'  as const },
      { desc: 'Cambio calefón',                    monto: 120000, propIdx: 4, estado: 'PENDIENTE' as const },
      { desc: 'Reparación instalación eléctrica',  monto: 38000,  propIdx: 6, estado: 'PENDIENTE' as const },
      { desc: 'Impermeabilización terraza',        monto: 95000,  propIdx: 2, estado: 'PENDIENTE' as const },
    ]

    await Promise.all(
      gastosData.map(g =>
        prisma.gasto.create({
          data: {
            descripcion: g.desc,
            monto: g.monto,
            estado: g.estado,
            propiedadId: propiedades[g.propIdx].id,
          },
        })
      )
    )

    // ─── Visitas demo ───────────────────────────────────────────────────────
    const visitasData = [
      { propIdx: 0, nombre: 'Valentina Cruz',  numero: '3764700001', estado: 'CONFIRMADA'           as const, dia: 'miércoles 12/8 a las 10:30' },
      { propIdx: 1, nombre: 'Tomás Sánchez',   numero: '3764700002', estado: 'REALIZADA'            as const, dia: 'lunes 3/8 a las 9:00'       },
      { propIdx: 2, nombre: 'Camila Ríos',     numero: '3764700003', estado: 'REALIZADA'            as const, dia: 'viernes 1/8 a las 14:00'    },
      { propIdx: 4, nombre: 'Ignacio Vargas',  numero: '3764700004', estado: 'PENDIENTE_CONFIRMACION' as const, dia: 'jueves 14/8 a las 11:15' },
      { propIdx: 5, nombre: 'Florencia Díaz',  numero: '3764700005', estado: 'CONFIRMADA'           as const, dia: 'martes 12/8 a las 9:45'     },
    ]

    await Promise.all(
      visitasData.map(v =>
        prisma.visita.create({
          data: {
            propiedadId: propiedades[v.propIdx].id,
            nombreContacto: v.nombre,
            numeroContacto: v.numero,
            fechaPropuesta: v.dia,
            estado: v.estado,
          },
        })
      )
    )

    return res.json({
      ok: true,
      mensaje: '✅ Datos demo creados correctamente.',
      acceso: {
        url: 'https://app.gutleberyasociados.com',
        email: EMAIL_DEMO,
        password: 'Demo2026!',
        rol: 'PROPIETARIO',
        propietario: 'Cristian Stanga',
        propiedades: propiedades.length,
      },
    })
  } catch (err: unknown) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

export default router
