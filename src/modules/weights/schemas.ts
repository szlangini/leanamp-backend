import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DateISOSchema = z.string().regex(dateRegex, 'Invalid date format');

export const WeightCreateSchema = z.object({
  dateISO: DateISOSchema,
  weightKg: z.number().min(0),
  note: z.string().optional().nullable()
});

export const WeightQuerySchema = z
  .object({
    from: DateISOSchema,
    to: DateISOSchema
  })
  .superRefine((data, ctx) => {
    const fromDate = new Date(data.from as string);
    const toDate = new Date(data.to as string);
    if (fromDate > toDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from must be <= to',
        path: ['from']
      });
    }
  });

export const WeightDeleteParamsSchema = z.object({
  dateISO: DateISOSchema
});

export type WeightCreateInput = z.infer<typeof WeightCreateSchema>;
export type WeightQueryInput = z.infer<typeof WeightQuerySchema>;
