import type { RegisteredRoute } from './route-config.js';

export interface DiscoveryMetadata {
  protocol: 'x402flex';
  version: 1;
  routes: Array<{
    method: string;
    path: string;
    accepts: unknown[];
    description?: string;
    inputSchema?: Record<string, unknown>;
    outputSchema?: Record<string, unknown>;
    extensions?: Record<string, unknown>;
  }>;
}

export function buildDiscoveryMetadata(routes: RegisteredRoute[]): DiscoveryMetadata {
  return {
    protocol: 'x402flex',
    version: 1,
    routes: routes.map((route) => ({
      method: route.method,
      path: route.path,
      accepts: route.accepts,
      description: route.description,
      inputSchema: route.inputSchema,
      outputSchema: route.outputSchema,
      extensions: route.extensions,
    })),
  };
}

