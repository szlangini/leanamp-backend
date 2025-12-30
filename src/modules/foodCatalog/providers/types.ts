import type { FoodCatalogCandidate } from '../types';

export type FoodCatalogProvider = {
  search: (
    query: string,
    limit: number,
    signal?: AbortSignal
  ) => Promise<FoodCatalogCandidate[]>;
  barcode?: (ean: string, signal?: AbortSignal) => Promise<FoodCatalogCandidate | null>;
};
