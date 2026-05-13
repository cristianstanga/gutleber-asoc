-- AlterTable
ALTER TABLE "Propiedad" ADD COLUMN     "antiguedad" INTEGER,
ADD COLUMN     "banos" INTEGER,
ADD COLUMN     "cochera" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "dormitorios" INTEGER,
ADD COLUMN     "piso" TEXT;
