-- CreateEnum
CREATE TYPE "FoodSource" AS ENUM ('INTERNAL', 'OFF', 'USDA');

-- CreateEnum
CREATE TYPE "FoodQuality" AS ENUM ('HIGH', 'MED', 'LOW');

-- CreateTable
CREATE TABLE "FoodDbItem" (
    "id" TEXT NOT NULL,
    "source" "FoodSource" NOT NULL,
    "externalId" TEXT,
    "barcode" TEXT,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "servingSizeG" DOUBLE PRECISION,
    "kcalPer100g" INTEGER NOT NULL,
    "proteinPer100g" DOUBLE PRECISION NOT NULL,
    "fatPer100g" DOUBLE PRECISION NOT NULL,
    "carbsPer100g" DOUBLE PRECISION NOT NULL,
    "fiberPer100g" DOUBLE PRECISION,
    "quality" "FoodQuality" NOT NULL DEFAULT 'MED',
    "isEstimate" BOOLEAN NOT NULL DEFAULT false,
    "synonyms" JSONB,
    "internalSlug" TEXT,
    "lastFetchedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FoodDbItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FoodDbItem_internalSlug_key" ON "FoodDbItem"("internalSlug");

-- CreateIndex
CREATE INDEX "FoodDbItem_barcode_idx" ON "FoodDbItem"("barcode");

-- CreateIndex
CREATE INDEX "FoodDbItem_name_idx" ON "FoodDbItem"("name");

-- CreateIndex
CREATE UNIQUE INDEX "FoodDbItem_source_externalId_key" ON "FoodDbItem"("source", "externalId");
