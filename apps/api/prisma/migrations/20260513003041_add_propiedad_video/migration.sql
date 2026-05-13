-- CreateTable
CREATE TABLE "PropiedadVideo" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "titulo" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropiedadVideo_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PropiedadVideo" ADD CONSTRAINT "PropiedadVideo_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE CASCADE ON UPDATE CASCADE;
