import { Prisma, type FoodDbItem } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../db/prisma';
import { createOpenFoodFactsProvider } from './providers/openFoodFacts';
import { createUsdaFdcProvider } from './providers/usdaFdc';
import type { FoodCatalogProvider } from './providers/types';
import type { FoodCatalogCandidate, FoodCatalogItem } from './types';
import { compareForPick, compareRank } from './ranking';
import { providerGuard, ProviderUnavailable } from './providerGuard';

const defaultProviders = {
  off: createOpenFoodFactsProvider(),
  usda: createUsdaFdcProvider()
};

const STOP_WORDS = new Set(['the', 'and', 'with', 'of', 'a', 'an', 'in', 'for', 'to']);
const TTL_MS = env.FOOD_DBITEM_TTL_HOURS * 60 * 60 * 1000;

type CatalogProviders = {
  off?: FoodCatalogProvider;
  usda?: FoodCatalogProvider;
};

type CatalogOptions = {
  providers?: CatalogProviders;
  enableOff?: boolean;
  enableUsda?: boolean;
  internalOnly?: boolean;
  cacheOnlyOnProviderDown?: boolean;
};

function toResponseItem(item: FoodDbItem): FoodCatalogItem {
  return {
    id: item.id,
    source: item.source as FoodCatalogItem['source'],
    externalId: item.externalId ?? null,
    barcode: item.barcode ?? null,
    name: item.name,
    brand: item.brand ?? null,
    servingSizeG: item.servingSizeG ?? null,
    kcalPer100g: item.kcalPer100g,
    proteinPer100g: item.proteinPer100g,
    fatPer100g: item.fatPer100g,
    carbsPer100g: item.carbsPer100g,
    fiberPer100g: item.fiberPer100g ?? null,
    isEstimate: item.isEstimate,
    quality: item.quality as FoodCatalogItem['quality']
  };
}

export function normalizeNameKey(name: string) {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !STOP_WORDS.has(token))
    .join(' ')
    .trim();

  return cleaned;
}

function isFresh(item: FoodDbItem, now = Date.now()) {
  if (item.source === 'INTERNAL') {
    return true;
  }

  if (!item.lastFetchedAt) {
    return false;
  }

  return now - item.lastFetchedAt.getTime() < TTL_MS;
}

async function searchDbItems(query: string, limit: number, source?: FoodCatalogItem['source']) {
  const normalized = normalizeNameKey(query);
  const synonymFilter = normalized
    ? {
        synonyms: {
          array_contains: [normalized]
        }
      }
    : undefined;

  const where = {
    ...(source ? { source } : {}),
    OR: [
      { name: { contains: query, mode: 'insensitive' as const } },
      ...(synonymFilter ? [synonymFilter] : [])
    ]
  };

  return prisma.foodDbItem.findMany({
    where,
    orderBy: { updatedAt: 'desc' },
    take: limit * 2
  });
}

async function upsertProviderItems(items: FoodCatalogCandidate[]) {
  const now = new Date();

  const results = await Promise.all(
    items.map((item) =>
      prisma.foodDbItem.upsert({
        where: {
          source_externalId: {
            source: item.source,
            externalId: item.externalId!
          }
        },
        update: {
          barcode: item.barcode,
          name: item.name,
          brand: item.brand,
          servingSizeG: item.servingSizeG,
          kcalPer100g: item.kcalPer100g,
          proteinPer100g: item.proteinPer100g,
          fatPer100g: item.fatPer100g,
          carbsPer100g: item.carbsPer100g,
          fiberPer100g: item.fiberPer100g,
          quality: item.quality,
          isEstimate: item.isEstimate,
          lastFetchedAt: item.lastFetchedAt ?? now
        },
        create: {
          source: item.source,
          externalId: item.externalId,
          barcode: item.barcode,
          name: item.name,
          brand: item.brand,
          servingSizeG: item.servingSizeG,
          kcalPer100g: item.kcalPer100g,
          proteinPer100g: item.proteinPer100g,
          fatPer100g: item.fatPer100g,
          carbsPer100g: item.carbsPer100g,
          fiberPer100g: item.fiberPer100g,
          quality: item.quality,
          isEstimate: item.isEstimate,
          synonyms: item.synonyms
            ? (item.synonyms as Prisma.InputJsonValue)
            : undefined,
          internalSlug: item.internalSlug ?? null,
          lastFetchedAt: item.lastFetchedAt ?? now
        }
      })
    )
  );

  return results;
}

function getProviders(options: CatalogOptions) {
  return {
    off: options.providers?.off ?? defaultProviders.off,
    usda: options.providers?.usda ?? defaultProviders.usda
  };
}

function pickBest(current: FoodCatalogItem | undefined, next: FoodCatalogItem) {
  if (!current) return next;
  return compareForPick(next, current) < 0 ? next : current;
}

export function mergeAndRank(items: FoodCatalogItem[], limit: number) {
  const byBarcode = new Map<string, FoodCatalogItem>();
  const withoutBarcode: FoodCatalogItem[] = [];

  for (const item of items) {
    if (item.barcode) {
      const key = item.barcode;
      byBarcode.set(key, pickBest(byBarcode.get(key), item));
    } else {
      withoutBarcode.push(item);
    }
  }

  const barcodeMerged = [...byBarcode.values(), ...withoutBarcode];
  const byName = new Map<string, FoodCatalogItem>();

  for (const item of barcodeMerged) {
    const nameKey = normalizeNameKey(item.name) || item.id;
    byName.set(nameKey, pickBest(byName.get(nameKey), item));
  }

  const results = Array.from(byName.values());
  results.sort(compareRank);
  return results.slice(0, limit);
}

async function searchInternalFallback(name: string) {
  const candidates = await searchDbItems(name, 10, 'INTERNAL');
  const ranked = mergeAndRank(candidates.map(toResponseItem), 1);
  return ranked[0] ?? null;
}

export async function searchCatalog(
  query: string,
  limit: number,
  options: CatalogOptions = {}
): Promise<FoodCatalogItem[]> {
  const enableOff = options.enableOff ?? env.FOOD_CATALOG_ENABLE_OFF;
  const enableUsda = options.enableUsda ?? env.FOOD_CATALOG_ENABLE_USDA;
  const internalOnly = options.internalOnly ?? env.FOOD_CATALOG_INTERNAL_ONLY;
  const cacheOnlyOnProviderDown =
    options.cacheOnlyOnProviderDown ?? env.FOOD_CATALOG_CACHE_ONLY_ON_PROVIDER_DOWN;
  const providers = getProviders(options);

  const dbItems = await searchDbItems(query, limit);
  const baseItems = dbItems.map(toResponseItem);
  let allItems = [...baseItems];
  let ranked = mergeAndRank(allItems, limit);

  if (internalOnly) {
    return ranked;
  }

  let remaining = Math.max(0, limit - ranked.length);

  if (enableOff && remaining > 0) {
    try {
      const offItems = await providerGuard.guardedCall('off', (signal) =>
        providers.off.search(query, remaining, signal)
      );
      const filtered = offItems.filter((item) => item.externalId);
      if (filtered.length > 0) {
        const upserted = await upsertProviderItems(filtered);
        allItems = allItems.concat(upserted.map(toResponseItem));
        ranked = mergeAndRank(allItems, limit);
        remaining = Math.max(0, limit - ranked.length);
      }
    } catch (error) {
      if (!(error instanceof ProviderUnavailable) || !cacheOnlyOnProviderDown) {
        throw error;
      }
      return ranked;
    }
  }

  if (enableUsda && remaining > 0) {
    try {
      const usdaItems = await providerGuard.guardedCall('usda', (signal) =>
        providers.usda.search(query, remaining, signal)
      );
      const filtered = usdaItems.filter((item) => item.externalId);
      if (filtered.length > 0) {
        const upserted = await upsertProviderItems(filtered);
        allItems = allItems.concat(upserted.map(toResponseItem));
      }
    } catch (error) {
      if (!(error instanceof ProviderUnavailable) || !cacheOnlyOnProviderDown) {
        throw error;
      }
      return ranked;
    }
  }

  return mergeAndRank(allItems, limit);
}

export async function getByBarcode(
  ean: string,
  fallbackName: string | undefined,
  options: CatalogOptions = {}
): Promise<FoodCatalogItem | null> {
  const enableOff = options.enableOff ?? env.FOOD_CATALOG_ENABLE_OFF;
  const enableUsda = options.enableUsda ?? env.FOOD_CATALOG_ENABLE_USDA;
  const internalOnly = options.internalOnly ?? env.FOOD_CATALOG_INTERNAL_ONLY;
  const cacheOnlyOnProviderDown =
    options.cacheOnlyOnProviderDown ?? env.FOOD_CATALOG_CACHE_ONLY_ON_PROVIDER_DOWN;
  const providers = getProviders(options);

  const cached = await prisma.foodDbItem.findFirst({
    where: { barcode: ean }
  });

  if (cached && isFresh(cached)) {
    return toResponseItem(cached);
  }

  const cachedResponse = cached ? toResponseItem(cached) : null;

  if (internalOnly) {
    return cachedResponse ?? (fallbackName ? searchInternalFallback(fallbackName) : null);
  }

  if (enableOff && providers.off.barcode) {
    try {
      const offItem = await providerGuard.guardedCall('off', (signal) =>
        providers.off.barcode!(ean, signal)
      );
      if (offItem && offItem.externalId) {
        const [upserted] = await upsertProviderItems([offItem]);
        return toResponseItem(upserted);
      }
    } catch (error) {
      if (error instanceof ProviderUnavailable && cacheOnlyOnProviderDown) {
        return cachedResponse;
      }
      throw error;
    }
  }

  if (fallbackName) {
    const internalFallback = await searchInternalFallback(fallbackName);
    if (internalFallback) {
      return internalFallback;
    }
  }

  if (enableUsda && providers.usda.barcode) {
    try {
      const usdaItem = await providerGuard.guardedCall('usda', (signal) =>
        providers.usda.barcode!(ean, signal)
      );
      if (usdaItem && usdaItem.externalId) {
        const [upserted] = await upsertProviderItems([usdaItem]);
        return toResponseItem(upserted);
      }
    } catch (error) {
      if (error instanceof ProviderUnavailable && cacheOnlyOnProviderDown) {
        return cachedResponse;
      }
      throw error;
    }
  }

  return cachedResponse;
}
