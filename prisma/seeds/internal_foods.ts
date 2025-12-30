import { Prisma } from '@prisma/client';

type MacroTemplate = {
  name: string;
  kcal: number;
  protein: number;
  fat: number;
  carbs: number;
  fiber: number | null;
  quality?: 'HIGH' | 'MED' | 'LOW';
};

const proteinBases: MacroTemplate[] = [
  { name: 'Chicken breast', kcal: 165, protein: 31, fat: 3.6, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Turkey breast', kcal: 135, protein: 29, fat: 1.5, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Salmon', kcal: 208, protein: 20, fat: 13, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Tuna', kcal: 132, protein: 29, fat: 1, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Cod', kcal: 82, protein: 18, fat: 0.7, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Lean beef', kcal: 250, protein: 26, fat: 15, carbs: 0, fiber: 0, quality: 'LOW' },
  { name: 'Pork loin', kcal: 242, protein: 27, fat: 14, carbs: 0, fiber: 0, quality: 'LOW' },
  { name: 'Egg', kcal: 143, protein: 13, fat: 10, carbs: 1.1, fiber: 0, quality: 'MED' },
  { name: 'Egg white', kcal: 52, protein: 11, fat: 0.2, carbs: 0.7, fiber: 0, quality: 'MED' },
  { name: 'Greek yogurt', kcal: 97, protein: 10, fat: 5, carbs: 4, fiber: 0, quality: 'MED' },
  { name: 'Cottage cheese', kcal: 98, protein: 11, fat: 4.3, carbs: 3.4, fiber: 0, quality: 'MED' },
  { name: 'Tofu', kcal: 144, protein: 15, fat: 8, carbs: 3, fiber: 1, quality: 'MED' },
  { name: 'Tempeh', kcal: 193, protein: 20, fat: 11, carbs: 9, fiber: 7, quality: 'MED' },
  { name: 'Lentils', kcal: 116, protein: 9, fat: 0.4, carbs: 20, fiber: 8, quality: 'MED' },
  { name: 'Shrimp', kcal: 99, protein: 24, fat: 0.3, carbs: 0.2, fiber: 0, quality: 'MED' }
];

const carbBases: MacroTemplate[] = [
  { name: 'White rice', kcal: 130, protein: 2.7, fat: 0.3, carbs: 28, fiber: 0.4, quality: 'MED' },
  { name: 'Brown rice', kcal: 123, protein: 2.7, fat: 1, carbs: 26, fiber: 1.8, quality: 'MED' },
  { name: 'Pasta', kcal: 131, protein: 5, fat: 1.1, carbs: 25, fiber: 1.5, quality: 'MED' },
  { name: 'Oats', kcal: 389, protein: 17, fat: 7, carbs: 66, fiber: 10, quality: 'MED' },
  { name: 'Quinoa', kcal: 120, protein: 4.4, fat: 1.9, carbs: 21, fiber: 2.8, quality: 'MED' },
  { name: 'Potato', kcal: 93, protein: 2.5, fat: 0.1, carbs: 21, fiber: 2.2, quality: 'MED' },
  { name: 'Sweet potato', kcal: 90, protein: 2, fat: 0.2, carbs: 21, fiber: 3.3, quality: 'MED' },
  { name: 'Whole wheat bread', kcal: 247, protein: 13, fat: 4.2, carbs: 41, fiber: 6, quality: 'MED' },
  { name: 'Corn tortilla', kcal: 218, protein: 5.7, fat: 2.9, carbs: 44, fiber: 6.6, quality: 'MED' },
  { name: 'Barley', kcal: 123, protein: 2.3, fat: 0.4, carbs: 28, fiber: 3.8, quality: 'MED' }
];

const vegBases: MacroTemplate[] = [
  { name: 'Broccoli', kcal: 35, protein: 2.4, fat: 0.4, carbs: 7.2, fiber: 3.3, quality: 'HIGH' },
  { name: 'Spinach', kcal: 23, protein: 2.9, fat: 0.4, carbs: 3.6, fiber: 2.2, quality: 'HIGH' },
  { name: 'Kale', kcal: 49, protein: 4.3, fat: 0.9, carbs: 9, fiber: 4.1, quality: 'HIGH' },
  { name: 'Carrot', kcal: 41, protein: 0.9, fat: 0.2, carbs: 10, fiber: 2.8, quality: 'HIGH' },
  { name: 'Bell pepper', kcal: 31, protein: 1, fat: 0.3, carbs: 6, fiber: 2.1, quality: 'HIGH' },
  { name: 'Zucchini', kcal: 17, protein: 1.2, fat: 0.3, carbs: 3.1, fiber: 1, quality: 'HIGH' },
  { name: 'Tomato', kcal: 18, protein: 0.9, fat: 0.2, carbs: 3.9, fiber: 1.2, quality: 'HIGH' },
  { name: 'Cucumber', kcal: 15, protein: 0.7, fat: 0.1, carbs: 3.6, fiber: 0.5, quality: 'HIGH' },
  { name: 'Lettuce', kcal: 15, protein: 1.4, fat: 0.2, carbs: 2.9, fiber: 1.3, quality: 'HIGH' },
  { name: 'Cauliflower', kcal: 25, protein: 1.9, fat: 0.3, carbs: 5, fiber: 2, quality: 'HIGH' }
];

const fruitBases: MacroTemplate[] = [
  { name: 'Apple', kcal: 52, protein: 0.3, fat: 0.2, carbs: 14, fiber: 2.4, quality: 'HIGH' },
  { name: 'Banana', kcal: 89, protein: 1.1, fat: 0.3, carbs: 23, fiber: 2.6, quality: 'HIGH' },
  { name: 'Orange', kcal: 47, protein: 0.9, fat: 0.1, carbs: 12, fiber: 2.4, quality: 'HIGH' },
  { name: 'Strawberry', kcal: 32, protein: 0.7, fat: 0.3, carbs: 7.7, fiber: 2, quality: 'HIGH' },
  { name: 'Blueberries', kcal: 57, protein: 0.7, fat: 0.3, carbs: 14, fiber: 2.4, quality: 'HIGH' },
  { name: 'Grapes', kcal: 69, protein: 0.7, fat: 0.2, carbs: 18, fiber: 0.9, quality: 'HIGH' },
  { name: 'Mango', kcal: 60, protein: 0.8, fat: 0.4, carbs: 15, fiber: 1.6, quality: 'HIGH' },
  { name: 'Pineapple', kcal: 50, protein: 0.5, fat: 0.1, carbs: 13, fiber: 1.4, quality: 'HIGH' }
];

const fatBases: MacroTemplate[] = [
  { name: 'Olive oil', kcal: 884, protein: 0, fat: 100, carbs: 0, fiber: 0, quality: 'MED' },
  { name: 'Butter', kcal: 717, protein: 1, fat: 81, carbs: 0.1, fiber: 0, quality: 'LOW' },
  { name: 'Avocado', kcal: 160, protein: 2, fat: 14.7, carbs: 8.5, fiber: 6.7, quality: 'HIGH' },
  { name: 'Almonds', kcal: 579, protein: 21, fat: 50, carbs: 22, fiber: 12.5, quality: 'MED' },
  { name: 'Peanut butter', kcal: 588, protein: 25, fat: 50, carbs: 20, fiber: 6, quality: 'MED' }
];

const variants = {
  proteins: ['raw', 'cooked', 'grilled', 'roasted'],
  carbs: ['cooked', 'dry', 'boiled', 'baked', 'steamed'],
  veg: ['raw', 'steamed', 'roasted', 'sauteed', 'boiled'],
  fruits: ['raw', 'fresh', 'sliced', 'chopped', 'juice'],
  fats: ['raw', 'roasted', 'cold pressed', 'smooth']
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildSynonyms(baseName: string): Prisma.JsonArray {
  const tokens = baseName
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const list = Array.from(new Set([baseName.toLowerCase(), ...tokens]));
  return list as Prisma.JsonArray;
}

function makeItem(base: MacroTemplate, variant: string): Prisma.FoodDbItemCreateInput {
  const name = `${base.name} (${variant})`;
  const internalSlug = `${slugify(base.name)}_${slugify(variant)}`;

  return {
    source: 'INTERNAL',
    externalId: internalSlug,
    barcode: null,
    name,
    brand: null,
    servingSizeG: 100,
    kcalPer100g: Math.round(base.kcal),
    proteinPer100g: base.protein,
    fatPer100g: base.fat,
    carbsPer100g: base.carbs,
    fiberPer100g: base.fiber ?? null,
    quality: base.quality ?? 'MED',
    isEstimate: true,
    synonyms: buildSynonyms(base.name),
    internalSlug,
    lastFetchedAt: null
  };
}

function expand(baseList: MacroTemplate[], variantList: string[]): Prisma.FoodDbItemCreateInput[] {
  const items: Prisma.FoodDbItemCreateInput[] = [];
  for (const base of baseList) {
    for (const variant of variantList) {
      items.push(makeItem(base, variant));
    }
  }
  return items;
}

export function buildInternalFoods(): Prisma.FoodDbItemCreateInput[] {
  const items = [
    ...expand(proteinBases, variants.proteins),
    ...expand(carbBases, variants.carbs),
    ...expand(vegBases, variants.veg),
    ...expand(fruitBases, variants.fruits),
    ...expand(fatBases, variants.fats)
  ];

  return items;
}
