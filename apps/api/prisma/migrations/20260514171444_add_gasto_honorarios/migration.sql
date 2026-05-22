-- CreateEnum
CREATE TYPE "EstadoGasto" AS ENUM ('PENDIENTE', 'APLICADO', 'ANULADO');

-- AlterTable
ALTER TABLE "Vinculo" ADD COLUMN     "honorariosPct" DOUBLE PRECISION NOT NULL DEFAULT 8;

-- CreateTable
CREATE TABLE "Gasto" (
    "id" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoGasto" NOT NULL DEFAULT 'PENDIENTE',
    "propiedadId" TEXT,
    "vinculoId" TEXT,
    "pagoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gasto_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Gasto" ADD CONSTRAINT "Gasto_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "Vinculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
