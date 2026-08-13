-- AlterTable: campos mora y anticipo al propietario
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "moraMontoFinal"          DOUBLE PRECISION;
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "moraParaInmobiliaria"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "anticipadoAlPropietario" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Pago" ADD COLUMN IF NOT EXISTS "fechaAnticipo"           TIMESTAMP(3);
