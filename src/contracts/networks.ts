import type { ContractsAdapter } from './adapter.js';

export function listContractNetworks(adapter: ContractsAdapter) {
  return Object.values(adapter.config.networks);
}

