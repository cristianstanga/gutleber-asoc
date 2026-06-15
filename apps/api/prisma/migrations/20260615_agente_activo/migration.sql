-- Agrega campo agenteActivo a Conversacion para controlar el agente IA 24/7
ALTER TABLE "Conversacion" ADD COLUMN IF NOT EXISTS "agenteActivo" BOOLEAN NOT NULL DEFAULT true;
