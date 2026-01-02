import { describe, expect, it } from 'vitest';
import { score, scoreWithQuery } from './ranking';
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

    const results = mergeAndRank([itemA, itemB, itemC, itemD], 10, 'chicken');

    expect(results).toHaveLength(2);
    expect(results.find((item) => item.barcode === '111')?.id).toBe('1');
    expect(results.find((item) => item.name.startsWith('Rice'))?.id).toBe('3');
  });

  it('ranks plain strawberry above branded products', () => {
    const plain = buildItem({
      id: '1',
      name: 'Strawberry, raw',
      brand: null,
      source: 'INTERNAL',
      quality: 'HIGH',
      isEstimate: false
    });
    const branded = buildItem({
      id: '2',
      name: 'Strawberry Protein Bar',
      brand: 'BrandCo',
      source: 'OFF',
      quality: 'MED',
      isEstimate: false
    });

    const results = mergeAndRank([branded, plain], 2, 'strawberry');
    expect(results[0].id).toBe('1');
  });

  it('ranks plain chicken breast above prepared meals', () => {
    const plain = buildItem({
      id: '1',
      name: 'Chicken Breast, raw',
      brand: null,
      source: 'INTERNAL',
      quality: 'HIGH',
      isEstimate: false
    });
    const prepared = buildItem({
      id: '2',
      name: 'Chicken Breast Meal Prep Pack',
      brand: 'PrepCo',
      source: 'OFF',
      quality: 'MED',
      isEstimate: false
    });

    const results = mergeAndRank([prepared, plain], 2, 'chicken breast');
    expect(results[0].id).toBe('1');
  });

  it('boosts exact query matches', () => {
    const exact = buildItem({
      id: '1',
      name: 'Rice',
      brand: null,
      source: 'INTERNAL',
      quality: 'MED'
    });
    const prefix = buildItem({
      id: '2',
      name: 'Rice cooked',
      brand: null,
      source: 'INTERNAL',
      quality: 'MED'
    });

    expect(scoreWithQuery(exact, 'rice')).toBeGreaterThan(scoreWithQuery(prefix, 'rice'));
  });
});
