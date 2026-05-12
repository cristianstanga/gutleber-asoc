-- CreateEnum
CREATE TYPE "TipoPropiedad" AS ENUM ('CASA', 'DEPARTAMENTO', 'LOCAL', 'TERRENO', 'OFICINA');

-- CreateEnum
CREATE TYPE "TipoPersona" AS ENUM ('PROPIETARIO', 'INQUILINO', 'INTERESADO', 'GARANTE');

-- CreateEnum
CREATE TYPE "TipoVinculo" AS ENUM ('ALQUILER', 'VENTA', 'ADMINISTRACION');

-- CreateEnum
CREATE TYPE "Indice" AS ENUM ('ICL', 'IPC', 'UVA');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('ALQUILER', 'EXPENSA', 'SERVICIO', 'HONORARIO', 'DEPOSITO', 'OTRO');

-- CreateEnum
CREATE TYPE "Moneda" AS ENUM ('ARS', 'USD');

-- CreateEnum
CREATE TYPE "EstadoPago" AS ENUM ('PENDIENTE', 'PAGADO', 'VENCIDO', 'MORA', 'ANULADO');

-- CreateEnum
CREATE TYPE "Canal" AS ENUM ('WHATSAPP', 'EMAIL', 'PRESENCIAL');

-- CreateEnum
CREATE TYPE "TipoMensaje" AS ENUM ('ENTRANTE', 'SALIENTE', 'SISTEMA');

-- CreateTable
CREATE TABLE "Propiedad" (
    "id" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "tipo" "TipoPropiedad" NOT NULL,
    "superficie" DOUBLE PRECISION,
    "enAlquiler" BOOLEAN NOT NULL DEFAULT false,
    "enVenta" BOOLEAN NOT NULL DEFAULT false,
    "administrada" BOOLEAN NOT NULL DEFAULT false,
    "alquilerBase" DOUBLE PRECISION,
    "indiceActual" "Indice",
    "valorVenta" DOUBLE PRECISION,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Propiedad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Persona" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "dni" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "tipo" "TipoPersona" NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Persona_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vinculo" (
    "id" TEXT NOT NULL,
    "propiedadId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "tipo" "TipoVinculo" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "alquilerInicial" DOUBLE PRECISION,
    "alquilerActual" DOUBLE PRECISION,
    "indice" "Indice",
    "periodicidad" INTEGER NOT NULL DEFAULT 3,
    "proximaActualizacion" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vinculo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "concepto" TEXT NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "moneda" "Moneda" NOT NULL DEFAULT 'ARS',
    "periodo" TEXT,
    "estado" "EstadoPago" NOT NULL DEFAULT 'PENDIENTE',
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "fechaPago" TIMESTAMP(3),
    "comprobanteEnviado" BOOLEAN NOT NULL DEFAULT false,
    "propiedadId" TEXT,
    "personaId" TEXT,
    "vinculoId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InboxItem" (
    "id" TEXT NOT NULL,
    "canal" "Canal" NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" "TipoMensaje" NOT NULL,
    "leido" BOOLEAN NOT NULL DEFAULT false,
    "propiedadId" TEXT,
    "personaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboxItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Persona_dni_key" ON "Persona"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- AddForeignKey
ALTER TABLE "Vinculo" ADD CONSTRAINT "Vinculo_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vinculo" ADD CONSTRAINT "Vinculo_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_vinculoId_fkey" FOREIGN KEY ("vinculoId") REFERENCES "Vinculo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_propiedadId_fkey" FOREIGN KEY ("propiedadId") REFERENCES "Propiedad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InboxItem" ADD CONSTRAINT "InboxItem_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "Persona"("id") ON DELETE SET NULL ON UPDATE CASCADE;
