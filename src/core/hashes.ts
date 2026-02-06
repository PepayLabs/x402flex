import {
  hashFlexWitness,
  hashPaymentIntent,
  calculateReferenceHash,
} from '../sdk/index.js';
import { ethers } from 'ethers';

export {
  hashFlexWitness,
  hashPaymentIntent,
  calculateReferenceHash,
};

export function deriveEip3009Nonce(params: {
  intentHash: string;
  router: string;
  chainId: number | bigint;
}) {
  return ethers.solidityPackedKeccak256(
    ['string', 'bytes32', 'address', 'uint256'],
    ['X402Flex', params.intentHash, params.router, params.chainId]
  );
}
