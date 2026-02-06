import type { ethers } from 'ethers';

export type SdkMode = 'api' | 'contracts' | 'hybrid';
export type ProtocolProfile = 'bnbpay-v1-flex' | 'x402-v2-caip' | 'auto';
export type RuntimeEnvironment = 'production' | 'staging' | 'development' | 'test';
export type RpcSelectionPolicy = 'priority' | 'failover' | 'latency';
export type RpcQuality = 'public-default' | 'recommended-production';

export interface RpcConfig {
  http: string[];
  ws?: string[];
  selection?: RpcSelectionPolicy;
  quality?: RpcQuality;
}

export interface NetworkContractsConfig {
  router?: string;
  registry?: string;
  sessionStore?: string;
  subscriptions?: string;
  permit2?: string;
}

export interface ContractNetworkConfig {
  chainId: number;
  caip2: string;
  rpc: RpcConfig;
  contracts: NetworkContractsConfig;
  confirmations?: number;
  aliases?: string[];
}

export interface ContractsConfig {
  defaultNetwork: string;
  networks: Record<string, ContractNetworkConfig>;
}

export interface ApiConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface SdkConfig {
  mode: SdkMode;
  preset?: 'bnbpay-testnets' | 'none';
  protocolProfile?: ProtocolProfile;
  environment?: RuntimeEnvironment;
  api?: ApiConfig;
  contracts?: {
    defaultNetwork?: string;
    networks?: Record<string, Partial<ContractNetworkConfig>>;
  };
}

export interface ResolvedSdkConfig {
  mode: SdkMode;
  preset: 'bnbpay-testnets' | 'none';
  protocolProfile: Exclude<ProtocolProfile, 'auto'> | 'auto';
  environment: RuntimeEnvironment;
  api?: ApiConfig;
  contracts?: ContractsConfig;
}

export type NetworkRef = string | number;

export interface NetworkDescriptor {
  key: string;
  chainId: number;
  caip2: string;
  name: string;
  testnet: boolean;
  aliases: string[];
  rpcHttpPublic: string[];
  rpcWsPublic?: string[];
  rpcQuality: RpcQuality;
}

export interface PaymentTransportRequest {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface PaymentTransportChallenge {
  status: number;
  headers?: Record<string, string>;
  body?: unknown;
}

export interface BuyerAuthorizationResult {
  authorization: string | Record<string, unknown>;
  network?: string;
  headers?: Record<string, string>;
}

export interface PaymentClientWallet {
  authorizePayment: (
    challenge: PaymentTransportChallenge,
    request: PaymentTransportRequest
  ) => Promise<BuyerAuthorizationResult>;
}

export interface PaymentClientConfig {
  wallet: PaymentClientWallet;
  protocolProfile?: ProtocolProfile;
  maxRetries?: number;
}

export interface SubscriptionCreateRequest {
  payer: string;
  merchant: string;
  token: string;
  amount: bigint;
  startAt: number;
  cadenceKind: 0 | 1;
  cadence: number;
  cancelWindow: number;
  maxPayments: number;
  pullMode: 0 | 1;
  termsHash: string;
  salt: string;
  deadline: number;
}

export interface SubscriptionCancelRequest {
  subId: string;
  deadline: number;
  signature?: string;
}

export interface SubscriptionChargeRequest {
  subId: string;
}

export interface SubscriptionModuleConfig {
  address: string;
  signerOrProvider: ethers.Signer | ethers.Provider;
}

