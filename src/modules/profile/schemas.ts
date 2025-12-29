import { z } from 'zod';

export const UnitsSchema = z.enum(['metric', 'imperial']);
export const SexSchema = z.enum(['male', 'female', 'other', 'unknown']);
export const ActivityLevelSchema = z.enum(['sedentary', 'light', 'moderate', 'high']);
export const DietPreferenceSchema = z.enum(['balanced', 'lowCarb', 'keto']);
export const GoalModeSchema = z.enum(['cut', 'maintain', 'bulk']);

export const WeeklyAdjustEntrySchema = z.object({
  weekKey: z.string(),
  deltaKcal: z.number().int(),
  reason: z.string(),
  createdAtISO: z.string()
});

export const WeeklyAdjustLogSchema = z.array(WeeklyAdjustEntrySchema);

export const ProfileUpdateSchema = z.object({
  units: UnitsSchema.optional(),
  weightKg: z.number().optional().nullable(),
  heightCm: z.number().optional().nullable(),
  age: z.number().int().optional().nullable(),
  sex: SexSchema.optional(),
  bodyFatPct: z.number().optional().nullable(),
  activityLevel: ActivityLevelSchema.optional(),
  baselineTDEE: z.number().int().optional().nullable(),
  baselineTDEEAuto: z.number().int().optional().nullable(),
  targetWeightKg: z.number().optional().nullable(),
  weeklyTrainingGoal: z.number().int().optional().nullable(),
  proteinGoalG: z.number().int().optional().nullable(),
  fatGoalG: z.number().int().optional().nullable(),
  fiberGoalG: z.number().int().optional().nullable(),
  waterGoalLiters: z.number().optional().nullable(),
  waterGoalAuto: z.number().optional().nullable(),
  kcalTargetAuto: z.number().int().optional().nullable(),
  kcalTargetOverride: z.number().int().optional().nullable(),
  dietPreference: DietPreferenceSchema.optional(),
  timezone: z.string().optional().nullable(),
  hasOnboarded: z.boolean().optional(),
  goalMode: GoalModeSchema.optional(),
  targetRateKgPerWeek: z.number().min(0).max(1.0).optional(),
  autoAdjustKcal: z.number().int().optional(),
  weeklyAdjustLog: WeeklyAdjustLogSchema.optional(),
  lastAdjustedWeekKey: z.string().optional().nullable(),
  neatFactor: z.number().optional(),
  baselineSteps: z.number().int().optional(),
  manualCalorieTargetEnabled: z.boolean().optional(),
  manualCalorieTargetKcal: z.number().int().optional().nullable()
});

export type ProfileUpdateInput = z.infer<typeof ProfileUpdateSchema>;
export type WeeklyAdjustEntry = z.infer<typeof WeeklyAdjustEntrySchema>;
