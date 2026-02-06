export function buildDiscoveryMetadata(routes) {
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
