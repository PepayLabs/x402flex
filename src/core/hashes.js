import { hashFlexWitness, hashPaymentIntent, calculateReferenceHash, } from '../sdk/index.js';
import { ethers } from 'ethers';
export { hashFlexWitness, hashPaymentIntent, calculateReferenceHash, };
export function deriveEip3009Nonce(params) {
    return ethers.solidityPackedKeccak256(['string', 'bytes32', 'address', 'uint256'], ['X402Flex', params.intentHash, params.router, params.chainId]);
}
