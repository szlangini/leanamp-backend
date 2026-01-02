import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DateISOSchema = z.string().regex(dateRegex, 'Invalid date format');

export const StepsQuerySchema = z
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

export const StepsUpsertSchema = z.object({
  dateISO: DateISOSchema,
  steps: z.number().int().min(0)
});

export type StepsUpsertInput = z.infer<typeof StepsUpsertSchema>;
