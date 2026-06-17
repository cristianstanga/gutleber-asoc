import { prisma } from '../index'
import { EstadoVisita } from '@prisma/client'

// Slots en minutos desde medianoche AR (UTC-3, sin DST)
// Mañana: 9:00, 9:45, 10:30, 11:15 — Tarde: 14:00, 14:45, 15:30, 16:15
const SLOTS_MIN = [9*60, 9*60+45, 10*60+30, 11*60+15, 14*60, 14*60+45, 15*60+30, 16*60+15]

// Convierte fecha AR (YYYY-MM-DD) + minutos desde medianoche AR → Date UTC
function slotUTC(fechaAR: string, minutos: number): Date {
  const [y, m, d] = fechaAR.split('-').map(Number)
  // AR = UTC-3, entonces hora AR + 3 = hora UTC
  return new Date(Date.UTC(y, m - 1, d, Math.floor(minutos / 60) + 3, minutos % 60, 0, 0))
}

export function todosLosTurnos(fechaAR: string): Date[] {
  return SLOTS_MIN.map(m => slotUTC(fechaAR, m))
}

export async function turnosDisponibles(fechaAR: string): Promise<Date[]> {
  const [y, m, d] = fechaAR.split('-').map(Number)
  // Rango del día en UTC: medianoche AR (03:00 UTC) hasta fin del día AR (02:59 UTC siguiente)
  const inicio = new Date(Date.UTC(y, m - 1, d, 3, 0, 0, 0))
  const fin    = new Date(Date.UTC(y, m - 1, d, 26, 59, 59, 999)) // hora 26 → 02hs día siguiente

  const [visitas, bloqueados] = await Promise.all([
    prisma.visita.findMany({
      where: { estado: EstadoVisita.CONFIRMADA, fechaConfirmada: { gte: inicio, lte: fin } },
      select: { fechaConfirmada: true },
    }),
    prisma.turnoBloqueado.findMany({
      where: { fecha: { gte: inicio, lte: fin } },
      select: { fecha: true },
    }),
  ])

  const ocupados = new Set([
    ...visitas.map(v => v.fechaConfirmada!.getTime()),
    ...bloqueados.map(b => b.fecha.getTime()),
  ])

  const ahora = Date.now()
  return todosLosTurnos(fechaAR).filter(s => s.getTime() > ahora && !ocupados.has(s.getTime()))
}

// Formatea slots para mostrar al lead (ej: "9:00, 9:45, 14:00")
export function formatearHoras(slots: Date[]): string {
  return slots.map(s =>
    s.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
  ).join(', ')
}

// Retorna fechas AR de los próximos N días hábiles (lun-sáb) a partir de mañana
export function proximosDiasHabiles(n: number): string[] {
  const dias: string[] = []
  const base = new Date()
  // Avanzar al día siguiente en AR
  base.setUTCHours(base.getUTCHours() + -3) // aproximar a AR
  let cursor = new Date(base)
  cursor.setDate(cursor.getDate() + 1)

  while (dias.length < n) {
    const dow = cursor.getDay() // 0=domingo, 6=sábado
    if (dow !== 0) { // no domingos
      const y = cursor.getFullYear()
      const m = String(cursor.getMonth() + 1).padStart(2, '0')
      const d = String(cursor.getDate()).padStart(2, '0')
      dias.push(`${y}-${m}-${d}`)
    }
    cursor.setDate(cursor.getDate() + 1)
  }
  return dias
}

export function labelDia(fechaAR: string): string {
  const [y, m, d] = fechaAR.split('-').map(Number)
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: '2-digit', month: 'long', timeZone: 'UTC',
  })
}
