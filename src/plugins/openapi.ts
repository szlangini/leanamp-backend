import type { FastifyInstance } from 'fastify';
import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { env } from '../config/env';
import { buildOpenApi } from '../openapi/build';

export default async function openapiPlugin(app: FastifyInstance) {
  if (!env.OPENAPI_ENABLED) {
    return;
  }

  const openapi = buildOpenApi();

  await app.register(fastifySwagger, {
    openapi,
    exposeRoute: false
  });

  await app.register(fastifySwaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true,
    swaggerOptions: {
      url: '/openapi.json'
    }
  });

  app.get('/openapi.json', async () => openapi);
}
