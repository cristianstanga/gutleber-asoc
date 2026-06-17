-- Slot específico que eligió el lead (cuando el agente ofreció opciones concretas)
ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "fechaSolicitada" TIMESTAMP(3);

-- Turnos bloqueados manualmente por el operador
CREATE TABLE IF NOT EXISTS "TurnoBloqueado" (
  "id"        TEXT NOT NULL,
  "fecha"     TIMESTAMP(3) NOT NULL,
  "motivo"    TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TurnoBloqueado_pkey" PRIMARY KEY ("id")
);
