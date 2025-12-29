import { z } from 'zod';

export const SummaryRangeSchema = z.object({
  range: z.enum(['7', '30', '90'])
});

export const StrengthRangeSchema = z.object({
  range: z.enum(['30', '90']).optional()
});

export type SummaryRangeInput = z.infer<typeof SummaryRangeSchema>;
export type StrengthRangeInput = z.infer<typeof StrengthRangeSchema>;
