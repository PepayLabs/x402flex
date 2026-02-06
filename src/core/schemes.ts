import { ethers } from 'ethers';

import { SdkError } from './errors.js';

export interface SchemeInfo {
  id: string;
  canonicalName: string;
  sessionCapable: boolean;
  witnessMode: 'intent-hash';
}

const SCHEME_ALIASES: Record<string, string> = {
  'push:evm:direct': 'aa_push',
  'push:evm:aa4337': 'aa_push',
  'exact:evm:permit2': 'permit2',
  'exact:evm:eip2612': 'eip2612',
  'exact:evm:eip3009': 'eip3009',
  aa_push: 'aa_push',
  permit2: 'permit2',
  eip2612: 'eip2612',
  eip3009: 'eip3009',
};

function normalizedAlias(name: string): string {
  return SCHEME_ALIASES[name.toLowerCase()] ?? name;
}

export function resolveSchemeId(scheme: string): string {
  if (!scheme) {
    throw new SdkError('SDK_CONFIG_ERROR', 'scheme is required');
  }
  if (ethers.isHexString(scheme, 32)) {
    return ethers.hexlify(ethers.zeroPadValue(scheme as ethers.BytesLike, 32));
  }
  return ethers.keccak256(ethers.toUtf8Bytes(normalizedAlias(scheme)));
}

export function canonicalSchemeName(scheme: string): string {
  return normalizedAlias(scheme);
}

export function describeScheme(scheme: string): SchemeInfo {
  return {
    id: resolveSchemeId(scheme),
    canonicalName: canonicalSchemeName(scheme),
    sessionCapable: true,
    witnessMode: 'intent-hash',
  };
}

