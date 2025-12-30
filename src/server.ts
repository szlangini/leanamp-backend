import { buildApp } from './app';
import { env } from './config/env';

const start = async () => {
  const app = buildApp();

  try {
    await app.listen({ port: env.PORT, host: '0.0.0.0' });
  } catch (err) {
    app.log.error(err, 'server startup failed');
    process.exit(1);
  }
};

start();
