import { ethers } from 'ethers';

import { SdkError } from '../core/errors.js';

import type { ContractsAdapter } from './adapter.js';

const SESSION_STORE_ABI = [
  'function openSession((bytes32 sessionId,address payer,address agent,bytes32 merchantScope,uint64 deadline,uint64 expiresAt,uint64 epoch,uint256 nonce,(uint32 maxTxPerMinute,uint32 maxTxPerDay,uint32 coolDownSeconds) rateLimit,bytes32[] allowedSchemes,(address token,uint256 cap,uint256 dailyCap)[] tokenCaps) grant, bytes signature)',
  'function openClaimableSession((bytes32 sessionId,address payer,bytes32 merchantScope,uint64 deadline,uint64 expiresAt,uint64 epoch,uint256 nonce,address claimSigner,(uint32 maxTxPerMinute,uint32 maxTxPerDay,uint32 coolDownSeconds) rateLimit,bytes32[] allowedSchemes,(address token,uint256 cap,uint256 dailyCap)[] tokenCaps) grant, bytes signature)',
  'function revokeSession(bytes32 sessionId)',
  'function revokeSessionBySig(bytes32 sessionId, uint256 deadline, bytes signature)',
  'function claimSession(bytes32 sessionId, address agent, uint256 deadline, bytes signature)',
  'function getSession(bytes32 sessionId) view returns (tuple(address payer,address agent,bytes32 merchantScope,uint64 expiresAt,uint64 epoch,uint256 nonce,bool revoked,bool claimable,address claimSigner))',
  'function getSessionState(bytes32 sessionId) view returns (tuple(uint64 expiresAt,uint64 epoch,bool revoked,uint64 minuteWindowStart,uint64 dayWindowStart,uint32 txCountInMinute,uint32 txCountInDay,uint64 lastSpendAt))',
  'function getSessionSpendNonce(bytes32 sessionId) view returns (uint256)',
] as const;

function sessionStoreAddress(adapter: ContractsAdapter, network?: string | number): string {
  const cfg = adapter.resolveNetwork(network);
  const address = cfg.contracts.sessionStore;
  if (!address) {
    throw new SdkError(
      'UNCONFIGURED_NETWORK_CONTRACTS',
      `Missing sessionStore contract for network ${cfg.caip2}`
    );
  }
  return address;
}

function contract(adapter: ContractsAdapter, network?: string | number) {
  return new ethers.Contract(
    sessionStoreAddress(adapter, network),
    SESSION_STORE_ABI,
    adapter.providerFor(network)
  );
}

export function getSession(adapter: ContractsAdapter, sessionId: string, network?: string | number) {
  return contract(adapter, network).getSession(sessionId);
}

export function getSessionState(adapter: ContractsAdapter, sessionId: string, network?: string | number) {
  return contract(adapter, network).getSessionState(sessionId);
}

export function getSessionSpendNonce(adapter: ContractsAdapter, sessionId: string, network?: string | number) {
  return contract(adapter, network).getSessionSpendNonce(sessionId);
}

