import { z } from 'zod';

const TextSchema = z.string().min(2).max(500);
const ImageBase64Schema = z.string().min(8).max(5_000_000);
const ImageMimeSchema = z.string().regex(/^image\/[a-zA-Z0-9.+-]+$/);

export const AiInsightsInputSchema = z.object({
  calories: z.object({
    intakeAvg: z.number(),
    targetKcal: z.number().nullable().optional(),
    balanceAvg: z.number()
  }),
  macros: z.object({
    proteinG: z.number(),
    fatG: z.number(),
    carbsG: z.number(),
    fiberG: z.number().nullable().optional()
  }),
  water: z.object({
    litersAvg: z.number(),
    adherence: z.number().min(0).max(1).nullable().optional()
  }),
  movement: z.object({
    stepsAvg: z.number(),
    exerciseCount: z.number().int(),
    strengthTrend: z.string().optional()
  }),
  weight: z.object({
    rateKgPerWeek: z.number().nullable().optional(),
    volatility: z.number().nullable().optional()
  })
});

export const AiInsightsResponseSchema = z
  .object({
    status: z.literal('OK'),
    overall: z.enum(['POS', 'NEU', 'NEG']),
    bullets: z
      .array(
        z.object({
          k: z.enum(['CAL', 'PROTEIN', 'WATER', 'MOVE', 'STRENGTH', 'RECOVERY']),
          s: z.enum(['P1', 'P2', 'P3']),
          t: z.string()
        })
      )
      .max(5),
    actions: z
      .array(
        z.object({
          t: z.string(),
          p: z.enum(['HIGH', 'MED', 'LOW'])
        })
      )
      .max(3),
    warnings: z.array(z.string()),
    disclaimer: z.literal('ESTIMATE')
  })
  .strict();

export const AiActivityEstimateInputSchema = z.object({
  type: z.string().min(2),
  minutes: z.number().int().nonnegative(),
  intensity: z.enum(['low', 'moderate', 'high']),
  weightKg: z.number().optional()
});

export const AiActivityEstimateResponseSchema = z
  .object({
    status: z.literal('OK'),
    kcal: z.number().int(),
    confidence: z.number().min(0).max(1),
    notes: z.string(),
    disclaimer: z.literal('ESTIMATE')
  })
  .strict();

export const AiFoodDescribeInputSchema = z.object({
  text: TextSchema,
  locale: z.string().optional()
});

export const AiImageInputSchema = z.object({
  imageBase64: ImageBase64Schema,
  mimeType: ImageMimeSchema,
  locale: z.string().optional()
});

export const AiFoodDescribeResponseSchema = z
  .object({
    status: z.literal('OK'),
    mealName: z.string(),
    parsed: z.string(),
    kcal: z.number().int(),
    protein: z.number(),
    fat: z.number(),
    carbs: z.number(),
    fiber: z.number().nullable(),
    confidence: z.number().min(0).max(1),
    questions: z.array(z.string()).max(2),
    disclaimer: z.literal('ESTIMATE')
  })
  .strict();

export const AiFoodPhotoResponseSchema = z.union([
  AiFoodDescribeResponseSchema,
  z
    .object({
      status: z.enum(['NOT_FOOD', 'SEXUAL_CONTENT']),
      reason: z.string().optional()
    })
    .strict()
]);

export const AiBodyfatPhotoResponseSchema = z.union([
  z
    .object({
      status: z.literal('OK'),
      bodyFatPct: z.number().min(0).max(80),
      confidence: z.number().min(0).max(1),
      notes: z.string(),
      disclaimer: z.literal('ESTIMATE')
    })
    .strict(),
  z
    .object({
      status: z.enum(['NO_BODY', 'SEXUAL_CONTENT']),
      reason: z.string().optional()
    })
    .strict()
]);

export type AiInsightsInput = z.infer<typeof AiInsightsInputSchema>;
export type AiInsightsResponse = z.infer<typeof AiInsightsResponseSchema>;
export type AiActivityEstimateInput = z.infer<typeof AiActivityEstimateInputSchema>;
export type AiActivityEstimateResponse = z.infer<typeof AiActivityEstimateResponseSchema>;
export type AiFoodDescribeInput = z.infer<typeof AiFoodDescribeInputSchema>;
export type AiFoodDescribeResponse = z.infer<typeof AiFoodDescribeResponseSchema>;
export type AiImageInput = z.infer<typeof AiImageInputSchema>;
export type AiFoodPhotoResponse = z.infer<typeof AiFoodPhotoResponseSchema>;
export type AiBodyfatPhotoResponse = z.infer<typeof AiBodyfatPhotoResponseSchema>;
