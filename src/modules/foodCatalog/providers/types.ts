import type { FoodCatalogCandidate } from '../types';

export type FoodCatalogProvider = {
  search: (query: string, limit: number) => Promise<FoodCatalogCandidate[]>;
  barcode?: (ean: string) => Promise<FoodCatalogCandidate | null>;
};
