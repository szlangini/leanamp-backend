import { z } from 'zod';
import { GoalModeSchema } from '../../modules/profile/schemas';
import { StrengthRangeSchema, SummaryRangeSchema } from '../../modules/analytics/schemas';
import type { OpenApiRegistry } from '../registry';
import { DateSchema, ErrorResponseSchema, UUIDSchema } from './shared';

const SummaryResponseSchema = z.object({
  rangeDays: z.number().int(),
  dates: z.array(DateSchema),
  daily: z.object({
    intakeKcal: z.array(z.number()),
    outtakeEstKcal: z.array(z.number()),
    targetKcal: z.array(z.number()),
    balanceKcal: z.array(z.number()),
    modeOffsetKcal: z.array(z.number()),
    autoAdjustKcal: z.array(z.number()),
    extraActivityKcal: z.array(z.number()),
    stepsDeltaKcal: z.array(z.number()),
    waterMl: z.array(z.number()),
    macros: z.object({
      proteinG: z.array(z.number()),
      fatG: z.array(z.number()),
      carbsG: z.array(z.number()),
      fiberG: z.array(z.number())
    }),
    completions: z.object({
      any: z.array(z.boolean()),
      count: z.array(z.number().int())
    })
  }),
  weight: z.object({
    weighIns: z.array(
      z.object({
        dateISO: DateSchema,
        weightKg: z.number()
      })
    ),
    avg7d: z.array(
      z.object({
        dateISO: DateSchema,
        weightKg: z.number()
      })
    )
  }),
  aggregates: z.object({
    avgIntakeKcal: z.number(),
    avgOuttakeEstKcal: z.number(),
    avgTargetKcal: z.number(),
    avgBalanceKcal: z.number(),
    actualRateKgPerWeek: z.number().nullable()
  }),
  meta: z.object({
    neatFactor: z.number(),
    baselineTDEE: z.number().nullable(),
    goalMode: GoalModeSchema,
    targetRateKgPerWeek: z.number().nullable(),
    autoAdjustKcalCurrent: z.number()
  })
});

const StrengthTrendsResponseSchema = z.object({
  rangeDays: z.number().int(),
  topDeltas: z.array(
    z.object({
      exerciseId: UUIDSchema,
      exerciseName: z.string(),
      first: z.object({
        dateISO: DateSchema,
        weight: z.number(),
        reps: z.number().int()
      }),
      last: z.object({
        dateISO: DateSchema,
        weight: z.number(),
        reps: z.number().int()
      }),
      deltaWeight: z.number(),
      deltaReps: z.number().int()
    })
  )
});

export function registerAnalyticsPaths(
  registry: OpenApiRegistry,
  paths: Record<string, Record<string, unknown>>
) {
  const errorSchema = registry.addSchema('ErrorResponse', ErrorResponseSchema);
  const summarySchema = registry.addSchema('AnalyticsSummary', SummaryResponseSchema);
  const strengthSchema = registry.addSchema('StrengthTrends', StrengthTrendsResponseSchema);

  registry.addPath(paths, '/analytics/summary', 'get', {
    tags: ['analytics'],
    parameters: registry.parametersFromSchema(SummaryRangeSchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: summarySchema
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

  registry.addPath(paths, '/analytics/strength-trends', 'get', {
    tags: ['analytics'],
    parameters: registry.parametersFromSchema(StrengthRangeSchema, 'query'),
    responses: {
      200: {
        description: 'OK',
        content: {
          'application/json': {
            schema: strengthSchema
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
