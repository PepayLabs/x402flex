import { buildFlexResponse, type FlexAuthorization, type FlexResponse } from '@bnbpay/sdk';

import {
  createFlexMiddleware,
  type FlexMiddlewareContext,
  type FlexMiddlewareHelpers,
} from '../flex-middleware.js';
import { SdkError } from '../core/errors.js';
import type { ProtocolProfile } from '../core/types.js';
import { headersForProfile } from '../profiles/headers.js';
import type { FacilitatorClient } from '../facilitator/client.js';

import { buildDiscoveryMetadata } from './discovery.js';
import { routeKey, type RegisteredRoute, type RouteConfig } from './route-config.js';

export interface ResourceServerOptions {
  merchant: string;
  mode?: 'contracts' | 'facilitator' | 'auto';
  protocolProfile?: ProtocolProfile;
  contracts?: Omit<FlexMiddlewareContext, 'merchant'>;
  facilitator?: FacilitatorClient;
}

export interface ResourceServer {
  registerRoute: (route: RouteConfig) => RegisteredRoute;
  paymentMiddleware: (
    routes?: RouteConfig | RouteConfig[]
  ) => (req: any, res: any, next: (...args: any[]) => unknown) => Promise<unknown>;
  listRoutes: () => RegisteredRoute[];
  discovery: () => ReturnType<typeof buildDiscoveryMetadata>;
}

function extractHeader(req: any, aliases: string[]): string | undefined {
  const headers = req?.headers ?? {};
  for (const alias of aliases) {
    const value = headers[alias] ?? headers[alias.toLowerCase()] ?? headers[alias.toUpperCase()];
    if (!value) continue;
    return Array.isArray(value) ? value[0] : String(value);
  }
  return undefined;
}

function toChallenge(merchant: string, route: RouteConfig, flex?: FlexMiddlewareHelpers): FlexResponse {
  if (flex) {
    return flex.buildFlexResponse({
      merchant,
      accepts: route.accepts,
    });
  }
  return buildFlexResponse({
    merchant,
    accepts: route.accepts,
  });
}

function toRoute(config: RouteConfig): RegisteredRoute {
  return {
    ...config,
    method: config.method.toUpperCase() as RegisteredRoute['method'],
    key: routeKey(config.method, config.path),
  };
}

function normalizeAuth(input: string): FlexAuthorization {
  try {
    return JSON.parse(input) as FlexAuthorization;
  } catch {
    return { network: '', txHash: input };
  }
}

export function createResourceServer(options: ResourceServerOptions): ResourceServer {
  const mode = options.mode ?? 'auto';
  const profile = options.facilitator?.profile
    ?? (options.protocolProfile === 'x402-v2-caip' ? 'x402-v2-caip' : 'bnbpay-v1-flex');
  const headerPolicy = headersForProfile(profile);
  const routes = new Map<string, RegisteredRoute>();
  const flex = options.contracts
    ? createFlexMiddleware({
        merchant: options.merchant,
        ...options.contracts,
      })
    : undefined;

  const registerRoute = (route: RouteConfig): RegisteredRoute => {
    const registered = toRoute(route);
    routes.set(registered.key, registered);
    return registered;
  };

  const listRoutes = () => [...routes.values()];

  const paymentMiddleware = (extraRoutes?: RouteConfig | RouteConfig[]) => {
    if (extraRoutes) {
      const list = Array.isArray(extraRoutes) ? extraRoutes : [extraRoutes];
      for (const route of list) registerRoute(route);
    }

    return async (req: any, res: any, next: (...args: any[]) => unknown) => {
      const key = routeKey(req.method ?? 'GET', req.path ?? req.url ?? '/');
      const route = routes.get(key);
      if (!route) {
        return next();
      }

      const challenge = toChallenge(options.merchant, route, flex);
      const authorizationHeader = extractHeader(req, [
        headerPolicy.paymentAuthorization,
        ...headerPolicy.supportedAuthorizationAliases,
      ]);

      if (!authorizationHeader) {
        if (typeof res.status === 'function') res.status(402);
        if (typeof res.set === 'function') res.set(headerPolicy.paymentRequired, 'true');
        return typeof res.json === 'function'
          ? res.json(challenge)
          : res.send(challenge);
      }

      if (options.facilitator && (mode === 'facilitator' || mode === 'auto')) {
        const settled = await options.facilitator.settle({
          authorization: authorizationHeader,
          challenge,
          context: {
            network: challenge.accepts[0]?.network,
            intent: challenge.accepts[0]?.router?.intent,
          },
        });
        if (!settled.ok) {
          if (typeof res.status === 'function') res.status(402);
          return typeof res.json === 'function' ? res.json(challenge) : res.send(challenge);
        }
        if (typeof res.set === 'function') {
          res.set(headerPolicy.paymentResponse, JSON.stringify(settled.proof ?? { txHash: settled.txHash }));
        }
        return next();
      }

      if (!flex) {
        throw new SdkError('UNSUPPORTED_OPERATION', 'No contract verifier or facilitator configured');
      }

      const settlement = await flex.settleWithRouter({
        authorization: normalizeAuth(authorizationHeader),
        paymentIntent: challenge.accepts[0]?.router?.intent,
        network: challenge.accepts[0]?.network,
      });
      if (!settlement.success) {
        if (typeof res.status === 'function') res.status(402);
        return typeof res.json === 'function' ? res.json(challenge) : res.send(challenge);
      }
      if (typeof res.set === 'function') {
        res.set(headerPolicy.paymentResponse, JSON.stringify(settlement.proof));
      }
      return next();
    };
  };

  return {
    registerRoute,
    paymentMiddleware,
    listRoutes,
    discovery: () => buildDiscoveryMetadata(listRoutes()),
  };
}

