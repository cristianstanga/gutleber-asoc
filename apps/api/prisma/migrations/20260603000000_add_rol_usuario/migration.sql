-- CreateEnum
CREATE TYPE "RolUsuario" AS ENUM ('ADMIN', 'OPERADOR', 'PROPIETARIO', 'INQUILINO');

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "rol" "RolUsuario" NOT NULL DEFAULT 'OPERADOR';
ALTER TABLE "Usuario" ADD COLUMN "personaId" TEXT;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_personaId_fkey"
  FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
