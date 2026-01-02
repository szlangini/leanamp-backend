import type { FoodCatalogItem, FoodQuality, FoodSource } from './types';

const QUALITY_SCORE: Record<FoodQuality, number> = {
  HIGH: 6,
  MED: 3,
  LOW: 0
};

const SOURCE_SCORE: Record<FoodSource, number> = {
  INTERNAL: 6,
  USDA: 4,
  OFF: 2
};

const STOP_WORDS = new Set(['the', 'and', 'with', 'of', 'a', 'an', 'in', 'for', 'to']);
const PRODUCT_TOKENS = new Set([
  'bar',
  'protein',
  'shake',
  'yogurt',
  'cookie',
  'cereal',
  'sauce',
  'drink',
  'flavor',
  'pack'
]);

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

function tokenize(value: string) {
  const normalized = normalizeNameKey(value);
  return normalized ? normalized.split(/\s+/) : [];
}

export function score(item: FoodCatalogItem): number {
  const qualityScore = QUALITY_SCORE[item.quality] ?? 0;
  const estimatePenalty = item.isEstimate ? -6 : 0;
  const hasMacros =
    Number.isFinite(item.kcalPer100g) &&
    Number.isFinite(item.proteinPer100g) &&
    Number.isFinite(item.fatPer100g) &&
    Number.isFinite(item.carbsPer100g);
  const completeness = hasMacros ? 6 : 0;
  const fiberBonus = item.fiberPer100g === null ? 0 : 1;
  const servingBonus = item.servingSizeG === null ? 2 : 0;
  const sourceTie = SOURCE_SCORE[item.source] ?? 0;
  const brandBoost = item.brand ? 0 : 4;

  return (
    qualityScore +
    estimatePenalty +
    completeness +
    fiberBonus +
    servingBonus +
    sourceTie +
    brandBoost
  );
}

function queryMatchScore(name: string, query: string) {
  const nameTokens = tokenize(name);
  const queryTokens = tokenize(query);
  if (nameTokens.length === 0 || queryTokens.length === 0) {
    return { score: 0, nameTokens, queryTokens };
  }

  const normalizedName = nameTokens.join(' ');
  const normalizedQuery = queryTokens.join(' ');

  let score = 0;
  if (normalizedName === normalizedQuery) {
    score += 18;
  } else if (normalizedName.startsWith(normalizedQuery)) {
    score += 12;
  } else {
    const nameSet = new Set(nameTokens);
    const matched = queryTokens.filter((token) => nameSet.has(token)).length;
    score += matched * 3;
  }

  return { score, nameTokens, queryTokens };
}

export function scoreWithQuery(item: FoodCatalogItem, query: string): number {
  const baseScore = score(item);
  const { score: matchScore, nameTokens, queryTokens } = queryMatchScore(
    item.name,
    query
  );
  const isSimpleQuery = queryTokens.length <= 2;
  const tokenSet = new Set(nameTokens);
  const productPenalty = nameTokens.reduce((acc, token) => {
    if (PRODUCT_TOKENS.has(token)) {
      return acc + (isSimpleQuery ? 5 : 3);
    }
    return acc;
  }, 0);
  const brandPenalty = item.brand ? (isSimpleQuery ? 6 : 3) : 0;
  const longNamePenalty = Math.max(0, nameTokens.length - 4);
  const separatorPenalty = (item.name.match(/[,:/|]/g) ?? []).length;
  const rawFreshBoost =
    /(,|\s)(raw|fresh)$/.test(item.name.toLowerCase().trim()) ? 4 : 0;
  const singleIngredientBoost =
    !item.brand && nameTokens.length > 0 && nameTokens.length <= 3 ? 5 : 0;

  return (
    baseScore +
    matchScore +
    singleIngredientBoost +
    rawFreshBoost -
    brandPenalty -
    productPenalty -
    longNamePenalty -
    separatorPenalty
  );
}

export function compareRank(
  a: FoodCatalogItem,
  b: FoodCatalogItem,
  query?: string
): number {
  const scoreDiff =
    query !== undefined ? scoreWithQuery(b, query) - scoreWithQuery(a, query) : score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;

  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  return a.id.localeCompare(b.id);
}

export function compareForPick(
  a: FoodCatalogItem,
  b: FoodCatalogItem,
  query?: string
): number {
  const scoreDiff =
    query !== undefined ? scoreWithQuery(b, query) - scoreWithQuery(a, query) : score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;

  const brandDiff = compareOptionalString(a.brand, b.brand);
  if (brandDiff !== 0) return brandDiff;

  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  return a.id.localeCompare(b.id);
}

function compareOptionalString(a: string | null, b: string | null): number {
  if (a && !b) return 1;
  if (!a && b) return -1;
  if (a && b) return a.localeCompare(b);
  return 0;
}
