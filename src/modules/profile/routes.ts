import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../utils/errors';
import { ProfileUpdateSchema } from './schemas';
import { getProfile, upsertProfile } from './service';

export default async function profileRoutes(app: FastifyInstance) {
  app.get('/profile', async (request) => {
    return getProfile(request.user.id);
  });

  app.put('/profile', async (request, reply) => {
    const parsed = ProfileUpdateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid profile payload', parsed.error.flatten());
    }

    const profile = await upsertProfile(request.user.id, parsed.data);
    return reply.send(profile);
  });
}
