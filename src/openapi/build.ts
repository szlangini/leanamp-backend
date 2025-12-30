import { readFileSync } from 'fs';
import { resolve } from 'path';
import { createRegistry } from './registry';
import { registerProfilePaths } from './paths/profile';
import { registerFoodPaths } from './paths/food';
import { registerWaterPaths } from './paths/water';
import { registerTrainingPaths } from './paths/training';
import { registerAnalyticsPaths } from './paths/analytics';
import { registerAuthPaths } from './paths/auth';
import { registerAiPaths } from './paths/ai';

function getPackageVersion() {
  try {
    const pkgPath = resolve(process.cwd(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version?: string };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export function buildOpenApi() {
  const registry = createRegistry();
  const paths: Record<string, Record<string, unknown>> = {};

  registerProfilePaths(registry, paths);
  registerAuthPaths(registry, paths);
  registerFoodPaths(registry, paths);
  registerWaterPaths(registry, paths);
  registerTrainingPaths(registry, paths);
  registerAnalyticsPaths(registry, paths);
  registerAiPaths(registry, paths);

  return {
    openapi: '3.1.0',
    info: {
      title: 'leanamp-backend',
      version: getPackageVersion()
    },
    servers: [{ url: 'http://localhost:3001' }],
    paths,
    components: {
      schemas: registry.getSchemas()
    }
  };
}
