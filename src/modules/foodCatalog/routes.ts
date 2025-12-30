import type { FastifyInstance } from 'fastify';
import { badRequest, notFound } from '../../utils/errors';
import {
  FoodCatalogBarcodeQuerySchema,
  FoodCatalogBarcodeParamSchema,
  FoodCatalogSearchQuerySchema
} from './schemas';
import { getByBarcode, searchCatalog } from './service';
import type { FoodCatalogProvider } from './providers/types';

export type FoodCatalogRoutesOptions = {
  providers?: {
    off?: FoodCatalogProvider;
    usda?: FoodCatalogProvider;
  };
  enableOff?: boolean;
  enableUsda?: boolean;
  internalOnly?: boolean;
};

export default async function foodCatalogRoutes(
  app: FastifyInstance,
  options: FoodCatalogRoutesOptions = {}
) {
  app.get('/search', async (request, reply) => {
    const parsed = FoodCatalogSearchQuerySchema.safeParse(request.query ?? {});
    if (!parsed.success) {
      return badRequest(reply, 'Invalid search query', parsed.error.flatten());
    }

    const items = await searchCatalog(parsed.data.q, parsed.data.limit, options);
    return reply.send({ items });
  });

  app.get('/barcode/:ean', async (request, reply) => {
    const parsed = FoodCatalogBarcodeParamSchema.safeParse(request.params ?? {});
    if (!parsed.success) {
      return badRequest(reply, 'Invalid barcode', parsed.error.flatten());
    }

    const queryParsed = FoodCatalogBarcodeQuerySchema.safeParse(request.query ?? {});
    if (!queryParsed.success) {
      return badRequest(reply, 'Invalid barcode query', queryParsed.error.flatten());
    }

    const item = await getByBarcode(
      parsed.data.ean,
      queryParsed.data.fallbackName,
      options
    );
    if (!item) {
      return notFound(reply, 'Food item not found');
    }

    return reply.send({ items: [item] });
  });
}
