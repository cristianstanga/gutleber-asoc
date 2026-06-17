-- Google Calendar event ID en visitas confirmadas
ALTER TABLE "Visita" ADD COLUMN IF NOT EXISTS "googleEventId" TEXT;
