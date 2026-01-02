import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../utils/errors';
import { StepsQuerySchema, StepsUpsertSchema } from './schemas';
import { listSteps, upsertSteps } from './service';

function toDateISO(value: Date) {
  return value.toISOString().slice(0, 10);
}

export default async function stepsRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const parsed = StepsQuerySchema.safeParse(request.query ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid steps query', parsed.error.flatten());
    }

    const rows = await listSteps(request.user.id, parsed.data.from, parsed.data.to);
    const items = rows.map((row) => ({
      dateISO: toDateISO(row.dateISO),
      steps: row.steps
    }));

    return reply.send({ items });
  });

  app.post('/', async (request, reply) => {
    const parsed = StepsUpsertSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid steps payload', parsed.error.flatten());
    }

    const log = await upsertSteps(request.user.id, parsed.data);

    return reply.send({
      status: 'OK',
      item: {
        dateISO: parsed.data.dateISO,
        steps: log.steps
      }
    });
  });
}
