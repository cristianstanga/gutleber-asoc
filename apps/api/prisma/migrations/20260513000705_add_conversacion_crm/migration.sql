-- CreateEnum
CREATE TYPE "EtapaConversacion" AS ENUM ('NUEVO', 'CONSULTANDO', 'INTERESADO', 'RECOPILANDO', 'VISITA_PENDIENTE', 'CLIENTE', 'INACTIVO');

-- AlterTable
ALTER TABLE "InboxItem" ADD COLUMN     "conversacionId" TEXT,
ADD COLUMN     "numero" TEXT;

-- CreateTable
CREATE TABLE "Conversacion" (
    "id" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "personaId" TEXT,
    "etapa" "EtapaConversacion" NOT NULL DEFAULT 'NUEVO',
    "tipoInteres" TEXT,
    "propiedadInteresId" TEXT,
    "nombreCapturado" TEXT,
    "presupuesto" DOUBLE PRECISION,
    "notas" TEXT,
    "ultimoMensaje" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Conversacion_numero_key" ON "Conversacion"("numero");

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversacion" ADD CONSTRAINT "Conversacion_propiedadInteresId_fkey" FOREIGN KEY ("propiedadInteresId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_conversacionId_fkey" FOREIGN KEY ("conversacionId") REFERENCES "Conversacion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
