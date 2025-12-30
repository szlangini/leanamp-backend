export type FoodSource = 'INTERNAL' | 'OFF' | 'USDA';
export type FoodQuality = 'HIGH' | 'MED' | 'LOW';

export type FoodCatalogItem = {
  id: string;
  source: FoodSource;
  externalId: string | null;
  barcode: string | null;
  name: string;
  brand: string | null;
  servingSizeG: number | null;
  kcalPer100g: number;
  proteinPer100g: number;
  fatPer100g: number;
  carbsPer100g: number;
  fiberPer100g: number | null;
  isEstimate: boolean;
  quality: FoodQuality;
};

export type FoodCatalogCandidate = Omit<FoodCatalogItem, 'id'> & {
  internalSlug?: string | null;
  synonyms?: string[] | null;
  lastFetchedAt?: Date | null;
};
