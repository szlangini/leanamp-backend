import type { FastifyInstance, FastifyRequest } from 'fastify';

const DEFAULT_USER_ID = '00000000-0000-0000-0000-000000000001';

function resolveHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function resolveUserId(request: FastifyRequest): string {
  const devHeader = resolveHeaderValue(request.headers['x-dev-user']);
  const legacyHeader = resolveHeaderValue(request.headers['x-user-id']);
  return devHeader || legacyHeader || DEFAULT_USER_ID;
}

export default function devAuth(app: FastifyInstance) {
  app.decorateRequest('user', null as unknown as { id: string });

  app.addHook('preHandler', async (request) => {
    request.user = { id: resolveUserId(request) };
  });
}

export { DEFAULT_USER_ID };
