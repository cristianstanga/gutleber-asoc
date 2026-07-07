import { Router } from 'express'
import { prisma } from '../index'
import { EtapaConversacion } from '@prisma/client'

const router = Router()

// GET /api/stats/pipeline
router.get('/pipeline', async (req, res) => {
  const { tipo } = req.query // 'ALQUILER' | 'VENTA' | undefined

  const whereConv: Record<string, unknown> = {}
  if (tipo === 'ALQUILER' || tipo === 'VENTA') whereConv.tipoInteres = tipo

  // Leads por etapa
  const [leadsRaw, visitasTotal, topPropiedades] = await Promise.all([
    prisma.conversacion.findMany({
      where: whereConv,
      select: {
        id: true,
        etapa: true,
        tipoInteres: true,
        nombreCapturado: true,
        pushName: true,
        fotoPerfilUrl: true,
        numero: true,
        telefonoReal: true,
        ultimoMensaje: true,
        agenteActivo: true,
        presupuesto: true,
        propiedadInteres: { select: { id: true, direccion: true } },
        persona: { select: { nombre: true, apellido: true } },
      },
      orderBy: { ultimoMensaje: 'desc' },
    }),

    prisma.visita.count({ where: { estado: { not: 'CANCELADA' } } }),

    prisma.propiedad.findMany({
      where: { enAlquiler: true },
      select: {
        id: true,
        direccion: true,
        vistas: true,
        _count: {
          select: {
            conversacionesInteres: true,
            visitas: true,
          },
        },
      },
      orderBy: { conversacionesInteres: { _count: 'desc' } },
      take: 8,
    }),
  ])

  // Conteo por etapa
  const etapas: Record<string, number> = {}
  for (const etapa of Object.values(EtapaConversacion)) etapas[etapa] = 0
  for (const l of leadsRaw) etapas[l.etapa] = (etapas[l.etapa] || 0) + 1

  // Funnel de conversión
  const totalConsultas = leadsRaw.filter(l => l.etapa !== EtapaConversacion.INACTIVO).length
  const etapasInteres  = [EtapaConversacion.INTERESADO, EtapaConversacion.RECOPILANDO, EtapaConversacion.VISITA_PENDIENTE, EtapaConversacion.CLIENTE] as string[]
  const etapasVisita   = [EtapaConversacion.VISITA_PENDIENTE, EtapaConversacion.CLIENTE] as string[]
  const interesados    = leadsRaw.filter(l => etapasInteres.includes(l.etapa)).length
  const conVisita      = leadsRaw.filter(l => etapasVisita.includes(l.etapa)).length
  const clientes       = leadsRaw.filter(l => l.etapa === EtapaConversacion.CLIENTE).length

  res.json({
    etapas,
    leads: leadsRaw,
    funnel: { totalConsultas, interesados, conVisita, clientes },
    topPropiedades: topPropiedades.map(p => ({
      id: p.id,
      direccion: p.direccion,
      consultas: p._count.conversacionesInteres,
      visitas: p._count.visitas,
      vistas: p.vistas,
    })),
    visitasTotal,
  })
})

export default router
