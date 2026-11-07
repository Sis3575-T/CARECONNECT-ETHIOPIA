/**
 * CareConnect Ethiopia - Interactive API Documentation Specification
 * Serves comprehensive OpenAPI 3.0.3 specification for core REST endpoints across all domains.
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const specPath = path.resolve(__dirname, '../../../docs/openapi.json');

let cachedSpec = null;
function getOpenApiSpec() {
  if (!cachedSpec) {
    try {
      const raw = fs.readFileSync(specPath, 'utf8');
      cachedSpec = JSON.parse(raw);
    } catch {
      cachedSpec = {
        openapi: '3.0.3',
        info: { title: 'CareConnect Ethiopia REST API', version: '1.0.0' },
        paths: {}
      };
    }
  }
  return cachedSpec;
}

export const openApiSpec = getOpenApiSpec();

const router = Router();

router.get('/', (req, res) => {
  res.json(getOpenApiSpec());
});

router.get('/openapi.json', (req, res) => {
  res.json(getOpenApiSpec());
});

export default router;
