import type { FastifyInstance } from 'fastify';
import { badRequest, notFound, sendError } from '../../utils/errors';
import { env } from '../../config/env';
import {
  FoodCatalogBarcodeQuerySchema,
  FoodCatalogBarcodeParamSchema,
  FoodCatalogSearchQuerySchema
} from './schemas';
import { getByBarcode, searchCatalog } from './service';
import type { FoodCatalogProvider } from './providers/types';
import { ProviderUnavailable } from './providerGuard';

export type FoodCatalogRoutesOptions = {
  providers?: {
    off?: FoodCatalogProvider;
    usda?: FoodCatalogProvider;
  };
  enableOff?: boolean;
  enableUsda?: boolean;
  internalOnly?: boolean;
  cacheOnlyOnProviderDown?: boolean;
};

export default async function foodCatalogRoutes(
  app: FastifyInstance,
  options: FoodCatalogRoutesOptions = {}
) {
  const searchRateLimit = {
    max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_FOOD_SEARCH_PER_MIN,
    timeWindow: '1 minute'
  };

  const barcodeRateLimit = {
    max: env.NODE_ENV === 'test' ? 1000 : env.RATE_LIMIT_FOOD_BARCODE_PER_MIN,
    timeWindow: '1 minute'
  };

  app.get(
    '/search',
    {
      config: {
        rateLimit: searchRateLimit
      }
    },
    async (request, reply) => {
      const parsed = FoodCatalogSearchQuerySchema.safeParse(request.query ?? {});
      if (!parsed.success) {
        return badRequest(reply, 'Invalid search query', parsed.error.flatten());
      }

      try {
        const items = await searchCatalog(parsed.data.q, parsed.data.limit, options);
        return reply.send({ items });
      } catch (error) {
        if (error instanceof ProviderUnavailable) {
          return sendError(reply, 502, 'provider_unavailable', 'Provider unavailable');
        }
        throw error;
      }
    }
  );

  app.get(
    '/barcode/:ean',
    {
      config: {
        rateLimit: barcodeRateLimit
      }
    },
    async (request, reply) => {
      const parsed = FoodCatalogBarcodeParamSchema.safeParse(request.params ?? {});
      if (!parsed.success) {
        return badRequest(reply, 'Invalid barcode', parsed.error.flatten());
      }

      const queryParsed = FoodCatalogBarcodeQuerySchema.safeParse(request.query ?? {});
      if (!queryParsed.success) {
        return badRequest(reply, 'Invalid barcode query', queryParsed.error.flatten());
      }

      try {
        const item = await getByBarcode(
          parsed.data.ean,
          queryParsed.data.fallbackName,
          options
        );
        if (!item) {
          return notFound(reply, 'Food item not found');
        }

        return reply.send({ items: [item] });
      } catch (error) {
        if (error instanceof ProviderUnavailable) {
          return sendError(reply, 502, 'provider_unavailable', 'Provider unavailable');
        }
        throw error;
      }
    }
  );
}
