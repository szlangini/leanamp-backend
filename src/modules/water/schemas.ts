import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DateISOSchema = z.string().regex(dateRegex, 'Invalid date format');

export const WaterQuerySchema = z.object({
  date: DateISOSchema
});

export const WaterUpsertSchema = z.object({
  dateISO: DateISOSchema,
  amountMl: z.number().int().min(0)
});

export type WaterUpsertInput = z.infer<typeof WaterUpsertSchema>;
