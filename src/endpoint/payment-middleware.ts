import type { RouteConfig } from './route-config.js';
import type { ResourceServer } from './resource-server.js';

export function paymentMiddleware(routeConfig: RouteConfig | RouteConfig[], server: ResourceServer) {
  return server.paymentMiddleware(routeConfig);
}

