-- Config editable del sistema (requisitos, horarios, etc.)
CREATE TABLE IF NOT EXISTS "ConfigSistema" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ConfigSistema_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ConfigSistema_clave_key" ON "ConfigSistema"("clave");

-- Estado de visitas
DO $$ BEGIN
    CREATE TYPE "EstadoVisita" AS ENUM ('PENDIENTE_CONFIRMACION', 'CONFIRMADA', 'REPROGRAMADA', 'REALIZADA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Visitas registradas por el agente IA o manualmente
CREATE TABLE IF NOT EXISTS "Visita" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT,
    "conversacionId" TEXT,
    "personaId" TEXT,
    "nombreContacto" TEXT NOT NULL,
    "numeroContacto" TEXT NOT NULL,
    "fechaPropuesta" TEXT NOT NULL,
    "fechaConfirmada" TIMESTAMP(3),
    "estado" "EstadoVisita" NOT NULL DEFAULT 'PENDIENTE_CONFIRMACION',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Visita_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
    ALTER TABLE "Visita" ADD CONSTRAINT "Visita_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Visita" ADD CONSTRAINT "Visita_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "Visita" ADD CONSTRAINT "Visita_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
