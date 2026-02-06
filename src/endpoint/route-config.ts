import type { FlexAcceptInput } from '@bnbpay/sdk';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD';

export interface RouteConfig {
  method: HttpMethod;
  path: string;
  accepts: FlexAcceptInput[];
  description?: string;
  inputSchema?: Record<string, unknown>;
  outputSchema?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface RegisteredRoute extends RouteConfig {
  key: string;
}

export function routeKey(method: string, path: string): string {
  return `${method.toUpperCase()} ${path}`;
}

