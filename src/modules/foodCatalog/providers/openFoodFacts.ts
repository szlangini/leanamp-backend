import { env } from '../../../config/env';
import type { FoodCatalogCandidate, FoodQuality } from '../types';
import type { FoodCatalogProvider } from './types';

function toNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === '') return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function parseServingSizeG(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const match = value.match(/(\d+(?:\.\d+)?)\s*(g|ml)/i);
  if (!match) return null;
  const amount = Number(match[1]);
  return Number.isFinite(amount) ? amount : null;
}

function normalizeProduct(product: Record<string, unknown>): FoodCatalogCandidate | null {
  const code = typeof product.code === 'string' ? product.code : null;
  if (!code) return null;

  const name =
    (product.product_name as string | undefined) ||
    (product.product_name_en as string | undefined) ||
    (product.generic_name as string | undefined) ||
    (product.generic_name_en as string | undefined);

  if (!name) return null;

  const nutriments = (product.nutriments as Record<string, unknown>) ?? {};
  const kcal =
    toNumber(nutriments['energy-kcal_100g']) ??
    toNumber(nutriments['energy_kcal_100g']);
  const protein = toNumber(nutriments['proteins_100g']);
  const fat = toNumber(nutriments['fat_100g']);
  const carbs = toNumber(nutriments['carbohydrates_100g']);
  const fiber = toNumber(nutriments['fiber_100g']);

  if (kcal === null || protein === null || fat === null || carbs === null) {
    return null;
  }

  const brandRaw = typeof product.brands === 'string' ? product.brands : null;
  const brand = brandRaw ? brandRaw.split(',')[0]?.trim() || null : null;

  const servingSizeG = parseServingSizeG(product.serving_size);

  const quality: FoodQuality = 'MED';

  return {
    source: 'OFF',
    externalId: code,
    barcode: code,
    name,
    brand,
    servingSizeG,
    kcalPer100g: Math.round(kcal),
    proteinPer100g: protein,
    fatPer100g: fat,
    carbsPer100g: carbs,
    fiberPer100g: fiber,
    isEstimate: false,
    quality,
    lastFetchedAt: new Date()
  };
}

async function fetchJson(
  url: string,
  signal?: AbortSignal
): Promise<Record<string, unknown> | null> {
  const controller = signal ? null : new AbortController();
  const timeout = controller
    ? setTimeout(() => controller.abort(), env.PROVIDER_TIMEOUT_MS)
    : null;
  const requestSignal = signal ?? controller?.signal;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': env.OFF_USER_AGENT
      },
      signal: requestSignal
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function createOpenFoodFactsProvider(): FoodCatalogProvider {
  return {
    async search(query: string, limit: number, signal?: AbortSignal) {
      const params = new URLSearchParams({
        search_terms: query,
        search_simple: '1',
        action: 'process',
        json: '1',
        page_size: String(limit),
        fields: [
          'code',
          'product_name',
          'product_name_en',
          'generic_name',
          'generic_name_en',
          'brands',
          'serving_size',
          'nutriments'
        ].join(',')
      });

      const url = `${env.OFF_BASE_URL}/cgi/search.pl?${params.toString()}`;
      const payload = await fetchJson(url, signal);
      const products = Array.isArray(payload?.products) ? payload?.products : [];

      const items = products
        .map((product) => normalizeProduct(product as Record<string, unknown>))
        .filter((item): item is FoodCatalogCandidate => Boolean(item));

      return items.slice(0, limit);
    },

    async barcode(ean: string, signal?: AbortSignal) {
      const url = `${env.OFF_BASE_URL}/api/v2/product/${encodeURIComponent(ean)}.json`;
      const payload = await fetchJson(url, signal);
      if (!payload || Number(payload.status) !== 1) {
        return null;
      }

      const product = payload.product as Record<string, unknown> | undefined;
      if (!product) return null;

      return normalizeProduct({ ...product, code: payload.code ?? ean });
    }
  };
}
