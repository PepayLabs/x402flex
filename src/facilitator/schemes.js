import { describeScheme } from '../core/schemes.js';
export const FACILITATOR_SUPPORTED_SCHEMES = [
    'push:evm:direct',
    'push:evm:aa4337',
    'exact:evm:permit2',
    'exact:evm:eip2612',
    'exact:evm:eip3009',
].map((scheme) => describeScheme(scheme));
