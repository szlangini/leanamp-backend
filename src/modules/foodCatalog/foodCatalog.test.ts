import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../app';
import { prisma } from '../../db/prisma';
import { getAuthContext, AuthContext } from '../../test/auth';
import type { FoodCatalogProvider } from './providers/types';
import { seedInternalFoods } from '../../../prisma/seed';

const run = process.env.DATABASE_URL ? describe : describe.skip;

run('food catalog api', () => {
  const email = 'catalog-test@leanamp.local';
  const internalEmail = 'catalog-internal@leanamp.local';
  const offEmail = 'catalog-off@leanamp.local';
  let app: ReturnType<typeof buildApp>;
  let auth: AuthContext;

  beforeAll(async () => {
    await prisma.$connect();
    await prisma.foodDbItem.deleteMany();
    await seedInternalFoods(prisma);
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email } });
    app = buildApp();
    auth = await getAuthContext(app, email);
  });

  afterAll(async () => {
    await prisma.foodDbItem.deleteMany();
    await prisma.emailOtp.deleteMany({ where: { email } });
    await prisma.emailOtp.deleteMany({ where: { email: internalEmail } });
    await prisma.emailOtp.deleteMany({ where: { email: offEmail } });
    await prisma.user.deleteMany({ where: { email } });
    await prisma.user.deleteMany({ where: { email: internalEmail } });
    await prisma.user.deleteMany({ where: { email: offEmail } });
    await app.close();
    await prisma.$disconnect();
  });

  it('seeds internal foods', async () => {
    const count = await prisma.foodDbItem.count({ where: { source: 'INTERNAL' } });
    expect(count).toBeGreaterThanOrEqual(220);
  });

  it('search returns internal results', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/food/catalog/search?q=chicken&limit=5',
      headers: auth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items.length).toBeGreaterThan(0);
    expect(body.items.some((item: { source: string }) => item.source === 'INTERNAL')).toBe(true);
  });

  it('validates search and barcode params', async () => {
    const badSearch = await app.inject({
      method: 'GET',
      url: '/food/catalog/search?q=a&limit=5',
      headers: auth.headers
    });

    expect(badSearch.statusCode).toBe(400);

    const badBarcode = await app.inject({
      method: 'GET',
      url: '/food/catalog/barcode/abc',
      headers: auth.headers
    });

    expect(badBarcode.statusCode).toBe(400);

    const badFallback = await app.inject({
      method: 'GET',
      url: '/food/catalog/barcode/12345678?fallbackName=a',
      headers: auth.headers
    });

    expect(badFallback.statusCode).toBe(400);
  });

  it('search skips providers when internal-only', async () => {
    const calls = { off: 0, usda: 0 };
    const offProvider: FoodCatalogProvider = {
      search: async () => {
        calls.off += 1;
        return [];
      },
      barcode: async () => null
    };
    const usdaProvider: FoodCatalogProvider = {
      search: async () => {
        calls.usda += 1;
        return [];
      },
      barcode: async () => null
    };

    const internalOnlyApp = buildApp({
      foodCatalog: {
        providers: { off: offProvider, usda: usdaProvider },
        internalOnly: true,
        enableOff: true,
        enableUsda: true
      }
    });

    const internalAuth = await getAuthContext(internalOnlyApp, internalEmail);

    const response = await internalOnlyApp.inject({
      method: 'GET',
      url: '/food/catalog/search?q=zzzz-nohit&limit=5',
      headers: internalAuth.headers
    });

    expect(response.statusCode).toBe(200);
    expect(calls.off).toBe(0);
    expect(calls.usda).toBe(0);

    await internalOnlyApp.close();
  });

  it('barcode miss returns 404 when internal-only', async () => {
    const internalOnlyApp = buildApp({
      foodCatalog: {
        internalOnly: true,
        enableOff: false
      }
    });

    const internalAuth = await getAuthContext(internalOnlyApp, internalEmail);

    const response = await internalOnlyApp.inject({
      method: 'GET',
      url: '/food/catalog/barcode/0000000000000',
      headers: internalAuth.headers
    });

    expect(response.statusCode).toBe(404);
    await internalOnlyApp.close();
  });

  it('barcode uses provider and caches results', async () => {
    const calls = { barcode: 0, search: 0 };
    const ean = '1234567890123';

    const provider: FoodCatalogProvider = {
      search: async () => {
        calls.search += 1;
        return [];
      },
      barcode: async () => {
        calls.barcode += 1;
        return {
          source: 'OFF',
          externalId: ean,
          barcode: ean,
          name: 'Test Bar',
          brand: 'Test Brand',
          servingSizeG: 50,
          kcalPer100g: 400,
          proteinPer100g: 10,
          fatPer100g: 15,
          carbsPer100g: 50,
          fiberPer100g: 5,
          isEstimate: false,
          quality: 'MED',
          lastFetchedAt: new Date()
        };
      }
    };

    const offApp = buildApp({
      foodCatalog: {
        providers: { off: provider },
        enableOff: true,
        enableUsda: false,
        internalOnly: false
      }
    });

    const offAuth = await getAuthContext(offApp, offEmail);

    const first = await offApp.inject({
      method: 'GET',
      url: `/food/catalog/barcode/${ean}`,
      headers: offAuth.headers
    });

    expect(first.statusCode).toBe(200);
    expect(calls.barcode).toBe(1);

    const second = await offApp.inject({
      method: 'GET',
      url: `/food/catalog/barcode/${ean}`,
      headers: offAuth.headers
    });

    expect(second.statusCode).toBe(200);
    expect(calls.barcode).toBe(1);

    const cached = await prisma.foodDbItem.findFirst({ where: { barcode: ean } });
    expect(cached?.source).toBe('OFF');

    await offApp.close();
  });

  it('barcode prefers OFF match over fallback', async () => {
    const ean = '9999999999999';
    const provider: FoodCatalogProvider = {
      search: async () => [],
      barcode: async () => ({
        source: 'OFF',
        externalId: ean,
        barcode: ean,
        name: 'Test Barcode Item',
        brand: 'OFF Brand',
        servingSizeG: 50,
        kcalPer100g: 400,
        proteinPer100g: 10,
        fatPer100g: 15,
        carbsPer100g: 50,
        fiberPer100g: 5,
        isEstimate: false,
        quality: 'MED',
        lastFetchedAt: new Date()
      })
    };

    const offApp = buildApp({
      foodCatalog: {
        providers: { off: provider },
        enableOff: true,
        enableUsda: false,
        internalOnly: false
      }
    });

    const offAuth = await getAuthContext(offApp, offEmail);

    const response = await offApp.inject({
      method: 'GET',
      url: `/food/catalog/barcode/${ean}?fallbackName=chicken`,
      headers: offAuth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items[0].source).toBe('OFF');

    await offApp.close();
  });

  it('barcode uses internal fallback when providers miss', async () => {
    const ean = '8888888888888';
    const provider: FoodCatalogProvider = {
      search: async () => [],
      barcode: async () => null
    };

    const internalFallbackApp = buildApp({
      foodCatalog: {
        providers: { off: provider },
        enableOff: true,
        enableUsda: false,
        internalOnly: false
      }
    });

    const internalAuth = await getAuthContext(internalFallbackApp, internalEmail);

    const response = await internalFallbackApp.inject({
      method: 'GET',
      url: `/food/catalog/barcode/${ean}?fallbackName=chicken`,
      headers: internalAuth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items[0].source).toBe('INTERNAL');

    await internalFallbackApp.close();
  });

  it('search ranks internal ahead of branded', async () => {
    const offProvider: FoodCatalogProvider = {
      search: async () => [
        {
          source: 'OFF',
          externalId: 'off-branded-1',
          barcode: null,
          name: 'Chicken Breast Soup',
          brand: 'SoupCo',
          servingSizeG: 100,
          kcalPer100g: 120,
          proteinPer100g: 8,
          fatPer100g: 3,
          carbsPer100g: 10,
          fiberPer100g: null,
          isEstimate: true,
          quality: 'LOW',
          lastFetchedAt: new Date()
        }
      ],
      barcode: async () => null
    };

    const rankedApp = buildApp({
      foodCatalog: {
        providers: { off: offProvider },
        enableOff: true,
        enableUsda: false,
        internalOnly: false
      }
    });

    const rankedAuth = await getAuthContext(rankedApp, offEmail);

    const response = await rankedApp.inject({
      method: 'GET',
      url: '/food/catalog/search?q=chicken%20breast&limit=5',
      headers: rankedAuth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items[0].source).toBe('INTERNAL');

    await rankedApp.close();
  });

  it('search de-duplicates barcodes', async () => {
    const calls = { off: 0, usda: 0 };
    const offProvider: FoodCatalogProvider = {
      search: async () => {
        calls.off += 1;
        return [
          {
            source: 'OFF',
            externalId: 'off-1',
            barcode: '3333333333333',
            name: 'Shared Food',
            brand: 'Brand A',
            servingSizeG: 100,
            kcalPer100g: 250,
            proteinPer100g: 10,
            fatPer100g: 5,
            carbsPer100g: 35,
            fiberPer100g: 4,
            isEstimate: false,
            quality: 'MED',
            lastFetchedAt: new Date()
          }
        ];
      }
    };
    const usdaProvider: FoodCatalogProvider = {
      search: async () => {
        calls.usda += 1;
        return [
          {
            source: 'USDA',
            externalId: 'usda-1',
            barcode: '3333333333333',
            name: 'Shared Food',
            brand: null,
            servingSizeG: 100,
            kcalPer100g: 260,
            proteinPer100g: 11,
            fatPer100g: 6,
            carbsPer100g: 34,
            fiberPer100g: 3,
            isEstimate: false,
            quality: 'MED',
            lastFetchedAt: new Date()
          }
        ];
      }
    };

    const mergedApp = buildApp({
      foodCatalog: {
        providers: { off: offProvider, usda: usdaProvider },
        enableOff: true,
        enableUsda: true,
        internalOnly: false
      }
    });

    const mergedAuth = await getAuthContext(mergedApp, offEmail);

    const response = await mergedApp.inject({
      method: 'GET',
      url: '/food/catalog/search?q=zzzz-nohit&limit=5',
      headers: mergedAuth.headers
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.items.length).toBe(1);
    expect(calls.off).toBe(1);
    expect(calls.usda).toBe(1);

    await mergedApp.close();
  });

  it('search uses USDA provider and caches results', async () => {
    const calls = { search: 0 };
    const usdaProvider: FoodCatalogProvider = {
      search: async () => {
        calls.search += 1;
        return [
          {
            source: 'USDA',
            externalId: '12345',
            barcode: null,
            name: 'USDA Test Food',
            brand: null,
            servingSizeG: 100,
            kcalPer100g: 250,
            proteinPer100g: 12,
            fatPer100g: 8,
            carbsPer100g: 30,
            fiberPer100g: 4,
            isEstimate: false,
            quality: 'MED',
            lastFetchedAt: new Date()
          }
        ];
      },
      barcode: async () => null
    };

    const usdaApp = buildApp({
      foodCatalog: {
        providers: { usda: usdaProvider },
        enableOff: false,
        enableUsda: true,
        internalOnly: false
      }
    });

    const usdaAuth = await getAuthContext(usdaApp, offEmail);

    const response = await usdaApp.inject({
      method: 'GET',
      url: '/food/catalog/search?q=usda-only&limit=5',
      headers: usdaAuth.headers
    });

    expect(response.statusCode).toBe(200);
    expect(calls.search).toBe(1);

    const cached = await prisma.foodDbItem.findFirst({ where: { externalId: '12345' } });
    expect(cached?.source).toBe('USDA');

    await usdaApp.close();
  });
});
