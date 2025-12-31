import { z } from 'zod';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const DateISOSchema = z.string().regex(dateRegex, 'Invalid date format');

export const FoodEntryTypeSchema = z.enum(['quick_add', 'manual', 'photo', 'ai_text']);

const MacroSchema = z.number().min(0, 'Must be at least 0');
const KcalSchema = z.number().int().min(0, 'Must be at least 0');

export const FoodTemplateCreateSchema = z.object({
  name: z.string().min(1),
  kcal: KcalSchema,
  protein: MacroSchema,
  fat: MacroSchema,
  carbs: MacroSchema,
  fiber: MacroSchema
});

export const MealGroupCreateSchema = z.object({
  dateISO: DateISOSchema,
  title: z.string().min(1),
  isExpanded: z.boolean().optional()
});

export const MealGroupUpdateSchema = z
  .object({
    title: z.string().min(1).optional(),
    isExpanded: z.boolean().optional()
  })
  .refine((data) => data.title !== undefined || data.isExpanded !== undefined, {
    message: 'At least one field is required'
  });

export const MealGroupQuerySchema = z.object({
  date: DateISOSchema
});

export const FoodEntryCreateSchema = z.object({
  dateISO: DateISOSchema,
  name: z.string().min(1),
  kcal: KcalSchema,
  protein: MacroSchema,
  fat: MacroSchema,
  carbs: MacroSchema,
  fiber: MacroSchema,
  multiplier: z.number().positive().optional(),
  type: FoodEntryTypeSchema,
  groupId: z.string().uuid().optional().nullable(),
  note: z.string().optional().nullable()
});

export const FoodEntryUpdateSchema = z
  .object({
    dateISO: DateISOSchema.optional(),
    name: z.string().min(1).optional(),
    kcal: KcalSchema.optional(),
    protein: MacroSchema.optional(),
    fat: MacroSchema.optional(),
    carbs: MacroSchema.optional(),
    fiber: MacroSchema.optional(),
    multiplier: z.number().positive().optional(),
    type: FoodEntryTypeSchema.optional(),
    groupId: z.string().uuid().optional().nullable(),
    note: z.string().optional().nullable()
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'At least one field is required'
  });

export const FoodEntriesQuerySchema = z.object({
  date: DateISOSchema
});

export const IdParamSchema = z.object({
  id: z.string().uuid()
});

export type FoodTemplateCreateInput = z.infer<typeof FoodTemplateCreateSchema>;
export type MealGroupCreateInput = z.infer<typeof MealGroupCreateSchema>;
export type MealGroupUpdateInput = z.infer<typeof MealGroupUpdateSchema>;
export type FoodEntryCreateInput = z.infer<typeof FoodEntryCreateSchema>;
export type FoodEntryUpdateInput = z.infer<typeof FoodEntryUpdateSchema>;
