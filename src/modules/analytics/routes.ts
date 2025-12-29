import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../utils/errors';
import { StrengthRangeSchema, SummaryRangeSchema } from './schemas';
import { getStrengthTrends, getSummary } from './service';

export default async function analyticsRoutes(app: FastifyInstance) {
  app.get('/summary', async (request, reply) => {
    const parsed = SummaryRangeSchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid summary query', parsed.error.flatten());
    }

    const rangeDays = Number(parsed.data.range);
    const summary = await getSummary(request.user.id, rangeDays);
    return reply.send(summary);
  });

  app.get('/strength-trends', async (request, reply) => {
    const parsed = StrengthRangeSchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid strength trends query', parsed.error.flatten());
    }

    const rangeDays = Number(parsed.data.range ?? '30');
    const trends = await getStrengthTrends(request.user.id, rangeDays);
    return reply.send(trends);
  });
}
