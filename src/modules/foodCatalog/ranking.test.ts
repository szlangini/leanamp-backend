import { describe, expect, it } from 'vitest';
import { score } from './ranking';
import { mergeAndRank } from './service';
import type { FoodCatalogItem } from './types';

function buildItem(partial: Partial<FoodCatalogItem> & Pick<FoodCatalogItem, 'id' | 'name'>): FoodCatalogItem {
  return {
    id: partial.id,
    source: partial.source ?? 'INTERNAL',
    externalId: partial.externalId ?? null,
    barcode: partial.barcode ?? null,
    name: partial.name,
    brand: partial.brand ?? null,
    servingSizeG: partial.servingSizeG ?? 100,
    kcalPer100g: partial.kcalPer100g ?? 100,
    proteinPer100g: partial.proteinPer100g ?? 10,
    fatPer100g: partial.fatPer100g ?? 5,
    carbsPer100g: partial.carbsPer100g ?? 10,
    fiberPer100g: partial.fiberPer100g ?? 2,
    isEstimate: partial.isEstimate ?? false,
    quality: partial.quality ?? 'MED'
  };
}

describe('food catalog ranking', () => {
  it('scores higher quality and non-estimate higher', () => {
    const high = buildItem({
      id: '1',
      name: 'High Quality',
      quality: 'HIGH',
      isEstimate: false
    });
    const low = buildItem({
      id: '2',
      name: 'Low Quality',
      quality: 'LOW',
      isEstimate: true
    });

    expect(score(high)).toBeGreaterThan(score(low));
  });

  it('mergeAndRank de-duplicates by barcode and name', () => {
    const itemA = buildItem({
      id: '1',
      name: 'Chicken Breast',
      barcode: '111',
      source: 'INTERNAL',
      quality: 'MED',
      isEstimate: true
    });
    const itemB = buildItem({
      id: '2',
      name: 'Chicken Breast',
      barcode: '111',
      source: 'OFF',
      quality: 'LOW',
      isEstimate: false
    });
    const itemC = buildItem({
      id: '3',
      name: 'Rice cooked',
      barcode: '222',
      source: 'INTERNAL',
      quality: 'MED',
      isEstimate: true
    });
    const itemD = buildItem({
      id: '4',
      name: 'Rice cooked!',
      barcode: '333',
      source: 'OFF',
      quality: 'MED',
      isEstimate: true
    });

    const results = mergeAndRank([itemA, itemB, itemC, itemD], 10);

    expect(results).toHaveLength(2);
    expect(results.find((item) => item.barcode === '111')?.id).toBe('1');
    expect(results.find((item) => item.name.startsWith('Rice'))?.id).toBe('3');
  });
});
