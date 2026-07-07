-- Contador de visualizaciones de la página pública por propiedad
ALTER TABLE "Propiedad" ADD COLUMN IF NOT EXISTS "vistas" INTEGER NOT NULL DEFAULT 0;
