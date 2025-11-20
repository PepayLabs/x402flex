import { describe, it, expect, vi } from 'vitest';
import { ethers } from 'ethers';
import { createFlexMiddleware, createFlexExpressMiddleware } from '../src/index';
import { PaymentRegistry__factory } from '@bnbpay/sdk';

class StubProvider {
  private storedReceipt: any = null;
  constructor(private blockNumber: number) {}
  setReceipt(receipt: any) {
    this.storedReceipt = receipt;
  }
  async getTransactionReceipt(hash: string) {
    if (!this.storedReceipt || hash.toLowerCase() !== this.storedReceipt.transactionHash.toLowerCase()) {
      return null;
    }
    return this.storedReceipt;
  }
  async getBlockNumber() {
    return this.blockNumber;
  }
}

const MERCHANT = '0x000000000000000000000000000000000000dEaD';
const REGISTRY_ADDRESS = '0x000000000000000000000000000000000000f00d';
const ROUTER_ADDRESS = '0x000000000000000000000000000000000000cafe';

describe('@bnbpay/x402flex', () => {
  it('applies scheme metadata and session defaults', () => {
    const middleware = createFlexMiddleware({
      merchant: MERCHANT,
      networks: {
        opbnb: {
          provider: new StubProvider(100) as unknown as ethers.Provider,
          registry: REGISTRY_ADDRESS,
          router: ROUTER_ADDRESS,
          chainId: 204,
          confirmations: 1,
        },
      },
    });

    const sessionId = ethers.hexlify(ethers.randomBytes(32));
    const response = middleware.buildFlexResponse({
      session: { sessionId },
      accepts: [
        { scheme: 'push:evm:direct', network: 'opbnb', amount: '1000', asset: 'native' },
      ],
    });

    const option = response.accepts[0];
    expect(option.metadata?.scheme?.id).toEqual('push:evm:direct');
    expect(option.reference).toMatch(/\|session:/);
  });

  it('builds responses with defaults and verifies settlements', async () => {
    const merchant = '0x000000000000000000000000000000000000beef';
    const registry = '0x000000000000000000000000000000000000c0de';
    const router = '0x000000000000000000000000000000000000c0fe';

    const provider = new StubProvider(155);
    const middleware = createFlexMiddleware({
      merchant,
      referenceBuilder: () => 'order_test',
      networks: {
        opbnb: {
          provider: provider as unknown as ethers.Provider,
          registry,
          router,
          chainId: 204,
          confirmations: 1,
        },
      },
    });

    const response = middleware.buildFlexResponse({
      accepts: [
        {
          scheme: 'push:evm:direct',
          network: 'opbnb',
          amount: '1000',
          asset: 'native',
        },
      ],
    });

    const option = response.accepts[0];
    const intent = option.router?.intent;
    if (!intent) throw new Error('Missing router intent');

    const iface = PaymentRegistry__factory.createInterface();
    const payer = '0x000000000000000000000000000000000000face';
    const token = ethers.ZeroAddress;
    const fee = 0n;
    const sessionId = ethers.hexlify(ethers.randomBytes(32));
    const referenceData = `${option.reference}|session:${sessionId}|resource:${intent.resourceId}`;
    const logData = iface.encodeEventLog('PaymentSettledV2', [
      intent.paymentId,
      payer,
      merchant,
      token,
      BigInt(intent.amount),
      fee,
      option.schemeId,
      referenceData,
      intent.resourceId,
      BigInt(Math.floor(Date.now() / 1000)),
    ]);

    const txHash = ethers.hexlify(ethers.randomBytes(32));
    provider.setReceipt({
      transactionHash: txHash,
      blockNumber: 150,
      status: 1,
      logs: [
        {
          address: registry,
          data: logData.data,
          topics: logData.topics,
          blockNumber: 150,
          blockHash: ethers.hexlify(ethers.randomBytes(32)),
          transactionHash: txHash,
          transactionIndex: 0,
          logIndex: 0,
          removed: false,
        },
      ],
    });

    const settlement = await middleware.settleWithRouter({
      authorization: { network: 'opbnb', txHash },
      paymentIntent: intent,
    });

    expect(settlement.success).toBe(true);
    expect(settlement.paymentId).toEqual(intent.paymentId);
    expect(settlement.proof.confirmations).toBeGreaterThanOrEqual(1);
    expect(settlement.reference).toEqual(referenceData);
    expect(settlement.session?.sessionId).toEqual(sessionId);
    expect(settlement.proof.reference).toEqual(referenceData);
  });

  it('attaches session metadata and tags references', () => {
    const merchant = '0x000000000000000000000000000000000000beef';
    const registry = '0x000000000000000000000000000000000000c0de';
    const router = '0x000000000000000000000000000000000000c0fe';

    const middleware = createFlexMiddleware({
      merchant,
      networks: {
        opbnb: {
          provider: new StubProvider(100) as unknown as ethers.Provider,
          registry,
          router,
          chainId: 204,
          confirmations: 1,
        },
      },
    });

    const response = middleware.buildFlexResponse({
      accepts: [
        {
          scheme: 'push:evm:direct',
          network: 'opbnb',
          amount: '1000',
          asset: 'native',
        },
      ],
    });

    const sessionId = ethers.hexlify(ethers.randomBytes(32));
    const scoped = middleware.attachSessionToResponse(response, {
      sessionId,
    });

    const option = scoped.accepts[0];
    expect(option.reference).toMatch(/\|session:/);
    expect(option.metadata?.session?.sessionId).toBeDefined();
  });
});

describe('createFlexExpressMiddleware', () => {
  it('responds with 402 when authorization missing and calls next on success', async () => {
    const flex = createFlexMiddleware({
      merchant: MERCHANT,
      networks: {
        opbnb: {
          provider: new StubProvider(100) as unknown as ethers.Provider,
          registry: REGISTRY_ADDRESS,
          router: ROUTER_ADDRESS,
          chainId: 204,
          confirmations: 1,
        },
      },
    });

    const handler = createFlexExpressMiddleware(flex, {
      '/api/demo': {
        buildResponse: () => ({
          accepts: [
            { scheme: 'push:evm:direct', network: 'opbnb', amount: '1000', asset: 'native' },
          ],
        }),
      },
    });

    const req: any = { path: '/api/demo', headers: {} };
    const res: any = {
      statusCode: 200,
      body: null,
      headers: {},
      status(code: number) { this.statusCode = code; return this; },
      json(payload: any) { this.body = payload; return this; },
      set(key: string, value: string) { this.headers[key] = value; }
    };
    let nextCalled = false;

    await handler(req, res, () => { nextCalled = true; });
    expect(res.statusCode).toEqual(402);
    expect(nextCalled).toEqual(false);
  });
});

it('relays authorization when txHash missing', async () => {
  const relayTx = ethers.hexlify(ethers.randomBytes(32));
  const provider = new StubProvider(160);
  const middleware = createFlexMiddleware({
    merchant: MERCHANT,
    networks: {
      opbnb: {
        provider: provider as unknown as ethers.Provider,
        registry: REGISTRY_ADDRESS,
        router: ROUTER_ADDRESS,
        chainId: 204,
        confirmations: 1,
        relay: {
          endpoint: 'https://relay.local/payments',
          fetchFn: vi.fn().mockResolvedValue({
            ok: true,
            json: async () => ({ txHash: relayTx, blockNumber: 150 }),
          }) as any,
        },
      },
    },
  });

  const requirements = middleware.buildFlexResponse({
    accepts: [{ scheme: 'push:evm:direct', network: 'opbnb', amount: '1000', asset: 'native' }],
  });
  const option = requirements.accepts[0];
  const intent = option.router?.intent!;

  const iface = PaymentRegistry__factory.createInterface();
  const logData = iface.encodeEventLog('PaymentSettledV2', [
    intent.paymentId,
    '0x000000000000000000000000000000000000face',
    MERCHANT,
    ethers.ZeroAddress,
    BigInt(intent.amount),
    0n,
    option.schemeId,
    option.reference,
    intent.resourceId,
    BigInt(Math.floor(Date.now() / 1000)),
  ]);

  provider.setReceipt({
    transactionHash: relayTx,
    blockNumber: 150,
    status: 1,
    logs: [{
      address: REGISTRY_ADDRESS,
      data: logData.data,
      topics: logData.topics,
    }],
  });

  const settlement = await middleware.settleWithRouter({
    authorization: { network: 'opbnb', relayPayload: { intent } },
    paymentIntent: intent,
  });

  expect(settlement.success).toBe(true);
});
