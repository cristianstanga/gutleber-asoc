-- AlterTable
ALTER TABLE "Propiedad" ADD COLUMN     "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "destacada" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PropiedadTour360" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "etiqueta" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropiedadTour360_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BlogPost" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "resumen" TEXT,
    "contenido" TEXT NOT NULL,
    "imagenPortada" TEXT,
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "publicadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlogPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlogPost_slug_key" ON "BlogPost"("slug");

-- AddForeignKey
ALTER TABLE "PropiedadTour360" ADD CONSTRAINT "PropiedadTour360_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
