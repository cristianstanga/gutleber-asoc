import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { prisma } from '../index'

const router = Router()

const EMAIL_ADMIN   = 'cintiamgut@gmail.com'
const EMAIL_PROP    = 'cristianstanga@gmail.com'

// POST /api/seed-real — crea usuarios reales + 8 propiedades Stanganelli
// Idempotente: limpia y recrea si ya existen.
router.post('/', async (_req, res) => {
  try {
    // ── Limpiar datos demo (si existen) ─────────────────────────────────────
    const EMAIL_DEMO = 'demo.propietario@gutleberyasociados.com'
    const demoUser = await prisma.usuario.findUnique({ where: { email: EMAIL_DEMO }, include: { persona: true } })
    if (demoUser?.personaId) {
      const demoProps = await prisma.propiedad.findMany({ where: { propietarioId: demoUser.personaId } })
      const demoPropIds = demoProps.map(p => p.id)
      await prisma.visita.deleteMany({ where: { propiedadId: { in: demoPropIds } } })
      await prisma.gasto.deleteMany({ where: { propiedadId: { in: demoPropIds } } })
      await prisma.pago.deleteMany({ where: { propiedadId: { in: demoPropIds } } })
      await prisma.vinculo.deleteMany({ where: { propiedadId: { in: demoPropIds } } })
      await prisma.propiedad.deleteMany({ where: { propietarioId: demoUser.personaId } })
      const dnisDemo = ['30111001','31222002','28333003','33444004','29555005','34666006','27777007']
      await prisma.persona.deleteMany({ where: { dni: { in: dnisDemo } } })
    }
    if (demoUser) await prisma.usuario.delete({ where: { email: EMAIL_DEMO } })
    if (demoUser?.personaId) await prisma.persona.delete({ where: { id: demoUser.personaId } }).catch(() => {})

    // ── Limpiar datos reales previos ─────────────────────────────────────────
    const propExistente = await prisma.usuario.findUnique({
      where: { email: EMAIL_PROP },
      include: { persona: true },
    })
    if (propExistente?.personaId) {
      const pId = propExistente.personaId
      const props = await prisma.propiedad.findMany({ where: { propietarioId: pId } })
      const propIds = props.map(p => p.id)
      await prisma.visita.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.gasto.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.pago.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.vinculo.deleteMany({ where: { propiedadId: { in: propIds } } })
      await prisma.propiedad.deleteMany({ where: { propietarioId: pId } })
      const dnisInq = ['41001001','41001002','41001003','41001004','41001005','41001006','41001007','41001008']
      await prisma.persona.deleteMany({ where: { dni: { in: dnisInq } } })
    }
    if (propExistente) await prisma.usuario.delete({ where: { email: EMAIL_PROP } })
    if (propExistente?.personaId) await prisma.persona.delete({ where: { id: propExistente.personaId } }).catch(() => {})

    // ── Cintia Gutleber — ADMIN (siempre resetea contraseña) ────────────────
    const hashAdmin = await bcrypt.hash('Gutleber2026!', 10)
    await prisma.usuario.upsert({
      where: { email: EMAIL_ADMIN },
      update: { password: hashAdmin, rol: 'ADMIN', nombre: 'Cintia Gutleber', activo: true },
      create: { nombre: 'Cintia Gutleber', email: EMAIL_ADMIN, password: hashAdmin, rol: 'ADMIN' },
    })

    // ── Cristian Stanganelli — PROPIETARIO ───────────────────────────────────
    const hashProp = await bcrypt.hash('Stanga2026!', 10)
    const personaProp = await prisma.persona.create({
      data: {
        nombre: 'Cristian',
        apellido: 'Stanganelli',
        email: EMAIL_PROP,
        tipo: 'PROPIETARIO',
        notas: 'Propietario — cartera de 8 propiedades en Posadas',
      },
    })
    await prisma.usuario.create({
      data: {
        nombre: 'Cristian Stanganelli',
        email: EMAIL_PROP,
        password: hashProp,
        rol: 'PROPIETARIO',
        personaId: personaProp.id,
      },
    })

    // ── 8 Propiedades reales ─────────────────────────────────────────────────
    // Datos exactos de la planilla de administración
    const propsData = [
      { direccion: 'Herrera 4090',                  tipo: 'CASA'         as const, dormitorios: 3, banos: 2, superficie: 120, alquilerBase: 800000,  indiceActual: 'ICL' as const, inicio: new Date('2026-08-01'), fin: new Date('2028-07-31'), proximaActualizacion: new Date('2026-12-01'), inquilino: { apellido: 'Herrera',    nombre: 'Inquilino',    dni: '41001001' } },
      { direccion: 'Calle 34a N°6488',            tipo: 'CASA'         as const, dormitorios: 3, banos: 1, superficie: 110, alquilerBase: 1095200, indiceActual: 'ICL' as const, inicio: new Date('2025-12-01'), fin: new Date('2027-11-30'), proximaActualizacion: new Date('2026-12-01'), inquilino: { apellido: 'Jauretche',  nombre: 'Inquilino',    dni: '41001002' } },
      { direccion: 'Morcillo N°1243',              tipo: 'CASA'         as const, dormitorios: 3, banos: 2, superficie: 130, alquilerBase: 900000,  indiceActual: 'ICL' as const, inicio: new Date('2025-02-01'), fin: new Date('2027-01-31'), proximaActualizacion: new Date('2026-10-01'), inquilino: { apellido: 'Morcillo',   nombre: 'Inquilino',    dni: '41001003' } },
      { direccion: 'Bolívar N°1212, Depto 4B',    tipo: 'DEPARTAMENTO' as const, dormitorios: 2, banos: 1, superficie: 65,  alquilerBase: 800000,  indiceActual: 'ICL' as const, inicio: new Date('2026-07-01'), fin: new Date('2028-06-30'), proximaActualizacion: new Date('2026-11-01'), inquilino: { apellido: 'Alto Bolívar', nombre: 'Inquilino',  dni: '41001004' } },
      { direccion: 'Troazzi N°1011, Depto 1 dorm', tipo: 'DEPARTAMENTO' as const, dormitorios: 1, banos: 1, superficie: 42, alquilerBase: 445000,  indiceActual: 'IPC' as const, inicio: new Date('2025-02-01'), fin: new Date('2027-01-31'), proximaActualizacion: new Date('2026-10-01'), inquilino: { apellido: 'García',     nombre: 'Ana Laura',    dni: '41001005' } },
      { direccion: 'Moritan N°1787, Depto 1 dorm', tipo: 'DEPARTAMENTO' as const, dormitorios: 1, banos: 1, superficie: 40, alquilerBase: 475200,  indiceActual: 'IPC' as const, inicio: new Date('2026-01-01'), fin: new Date('2027-12-31'), proximaActualizacion: new Date('2026-09-01'), inquilino: { apellido: 'Brizueña',   nombre: 'Malka',        dni: '41001006' } },
      { direccion: 'Moritan N°1781, Depto 2 dorm', tipo: 'DEPARTAMENTO' as const, dormitorios: 2, banos: 1, superficie: 55, alquilerBase: 595140,  indiceActual: 'IPC' as const, inicio: new Date('2024-12-01'), fin: new Date('2026-11-30'), proximaActualizacion: new Date('2026-12-01'), inquilino: { apellido: 'Yacopino',   nombre: 'María Laura',  dni: '41001007' } },
      { direccion: 'Moritan N°1799, Depto 2 dorm', tipo: 'DEPARTAMENTO' as const, dormitorios: 2, banos: 1, superficie: 58, alquilerBase: 600000,  indiceActual: 'ICL' as const, inicio: new Date('2026-06-01'), fin: new Date('2028-05-31'), proximaActualizacion: new Date('2026-10-01'), inquilino: { apellido: 'Quintana',   nombre: 'Natalia',      dni: '41001008' } },
    ]

    for (const p of propsData) {
      const { inicio, fin, proximaActualizacion, inquilino, ...propFields } = p

      const prop = await prisma.propiedad.create({
        data: {
          ...propFields,
          enAlquiler: true,
          administrada: true,
          propietarioId: personaProp.id,
        },
      })

      const inq = await prisma.persona.create({
        data: { nombre: inquilino.nombre, apellido: inquilino.apellido, dni: inquilino.dni, tipo: 'INQUILINO' },
      })

      const vinculo = await prisma.vinculo.create({
        data: {
          propiedadId: prop.id,
          personaId: inq.id,
          tipo: 'ALQUILER',
          fechaInicio: inicio,
          fechaFin: fin,
          duracionMeses: 24,
          alquilerInicial: prop.alquilerBase,
          alquilerActual: prop.alquilerBase,
          indice: prop.indiceActual,
          periodicidad: 4,
          proximaActualizacion,
          activo: true,
          honorariosPct: 8,
        },
      })

      // Solo agosto 2026 pendiente — el sistema arranca hoy, sin historial anterior
      await prisma.pago.create({
        data: {
          tipo: 'ALQUILER',
          concepto: 'Alquiler 2026-08',
          monto: prop.alquilerBase!,
          periodo: '2026-08',
          estado: 'PENDIENTE',
          fechaVencimiento: new Date('2026-08-31'),
          totalConExtras: prop.alquilerBase!,
          pagadoAlPropietario: false,
          propiedadId: prop.id,
          personaId: inq.id,
          vinculoId: vinculo.id,
        },
      })
    }

    return res.json({
      ok: true,
      mensaje: '✅ Usuarios y propiedades reales creados correctamente.',
      usuarios: {
        admin:      { email: EMAIL_ADMIN, password: 'Gutleber2026!', rol: 'ADMIN',       nombre: 'Cintia Gutleber'      },
        propietario: { email: EMAIL_PROP, password: 'Stanga2026!',   rol: 'PROPIETARIO', nombre: 'Cristian Stanganelli' },
      },
      propiedades: propsData.length,
      totalAlquiler: propsData.reduce((s, p) => s + p.alquilerBase, 0).toLocaleString('es-AR'),
      advertencia: 'Brizueña Moritan 1787 tiene ajuste ICL el 01/09/2026 (en 3 semanas)',
    })
  } catch (err: unknown) {
    return res.status(500).json({ ok: false, error: String(err) })
  }
})

export default router
