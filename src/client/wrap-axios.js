function parseChallengeFromAxios(error) {
    const response = error.response;
    if (!response || response.status !== 402)
        return undefined;
    return {
        status: response.status,
        headers: response.headers,
        body: response.data,
    };
}
function toTransportRequest(config) {
    return {
        method: (config.method ?? 'get').toUpperCase(),
        url: config.url,
        headers: config.headers ?? {},
        body: config.data,
    };
}
export function wrapAxiosWithPayment(instance, client) {
    if (!instance.interceptors?.response?.use) {
        return {
            ...instance,
            request: async (config) => {
                let retryCount = 0;
                let currentConfig = { ...config };
                for (;;) {
                    try {
                        return await instance.request(currentConfig);
                    }
                    catch (error) {
                        const challenge = parseChallengeFromAxios(error);
                        if (!challenge || retryCount >= client.maxRetries) {
                            throw error;
                        }
                        const authHeaders = await client.authorize(challenge, toTransportRequest(currentConfig));
                        currentConfig = {
                            ...currentConfig,
                            headers: {
                                ...(currentConfig.headers ?? {}),
                                ...authHeaders,
                            },
                        };
                        retryCount += 1;
                    }
                }
            },
        };
    }
    instance.interceptors.response.use((value) => value, async (error) => {
        const challenge = parseChallengeFromAxios(error);
        if (!challenge) {
            throw error;
        }
        const config = (error.config ?? error.response?.config);
        const retryCount = config.__x402RetryCount ?? 0;
        if (retryCount >= client.maxRetries) {
            throw error;
        }
        const authHeaders = await client.authorize(challenge, toTransportRequest(config));
        return instance.request({
            ...config,
            __x402RetryCount: retryCount + 1,
            headers: {
                ...(config.headers ?? {}),
                ...authHeaders,
            },
        });
    });
    return instance;
}
