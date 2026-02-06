import { BNB_TESTNET_CONTRACTS } from './contracts-testnet.js';
import { CHAIN_REGISTRY } from './chains.js';
const PRESET_TESTNETS = [
    'eip155:97',
    'eip155:11155111',
    'eip155:43113',
    'eip155:84532',
    'eip155:421614',
    'eip155:11155420',
    'eip155:10143',
];
function networkFromRegistry(caip2) {
    const chain = CHAIN_REGISTRY[caip2];
    if (!chain) {
        throw new Error(`Unsupported preset chain: ${caip2}`);
    }
    return {
        chainId: chain.chainId,
        caip2: chain.caip2,
        rpc: {
            http: [...chain.rpcHttpPublic],
            ws: chain.rpcWsPublic ? [...chain.rpcWsPublic] : undefined,
            selection: 'priority',
            quality: 'public-default',
        },
        confirmations: chain.testnet ? 1 : 3,
        contracts: {},
        aliases: chain.aliases,
    };
}
export function buildBnbpayTestnetsPreset() {
    const networks = {};
    for (const caip2 of PRESET_TESTNETS) {
        networks[caip2] = networkFromRegistry(caip2);
    }
    networks['eip155:97'] = {
        ...networks['eip155:97'],
        contracts: {
            ...networks['eip155:97'].contracts,
            ...BNB_TESTNET_CONTRACTS,
        },
    };
    return {
        preset: 'bnbpay-testnets',
        contracts: {
            defaultNetwork: 'eip155:97',
            networks,
        },
    };
}
export function buildPreset(preset) {
    if (!preset || preset === 'none') {
        return {
            preset: 'none',
            contracts: undefined,
        };
    }
    if (preset === 'bnbpay-testnets') {
        return buildBnbpayTestnetsPreset();
    }
    return {
        preset: 'none',
        contracts: undefined,
    };
}
