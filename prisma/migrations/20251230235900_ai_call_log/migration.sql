-- CreateEnum
CREATE TYPE "AiKind" AS ENUM ('INSIGHTS', 'ACTIVITY', 'FOOD_TEXT', 'VOICE_TO_MEAL', 'FOOD_PHOTO', 'BODYFAT');

-- CreateTable
CREATE TABLE "AiCallLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "kind" "AiKind" NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latencyMs" INTEGER NOT NULL,
    "success" BOOLEAN NOT NULL,
    "inputBytes" INTEGER NOT NULL,
    "outputBytes" INTEGER NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "isEstimate" BOOLEAN NOT NULL,

    CONSTRAINT "AiCallLog_pkey" PRIMARY KEY ("id")
);
