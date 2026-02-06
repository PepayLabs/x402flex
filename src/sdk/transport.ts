import type { ethers } from 'ethers';

export interface TransportReceipt {
  hash: string;
  chainId?: number;
  response?: ethers.TransactionResponse;
  relayResponse?: Record<string, unknown>;
}

export interface Transport {
  kind: string;
  send(tx: ethers.TransactionRequest): Promise<TransportReceipt>;
}

export class RpcTransport implements Transport {
  public readonly kind = 'rpc';
  constructor(private readonly signer: ethers.Signer) {
    if (!signer) {
      throw new Error('RPC transport requires a signer');
    }
  }

  async send(tx: ethers.TransactionRequest): Promise<TransportReceipt> {
    const response = await this.signer.sendTransaction(tx);
    let chainId: number | undefined;
    try {
      const network = await this.signer.provider?.getNetwork();
      chainId = Number(network?.chainId);
    } catch (err) {
      // optional best-effort chainId lookup
    }

    return {
      hash: response.hash,
      chainId,
      response,
    };
  }
}

export interface RelayTransportOptions {
  endpoint: string;
  apiKey?: string;
  chainId?: number;
  fetchFn?: typeof fetch;
  headers?: Record<string, string>;
}

export class RelayTransport implements Transport {
  public readonly kind = 'relay';
  private readonly endpoint: string;
  private readonly apiKey?: string;
  private readonly chainId?: number;
  private readonly headers: Record<string, string>;
  private readonly fetchFn: typeof fetch;

  constructor(options: RelayTransportOptions) {
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

  async send(tx: ethers.TransactionRequest): Promise<TransportReceipt> {
    const body: Record<string, unknown> = {
      to: tx.to,
      data: tx.data,
      value: tx.value ? tx.value.toString() : '0',
      gasLimit: tx.gasLimit?.toString(),
      maxFeePerGas: tx.maxFeePerGas?.toString(),
      maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
      nonce: tx.nonce,
      chainId: tx.chainId ?? this.chainId,
    };

    const headers: Record<string, string> = {
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

    const payload = (await response.json()) as Record<string, unknown>;
    const hash = (payload.hash || payload.txHash) as string | undefined;
    if (!hash) {
      throw new Error('Relay response missing tx hash');
    }

    return {
      hash,
      chainId: body.chainId as number | undefined,
      relayResponse: payload,
    };
  }
}
