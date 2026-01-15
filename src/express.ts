import type { Request, Response, NextFunction } from 'express';
import { FlexResponseInput, FlexSettlementResult } from '@bnbpay/sdk';
import type { FlexMiddlewareHelpers } from './index.js';

export interface ExpressFlexRoute {
  buildResponse: (req: Request) => FlexResponseInput | Promise<FlexResponseInput>;
  onAuthorized?: (req: Request, settlement: FlexSettlementResult) => Promise<void> | void;
  selectPaymentIntent?: (requirements: ReturnType<FlexMiddlewareHelpers['buildFlexResponse']>) => FlexResponseInput['accepts'][number]['router'] extends { intent: infer I } ? I | undefined : any;
  network?: string;
}

export type ExpressFlexRoutes = Record<string, ExpressFlexRoute>;

function getAuthorizationHeader(req: Request): string | undefined {
  const raw = req.headers['x-payment-authorization'];
  if (!raw) return undefined;
  return Array.isArray(raw) ? raw[0] : raw;
}

export function createFlexExpressMiddleware(
  helpers: FlexMiddlewareHelpers,
  routes: ExpressFlexRoutes
) {
  return async function flexMiddleware(req: Request, res: Response, next: NextFunction) {
    const route = routes[req.path];
    if (!route) return next();

    const responseInput = await route.buildResponse(req);
    const requirements = helpers.buildFlexResponse(responseInput);
    const authorizationHeader = getAuthorizationHeader(req);

    if (!authorizationHeader) {
      return res.status(402).json(requirements);
    }

    const settlement = await helpers.settleWithRouter({
      authorization: authorizationHeader,
      paymentIntent: route.selectPaymentIntent
        ? route.selectPaymentIntent(requirements)
        : requirements.accepts[0]?.router?.intent,
      network: route.network,
    });

    if (!settlement.success) {
      return res.status(402).json(requirements);
    }

    res.set('X-PAYMENT-RESPONSE', JSON.stringify(settlement.proof));
    if (route.onAuthorized) {
      await route.onAuthorized(req, settlement);
    }
    return next();
  };
}
