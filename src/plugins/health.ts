import type { FastifyInstance } from 'fastify';
import healthRoutes from '../routes/health';

export default async function healthPlugin(app: FastifyInstance) {
  app.register(healthRoutes);
}
