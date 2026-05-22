-- AlterTable
ALTER TABLE "Pago" ADD COLUMN     "conceptosExtra" JSONB,
ADD COLUMN     "fechaPagoPropietario" TIMESTAMP(3),
ADD COLUMN     "formaPago" TEXT DEFAULT 'Efectivo',
ADD COLUMN     "nroRecibo" INTEGER,
ADD COLUMN     "pagadoAlPropietario" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "totalConExtras" DOUBLE PRECISION;
