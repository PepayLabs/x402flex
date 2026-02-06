import type { RouteConfig } from '../../endpoint/route-config.js';
import type { ResourceServer } from '../../endpoint/resource-server.js';

export function createFastifyPaymentMiddleware(server: ResourceServer, routes?: RouteConfig | RouteConfig[]) {
  const middleware = server.paymentMiddleware(routes);
  return async (request: any, reply: any) =>
    middleware(
      {
        method: request.method,
        path: request.routerPath ?? request.routeOptions?.url ?? request.url,
        headers: request.headers,
      },
      {
        status: (statusCode: number) => {
          reply.code(statusCode);
          return reply;
        },
        set: (name: string, value: string) => {
          reply.header(name, value);
        },
        json: (payload: unknown) => reply.send(payload),
        send: (payload: unknown) => reply.send(payload),
      },
      () => Promise.resolve()
    );
}

