import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import fastifySwagger, { type SwaggerOptions } from '@fastify/swagger';
import fastifySwaggerUi, { type FastifySwaggerUiOptions } from '@fastify/swagger-ui';
import { env } from '../config/env';
import { buildOpenApi } from '../openapi/build';

export default async function openapiPlugin(app: FastifyInstance) {
  if (env.NODE_ENV === 'production' || !env.OPENAPI_ENABLED) {
    return;
  }

  const openapi = buildOpenApi();

  const swaggerPlugin = fastifySwagger as FastifyPluginAsync<SwaggerOptions>;
  const swaggerUiPlugin = fastifySwaggerUi as FastifyPluginAsync<FastifySwaggerUiOptions>;

  await app.register(swaggerPlugin, {
    openapi
  });

  await app.register(swaggerUiPlugin, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    },
    staticCSP: true
  });

  app.get('/openapi.json', async () => openapi);
}
