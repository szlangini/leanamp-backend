import { env } from '../../../config/env';
import type { FoodCatalogCandidate, FoodQuality } from '../types';
import type { FoodCatalogProvider } from './types';

const TIMEOUT_MS = 6000;

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandOwner?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: Array<{
    nutrientId?: number;
    nutrientName?: string;
    nutrientNumber?: string;
    unitName?: string;
    value?: number;
  }>;
  dataType?: string;
  gtinUpc?: string;
};

type UsdaSearchResponse = {
  foods?: UsdaFood[];
};

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function getNutrientValue(foods: UsdaFood, nutrientId: number, names: string[]) {
  const items = foods.foodNutrients ?? [];
  for (const item of items) {
    if (item.nutrientId === nutrientId) return toNumber(item.value);
  }
  for (const item of items) {
    const name = (item.nutrientName || '').toLowerCase();
    if (names.some((n) => name.includes(n))) return toNumber(item.value);
  }
  return null;
}

function isGramUnit(unit?: string) {
  if (!unit) return false;
  return unit.toLowerCase() === 'g' || unit.toLowerCase() === 'ml';
}

function normalizeFood(food: UsdaFood): FoodCatalogCandidate | null {
  const fdcId = food.fdcId ? String(food.fdcId) : null;
  if (!fdcId) return null;

  const name = food.description?.trim();
  if (!name) return null;

  const kcal = getNutrientValue(food, 1008, ['energy', 'kcal']);
  const protein = getNutrientValue(food, 1003, ['protein']);
  const fat = getNutrientValue(food, 1004, ['fat']);
  const carbs = getNutrientValue(food, 1005, ['carbohydrate', 'carb']);
  const fiber = getNutrientValue(food, 1079, ['fiber']);

  if (kcal === null || protein === null || fat === null || carbs === null) {
    return null;
  }

  const servingSize = toNumber(food.servingSize);
  const servingUnit = food.servingSizeUnit;
  const canConvert =
    servingSize !== null && servingSize > 0 && isGramUnit(servingUnit);
  const dataType = food.dataType ?? '';
  const needsConversion = dataType.toLowerCase() === 'branded' && canConvert;

  const factor = needsConversion ? 100 / servingSize! : 1;
  const quality: FoodQuality = needsConversion ? 'LOW' : 'MED';
  const isEstimate = needsConversion;

  return {
    source: 'USDA',
    externalId: fdcId,
    barcode: food.gtinUpc ? food.gtinUpc : null,
    name,
    brand: food.brandOwner ?? food.brandName ?? null,
    servingSizeG: canConvert ? servingSize! : null,
    kcalPer100g: Math.round(kcal * factor),
    proteinPer100g: protein * factor,
    fatPer100g: fat * factor,
    carbsPer100g: carbs * factor,
    fiberPer100g: fiber === null ? null : fiber * factor,
    isEstimate,
    quality,
    lastFetchedAt: new Date()
  };
}

async function fetchJson(url: string): Promise<UsdaSearchResponse | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as UsdaSearchResponse;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export function createUsdaFdcProvider(): FoodCatalogProvider {
  return {
    async search(query: string, limit: number) {
      if (!env.USDA_API_KEY) {
        return [];
      }

      const params = new URLSearchParams({
        query,
        pageSize: String(limit),
        api_key: env.USDA_API_KEY
      });

      const url = `${env.USDA_BASE_URL}/foods/search?${params.toString()}`;
      const payload = await fetchJson(url);
      const foods = Array.isArray(payload?.foods) ? payload?.foods : [];

      const items = foods
        .map((food) => normalizeFood(food))
        .filter((item): item is FoodCatalogCandidate => Boolean(item));

      return items.slice(0, limit);
    },

    async barcode(ean: string) {
      if (!env.USDA_API_KEY) {
        return null;
      }

      const params = new URLSearchParams({
        query: ean,
        pageSize: '5',
        api_key: env.USDA_API_KEY
      });

      const url = `${env.USDA_BASE_URL}/foods/search?${params.toString()}`;
      const payload = await fetchJson(url);
      const foods = Array.isArray(payload?.foods) ? payload?.foods : [];
      const match = foods.find((food) => food.gtinUpc === ean);
      if (!match) return null;

      return normalizeFood(match);
    }
  };
}
