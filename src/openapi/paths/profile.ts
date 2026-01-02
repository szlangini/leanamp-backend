import { z } from 'zod';
import {
  ActivityLevelSchema,
  DietPreferenceSchema,
  GoalModeSchema,
  ProfileUpdateSchema,
  SexSchema,
  UnitsSchema,
  WeeklyAdjustLogSchema
} from '../../modules/profile/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateTimeSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const ProfileResponseSchema = z.object({
  userId: UUIDSchema,
  createdAt: DateTimeSchema,
  updatedAt: DateTimeSchema,
  units: UnitsSchema,
  weightKg: z.number().nullable(),
  heightCm: z.number().nullable(),
  age: z.number().int().nullable(),
  sex: SexSchema,
  bodyFatPct: z.number().nullable(),
  activityLevel: ActivityLevelSchema,
  baselineTDEE: z.number().int().nullable(),
  baselineTDEEAuto: z.number().int().nullable(),
  targetWeightKg: z.number().nullable(),
  goalMode: GoalModeSchema,
  targetRateKgPerWeek: z.number(),
  autoAdjustKcal: z.number().int(),
  weeklyAdjustLog: WeeklyAdjustLogSchema,
  lastAdjustedWeekKey: z.string().nullable(),
  neatFactor: z.number(),
  baselineSteps: z.number().int(),
  manualCalorieTargetEnabled: z.boolean(),
  manualCalorieTargetKcal: z.number().int().nullable(),
  weeklyTrainingGoal: z.number().int().nullable(),
  proteinGoalG: z.number().int().nullable(),
  fatGoalG: z.number().int().nullable(),
  fiberGoalG: z.number().int().nullable(),
  waterGoalLiters: z.number().nullable(),
  waterGoalAuto: z.number().nullable(),
  kcalTargetAuto: z.number().int().nullable(),
  kcalTargetOverride: z.number().int().nullable(),
  dietPreference: DietPreferenceSchema,
  timezone: z.string().nullable(),
  hasOnboarded: z.boolean(),
  onboardingStep: z.number().int().nullable(),
  onboardingCompletedAt: DateTimeSchema.nullable()
});

export function registerProfilePaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const profileSchema = registry.addSchema('Profile', ProfileResponseSchema);
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);

  registry.addPath(paths, '/profile', 'get', {
    tags: ['profile'],
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: profileSchema
          }
        }
      }
    }
  });

  registry.addPath(paths, '/profile', 'put', {
    tags: ['profile'],
    requestBody: registry.requestBody(ProfileUpdateSchema),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: profileSchema
          }
        }
      },
      400: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: errorSchema
          }
        }
      }
    }
  });
}
