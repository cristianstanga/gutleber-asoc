-- AlterTable: agregar campos de liquidación al modelo Pago
ALTER TABLE "Pago" ADD COLUMN "montoPropietario" DOUBLE PRECISION;
ALTER TABLE "Pago" ADD COLUMN "honorariosAplicados" DOUBLE PRECISION;
ALTER TABLE "Pago" ADD COLUMN "gastosAplicados" DOUBLE PRECISION;
