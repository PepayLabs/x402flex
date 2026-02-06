function getAuthorizationHeader(req) {
    const raw = req.headers['x-payment-authorization'];
    if (!raw)
        return undefined;
    return Array.isArray(raw) ? raw[0] : raw;
}
export function createFlexExpressMiddleware(helpers, routes) {
    return async function flexMiddleware(req, res, next) {
        const route = routes[req.path];
        if (!route)
            return next();
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
