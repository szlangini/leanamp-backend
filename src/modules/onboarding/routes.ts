import type { FastifyInstance } from 'fastify';
import { badRequest } from '../../utils/errors';
import { OnboardingUpdateSchema } from './schemas';
import { getOnboardingState, upsertOnboardingState } from './service';

export default async function onboardingRoutes(app: FastifyInstance) {
  app.get('/onboarding', async (request, reply) => {
    const state = await getOnboardingState(request.user.id);
    return reply.send(state);
  });

  app.post('/onboarding', async (request, reply) => {
    const parsed = OnboardingUpdateSchema.safeParse(request.body ?? {});

    if (!parsed.success) {
      return badRequest(reply, 'Invalid onboarding payload', parsed.error.flatten());
    }

    const state = await upsertOnboardingState(request.user.id, parsed.data);
    return reply.send({ status: 'OK', state });
  });
}
