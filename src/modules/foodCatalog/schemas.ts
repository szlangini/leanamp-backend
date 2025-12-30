import { z } from 'zod';

export const FoodSourceSchema = z.enum(['INTERNAL', 'OFF', 'USDA']);
export const FoodQualitySchema = z.enum(['HIGH', 'MED', 'LOW']);

const limitSchema = z.preprocess(
  (value) => (value === undefined ? undefined : Number(value)),
  z.number().int().min(1).max(50).default(20)
);

export const FoodCatalogSearchQuerySchema = z.object({
  q: z.string().min(2),
  limit: limitSchema
});

export const FoodCatalogBarcodeParamSchema = z.object({
  ean: z.string().regex(/^\d{8,14}$/)
});

export const FoodCatalogBarcodeQuerySchema = z.object({
  fallbackName: z.string().min(2).optional()
});

export const FoodCatalogItemSchema = z.object({
  id: z.string().uuid(),
  source: FoodSourceSchema,
  externalId: z.string().nullable(),
  barcode: z.string().nullable(),
  name: z.string(),
  brand: z.string().nullable(),
  servingSizeG: z.number().nullable(),
  kcalPer100g: z.number().int(),
  proteinPer100g: z.number(),
  fatPer100g: z.number(),
  carbsPer100g: z.number(),
  fiberPer100g: z.number().nullable(),
  isEstimate: z.boolean(),
  quality: FoodQualitySchema
});

export type FoodCatalogSearchQuery = z.infer<typeof FoodCatalogSearchQuerySchema>;
export type FoodCatalogBarcodeParams = z.infer<typeof FoodCatalogBarcodeParamSchema>;
export type FoodCatalogBarcodeQuery = z.infer<typeof FoodCatalogBarcodeQuerySchema>;
