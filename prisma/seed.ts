import { Prisma, PrismaClient } from '@prisma/client';
import { buildInternalFoods } from './seeds/internal_foods';

export async function seedInternalFoods(prisma: PrismaClient) {
  const items = buildInternalFoods();

  for (const item of items) {
    if (!item.internalSlug) {
      continue;
    }

    await prisma.foodDbItem.upsert({
      where: { internalSlug: item.internalSlug },
      update: {
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
        synonyms: item.synonyms as Prisma.InputJsonValue,
        internalSlug: item.internalSlug,
        lastFetchedAt: item.lastFetchedAt
      },
      create: item
    });
  }

  return items.length;
}

async function runSeed() {
  const prisma = new PrismaClient();
  try {
    const count = await seedInternalFoods(prisma);
    console.log(`Seeded ${count} internal foods.`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1] && process.argv[1].includes('prisma/seed.ts')) {
  runSeed().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
