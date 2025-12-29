import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DateISOSchema = z.string().regex(dateRegex, 'Invalid date format');

export const IdParamSchema = z.object({
  id: z.string().uuid()
});

export const DayPlanCreateSchema = z.object({
  title: z.string().min(1),
  emoji: z.string().min(1)
});

export const DayPlanUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    emoji: z.string().min(1).optional()
  })
  .refine((data) => data.title !== undefined || data.emoji !== undefined, {
    message: 'At least one field is required'
  });

export const ExerciseCreateSchema = z
  .object({
    dayId: z.string().uuid(),
    name: z.string().min(1),
    workingWeight: z.number().min(0),
    targetRepsMin: z.number().int().min(0),
    targetRepsMax: z.number().int().min(0),
    notes: z.string().optional().nullable(),
    pinned: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (data.targetRepsMin > data.targetRepsMax) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'targetRepsMin must be <= targetRepsMax',
        path: ['targetRepsMin']
      });
    }
  });

export const ExerciseUpdateSchema = z
  .object({
    name: z.string().min(1).optional(),
    workingWeight: z.number().min(0).optional(),
    targetRepsMin: z.number().int().min(0).optional(),
    targetRepsMax: z.number().int().min(0).optional(),
    notes: z.string().optional().nullable(),
    pinned: z.boolean().optional()
  })
  .superRefine((data, ctx) => {
    if (!Object.values(data).some((value) => value !== undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'At least one field is required'
      });
    }

    if (
      data.targetRepsMin !== undefined &&
      data.targetRepsMax !== undefined &&
      data.targetRepsMin > data.targetRepsMax
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'targetRepsMin must be <= targetRepsMax',
        path: ['targetRepsMin']
      });
    }
  });

const WorkSetSchema = z.object({
  weight: z.number().min(0),
  reps: z.number().int().min(0)
});

export const TopSetCreateSchema = z.object({
  dateISO: DateISOSchema,
  dayId: z.string().uuid(),
  exerciseId: z.string().uuid(),
  weight: z.number().min(0),
  reps: z.number().int().min(0),
  sets: z.number().int().min(1),
  workSets: z.array(WorkSetSchema).min(1)
});

export const TopSetQuerySchema = z
  .object({
    range: z.enum(['7', '30', '90']).optional(),
    from: DateISOSchema.optional(),
    to: DateISOSchema.optional()
  })
  .superRefine((data, ctx) => {
    const hasRange = data.range !== undefined;
    const hasFrom = data.from !== undefined;
    const hasTo = data.to !== undefined;

    if (hasRange && (hasFrom || hasTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide either range or from/to'
      });
      return;
    }

    if (!hasRange && (!hasFrom || !hasTo)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Provide range or both from and to'
      });
      return;
    }

    if (hasFrom && hasTo) {
      const fromDate = new Date(data.from as string);
      const toDate = new Date(data.to as string);
      if (fromDate > toDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'from must be <= to',
          path: ['from']
        });
      }
    }
  });

export const CompletionCreateSchema = z.object({
  dateISO: DateISOSchema,
  dayId: z.string().uuid()
});

export const CompletionDeleteParamsSchema = z.object({
  dateISO: DateISOSchema
});

export const CompletionDeleteQuerySchema = z.object({
  dayId: z.string().uuid()
});

export const ExtraIntensitySchema = z.enum(['low', 'moderate', 'high']);

export const ExtraActivityCreateSchema = z.object({
  dateISO: DateISOSchema,
  type: z.string().min(1),
  minutes: z.number().int().min(0),
  intensity: ExtraIntensitySchema,
  kcalEst: z.number().min(0),
  notes: z.string().optional().nullable()
});

export const ExtraActivityQuerySchema = z.object({
  date: DateISOSchema
});

export type DayPlanCreateInput = z.infer<typeof DayPlanCreateSchema>;
export type DayPlanUpdateInput = z.infer<typeof DayPlanUpdateSchema>;
export type ExerciseCreateInput = z.infer<typeof ExerciseCreateSchema>;
export type ExerciseUpdateInput = z.infer<typeof ExerciseUpdateSchema>;
export type TopSetCreateInput = z.infer<typeof TopSetCreateSchema>;
export type CompletionCreateInput = z.infer<typeof CompletionCreateSchema>;
export type ExtraActivityCreateInput = z.infer<typeof ExtraActivityCreateSchema>;
