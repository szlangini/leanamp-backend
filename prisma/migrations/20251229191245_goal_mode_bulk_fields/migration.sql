-- CreateEnum
CREATE TYPE "Units" AS ENUM ('metric', 'imperial');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('male', 'female', 'other', 'unknown');

-- CreateEnum
CREATE TYPE "ActivityLevel" AS ENUM ('sedentary', 'light', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "DietPreference" AS ENUM ('balanced', 'lowCarb', 'keto');

-- CreateEnum
CREATE TYPE "GoalMode" AS ENUM ('cut', 'maintain', 'bulk');

-- CreateEnum
CREATE TYPE "ThemeMode" AS ENUM ('system', 'light', 'dark');

-- CreateEnum
CREATE TYPE "FoodEntryType" AS ENUM ('quick_add', 'manual', 'photo', 'ai_text');

-- CreateEnum
CREATE TYPE "ExtraIntensity" AS ENUM ('low', 'moderate', 'high');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('body_fat_photo', 'food_photo', 'other');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "provider" TEXT,
    "email" TEXT,
    "displayName" TEXT,
    "authProviderId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "units" "Units" NOT NULL,
    "weightKg" DOUBLE PRECISION,
    "heightCm" DOUBLE PRECISION,
    "age" INTEGER,
    "sex" "Sex" NOT NULL,
    "bodyFatPct" DOUBLE PRECISION,
    "activityLevel" "ActivityLevel" NOT NULL,
    "baselineTDEE" INTEGER,
    "baselineTDEEAuto" INTEGER,
    "targetWeightKg" DOUBLE PRECISION,
    "goalMode" "GoalMode" NOT NULL DEFAULT 'maintain',
    "targetRateKgPerWeek" DOUBLE PRECISION DEFAULT 0,
    "autoAdjustKcal" INTEGER NOT NULL DEFAULT 0,
    "weeklyAdjustLog" JSONB,
    "lastAdjustedWeekKey" TEXT,
    "neatFactor" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "baselineSteps" INTEGER NOT NULL DEFAULT 7000,
    "manualCalorieTargetEnabled" BOOLEAN NOT NULL DEFAULT false,
    "manualCalorieTargetKcal" INTEGER,
    "weeklyTrainingGoal" INTEGER,
    "proteinGoalG" INTEGER,
    "fatGoalG" INTEGER,
    "fiberGoalG" INTEGER,
    "waterGoalLiters" DOUBLE PRECISION,
    "waterGoalAuto" DOUBLE PRECISION,
    "kcalTargetAuto" INTEGER,
    "kcalTargetOverride" INTEGER,
    "dietPreference" "DietPreference" NOT NULL,
    "timezone" TEXT,
    "hasOnboarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "WeighIn" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "note" TEXT,

    CONSTRAINT "WeighIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodTemplate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FoodTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MealGroup" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "title" TEXT NOT NULL,
    "isExpanded" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MealGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FoodEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "name" TEXT NOT NULL,
    "kcal" INTEGER NOT NULL,
    "protein" DOUBLE PRECISION NOT NULL,
    "fat" DOUBLE PRECISION NOT NULL,
    "carbs" DOUBLE PRECISION NOT NULL,
    "fiber" DOUBLE PRECISION NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "type" "FoodEntryType" NOT NULL,
    "groupId" TEXT,
    "note" TEXT,

    CONSTRAINT "FoodEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "amountMl" INTEGER NOT NULL,

    CONSTRAINT "WaterLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DayPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,

    CONSTRAINT "DayPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlannedExercise" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "workingWeight" DOUBLE PRECISION NOT NULL,
    "targetRepsMin" INTEGER NOT NULL,
    "targetRepsMax" INTEGER NOT NULL,
    "notes" TEXT,
    "pinned" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PlannedExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TopSetEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "dayId" TEXT NOT NULL,
    "exerciseId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "reps" INTEGER NOT NULL,
    "sets" INTEGER NOT NULL,
    "workSets" JSONB NOT NULL,

    CONSTRAINT "TopSetEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompletionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "dayId" TEXT NOT NULL,

    CONSTRAINT "CompletionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtraActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "dateISO" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "minutes" INTEGER NOT NULL,
    "intensity" "ExtraIntensity" NOT NULL,
    "kcalEst" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "ExtraActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Media" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "type" "MediaType" NOT NULL,
    "uri" TEXT NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "themeMode" "ThemeMode" NOT NULL DEFAULT 'system',
    "notificationPrefs" JSONB,
    "healthConnected" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "WeighIn_userId_dateISO_idx" ON "WeighIn"("userId", "dateISO");

-- CreateIndex
CREATE UNIQUE INDEX "WeighIn_userId_dateISO_key" ON "WeighIn"("userId", "dateISO");

-- CreateIndex
CREATE UNIQUE INDEX "WaterLog_userId_dateISO_key" ON "WaterLog"("userId", "dateISO");

-- CreateIndex
CREATE INDEX "PlannedExercise_userId_dayId_idx" ON "PlannedExercise"("userId", "dayId");

-- CreateIndex
CREATE INDEX "TopSetEntry_userId_dateISO_idx" ON "TopSetEntry"("userId", "dateISO");

-- CreateIndex
CREATE UNIQUE INDEX "CompletionLog_userId_dateISO_dayId_key" ON "CompletionLog"("userId", "dateISO", "dayId");

-- CreateIndex
CREATE INDEX "Media_userId_createdAt_idx" ON "Media"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeighIn" ADD CONSTRAINT "WeighIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodTemplate" ADD CONSTRAINT "FoodTemplate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MealGroup" ADD CONSTRAINT "MealGroup_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FoodEntry" ADD CONSTRAINT "FoodEntry_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "MealGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterLog" ADD CONSTRAINT "WaterLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DayPlan" ADD CONSTRAINT "DayPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedExercise" ADD CONSTRAINT "PlannedExercise_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlannedExercise" ADD CONSTRAINT "PlannedExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopSetEntry" ADD CONSTRAINT "TopSetEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopSetEntry" ADD CONSTRAINT "TopSetEntry_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopSetEntry" ADD CONSTRAINT "TopSetEntry_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "PlannedExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionLog" ADD CONSTRAINT "CompletionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompletionLog" ADD CONSTRAINT "CompletionLog_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "DayPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtraActivity" ADD CONSTRAINT "ExtraActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settings" ADD CONSTRAINT "Settings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
