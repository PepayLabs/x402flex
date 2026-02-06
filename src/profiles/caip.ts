import { findChain } from '../config/chains.js';

export function asCaip2(ref: string | number): string {
  const chain = findChain(ref);
  if (!chain) {
    throw new Error(`Unsupported chain reference: ${String(ref)}`);
  }
  return chain.caip2;
}

export function fromCaip2(caip2: string): number {
  const chain = findChain(caip2);
  if (!chain) {
    throw new Error(`Unsupported caip2 value: ${caip2}`);
  }
  return chain.chainId;
}

