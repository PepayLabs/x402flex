export class RpcTransport {
    constructor(signer) {
        this.signer = signer;
        this.kind = 'rpc';
        if (!signer) {
            throw new Error('RPC transport requires a signer');
        }
    }
    async send(tx) {
        const response = await this.signer.sendTransaction(tx);
        let chainId;
        try {
            const network = await this.signer.provider?.getNetwork();
            chainId = Number(network?.chainId);
        }
        catch (err) {
            // optional best-effort chainId lookup
        }
        return {
            hash: response.hash,
            chainId,
            response,
        };
    }
}
export class RelayTransport {
    constructor(options) {
        this.kind = 'relay';
        if (!options?.endpoint) {
            throw new Error('RelayTransport requires an endpoint');
        }
        this.endpoint = options.endpoint;
        this.apiKey = options.apiKey;
        this.chainId = options.chainId;
        this.headers = options.headers || {};
        this.fetchFn = options.fetchFn ?? fetch;
        if (!this.fetchFn) {
            throw new Error('RelayTransport requires a fetch implementation');
        }
    }
    async send(tx) {
        const body = {
            to: tx.to,
            data: tx.data,
            value: tx.value ? tx.value.toString() : '0',
            gasLimit: tx.gasLimit?.toString(),
            maxFeePerGas: tx.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
            nonce: tx.nonce,
            chainId: tx.chainId ?? this.chainId,
        };
        const headers = {
            'content-type': 'application/json',
            ...this.headers,
        };
        if (this.apiKey) {
            headers['x-api-key'] = this.apiKey;
        }
        const response = await this.fetchFn(this.endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Relay error (${response.status}): ${text}`);
        }
        const payload = (await response.json());
        const hash = (payload.hash || payload.txHash);
        if (!hash) {
            throw new Error('Relay response missing tx hash');
        }
        return {
            hash,
            chainId: body.chainId,
            relayResponse: payload,
        };
    }
}
