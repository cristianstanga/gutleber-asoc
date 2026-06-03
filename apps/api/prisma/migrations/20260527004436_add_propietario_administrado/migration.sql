-- AlterTable
ALTER TABLE "Propiedad" ADD COLUMN     "propietarioId" TEXT;

-- AlterTable
ALTER TABLE "Vinculo" ADD COLUMN     "administrado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "duracionMeses" INTEGER;

-- AddForeignKey
ALTER TABLE "Propiedad" ADD CONSTRAINT "Propiedad_propietarioId_fkey" FOREIGN KEY ("propietarioId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
