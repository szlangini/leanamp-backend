import type { FoodCatalogItem, FoodQuality, FoodSource } from './types';

const QUALITY_SCORE: Record<FoodQuality, number> = {
  HIGH: 30,
  MED: 20,
  LOW: 10
};

const SOURCE_SCORE: Record<FoodSource, number> = {
  INTERNAL: 3,
  OFF: 2,
  USDA: 1
};

export function score(item: FoodCatalogItem): number {
  const qualityScore = QUALITY_SCORE[item.quality] ?? 0;
  const estimatePenalty = item.isEstimate ? -8 : 0;
  const hasMacros =
    Number.isFinite(item.kcalPer100g) &&
    Number.isFinite(item.proteinPer100g) &&
    Number.isFinite(item.fatPer100g) &&
    Number.isFinite(item.carbsPer100g);
  const completeness = hasMacros ? 10 : 0;
  const fiberBonus = item.fiberPer100g === null ? 0 : 2;
  const servingBonus = item.servingSizeG === null ? 0 : 1;
  const sourceTie = SOURCE_SCORE[item.source] ?? 0;

  return qualityScore + estimatePenalty + completeness + fiberBonus + servingBonus + sourceTie;
}

export function compareRank(a: FoodCatalogItem, b: FoodCatalogItem): number {
  const scoreDiff = score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;

  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  return a.id.localeCompare(b.id);
}

export function compareForPick(a: FoodCatalogItem, b: FoodCatalogItem): number {
  const scoreDiff = score(b) - score(a);
  if (scoreDiff !== 0) return scoreDiff;

  const brandDiff = compareOptionalString(a.brand, b.brand);
  if (brandDiff !== 0) return brandDiff;

  const nameDiff = a.name.localeCompare(b.name);
  if (nameDiff !== 0) return nameDiff;

  return a.id.localeCompare(b.id);
}

function compareOptionalString(a: string | null, b: string | null): number {
  if (a && !b) return -1;
  if (!a && b) return 1;
  if (a && b) return a.localeCompare(b);
  return 0;
}
