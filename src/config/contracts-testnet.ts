export interface ContractAddressSet {
  router?: string;
  registry?: string;
  sessionStore?: string;
  subscriptions?: string;
  permit2?: string;
}

export const BNB_TESTNET_CONTRACTS: ContractAddressSet = {
  router: '0xf14f56A54E0540768b7bC9877BDa7a3FB9e66E91',
  registry: '0xeF00A0C85F8D36A9E68B1b1808ef4286F0f836Cd',
  sessionStore: '0x4396ace32183FDd7812e62978a8FA0F7Ae11B775',
  permit2: '0x31c2F6fcFf4F8759b3Bd5Bf0e1084A055615c768',
};

