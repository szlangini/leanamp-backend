import { mkdirSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { buildOpenApi } from './build';

const outputDir = resolve(process.cwd(), 'openapi');
const outputPath = resolve(outputDir, 'openapi.json');

mkdirSync(outputDir, { recursive: true });

const spec = buildOpenApi();
writeFileSync(outputPath, JSON.stringify(spec, null, 2) + '\n', 'utf-8');
