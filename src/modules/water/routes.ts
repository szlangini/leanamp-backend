import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../utils/errors';
import { WaterQuerySchema, WaterUpsertSchema } from './schemas';
import { getWaterLog, upsertWaterLog } from './service';

export default async function waterRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const parsed = WaterQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid date query', parsed.error.flatten());
    }

    const log = await getWaterLog(request.user.id, parsed.data.date);

    return reply.send({
      dateISO: parsed.data.date,
      amountMl: log?.amountMl ?? 0
    });
  });

  app.post('/', async (request, reply) => {
    const parsed = WaterUpsertSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid water payload', parsed.error.flatten());
    }

    const log = await upsertWaterLog(request.user.id, parsed.data);

    return reply.send({
      dateISO: parsed.data.dateISO,
      amountMl: log.amountMl
    });
  });
}
