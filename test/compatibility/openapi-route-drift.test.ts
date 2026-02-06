import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../../../../');
const OPENAPI_PATH = path.resolve(REPO_ROOT, 'bnbpay-api/docs/openapi.yaml');
const ROUTES_DIR = path.resolve(REPO_ROOT, 'bnbpay-api/src/api/routes');
const SERVER_PATH = path.resolve(REPO_ROOT, 'bnbpay-api/src/api/server.ts');

const SDK_OPENAPI_PATHS = new Set<string>([
  '/health',
  '/payments',
  '/payments/{paymentId}',
  '/payments/{paymentId}/status',
  '/can-pay',
  '/payments/build-intent',
  '/wallets/{address}/payments',
  '/sessions',
  '/sessions/agent/{address}',
  '/sessions/{sessionId}',
  '/sessions/{sessionId}/spends',
  '/sessions/{sessionId}/payments',
  '/relay/payment',
  '/relay/permit2/bundle',
  '/relay/session/revoke',
  '/relay/session/open',
  '/tokens',
  '/invoices',
  '/invoices/{invoiceId}',
  '/invoices/{invoiceId}/status',
  '/invoices/{invoiceId}/cancel',
  '/invoices/{invoiceId}/stream-sse',
  '/invoices/{invoiceId}/stream',
  '/networks',
]);

function normalizeRoutePath(routePath: string): string {
  return routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}');
}

function parseOpenApiPaths(filePath: string): Set<string> {
  const content = readFileSync(filePath, 'utf8');
  const matches = content.matchAll(/^  (\/[A-Za-z0-9_{}\-\/]+):\s*$/gm);
  const paths = new Set<string>();
  for (const match of matches) {
    paths.add(match[1]);
  }
  return paths;
}

function parseImplementedPaths(filePaths: string[]): Set<string> {
  const pathSet = new Set<string>();
  const routeRegex = /\bapp\.(?:get|post|put|patch|delete)\(\s*'([^']+)'/g;

  for (const filePath of filePaths) {
    const content = readFileSync(filePath, 'utf8');
    for (const match of content.matchAll(routeRegex)) {
      pathSet.add(normalizeRoutePath(match[1]));
    }
  }

  return pathSet;
}

function listRouteFiles(): string[] {
  const files = readdirSync(ROUTES_DIR)
    .filter((fileName) => fileName.endsWith('.ts'))
    .map((fileName) => path.resolve(ROUTES_DIR, fileName));
  return [...files, SERVER_PATH];
}

describe('openapi route drift', () => {
  it('keeps OpenAPI, API handlers, and SDK path map aligned', () => {
    const openApiPaths = parseOpenApiPaths(OPENAPI_PATH);
    const implementedPaths = parseImplementedPaths(listRouteFiles());

    const missingInHandlers = [...openApiPaths].filter((routePath) => !implementedPaths.has(routePath));
    const missingInSdkMap = [...openApiPaths].filter((routePath) => !SDK_OPENAPI_PATHS.has(routePath));

    expect(missingInHandlers).toEqual([]);
    expect(missingInSdkMap).toEqual([]);
  });
});
