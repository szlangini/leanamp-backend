import type { FastifyInstance } from 'fastify';
import { badRequest, notFound } from '../../utils/errors';
import { WeightCreateSchema, WeightDeleteParamsSchema, WeightQuerySchema } from './schemas';
import { deleteWeighIn, listWeighIns, upsertWeighIn } from './service';

export default async function weightRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const parsed = WeightQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid weight query', parsed.error.flatten());
    }

    const weighIns = await listWeighIns(request.user.id, parsed.data.from, parsed.data.to);
    return reply.send(weighIns);
  });

  app.post('/', async (request, reply) => {
    const parsed = WeightCreateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid weight payload', parsed.error.flatten());
    }

    const weighIn = await upsertWeighIn(request.user.id, parsed.data);
    return reply.send(weighIn);
  });

  app.delete('/:dateISO', async (request, reply) => {
    const parsed = WeightDeleteParamsSchema.safeParse(request.params ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid weight date', parsed.error.flatten());
    }

    const deleted = await deleteWeighIn(request.user.id, parsed.data.dateISO);

    if (!deleted) {
      return notFound(reply, 'Weigh-in not found');
    }

    return reply.status(204).send();
  });
}
