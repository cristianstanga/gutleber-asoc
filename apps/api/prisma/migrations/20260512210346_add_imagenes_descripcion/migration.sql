-- AlterTable
ALTER TABLE "Propiedad" ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "instagramPostId" TEXT;

-- CreateTable
CREATE TABLE "PropiedadImagen" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropiedadImagen_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PropiedadImagen" ADD CONSTRAINT "PropiedadImagen_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
