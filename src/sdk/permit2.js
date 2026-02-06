import { ethers } from 'ethers';
import { hashFlexWitness } from './utils.js';
const RAW_TX_WALLETS = [
    'isRabby',
    'isFrame',
    'isTrust',
    'isOkxWallet',
    'isCoinbaseWallet',
    'isRainbow',
    'isZerion',
    'isTrustWallet',
];
export function detectPermit2WalletLane(ctx = {}) {
    const win = typeof window !== 'undefined' ? window : {};
    const ethereum = ctx.ethereum ?? win.ethereum;
    const binanceChain = ctx.binanceChain ?? win.BinanceChain;
    // Server/agent wallets (ethers.Wallet) are bundle-capable by design.
    if (ctx.signer && ctx.signer instanceof ethers.Wallet) {
        return { lane: 'bundle', walletName: 'server_wallet', reasons: ['server signer can sign raw tx'] };
    }
    const reasons = [];
    let walletName;
    const hasRawTxFlag = ethereum
        ? RAW_TX_WALLETS.some((flag) => ethereum[flag])
        : false;
    const isMetaMask = Boolean(ethereum?.isMetaMask);
    const isBinance = Boolean(binanceChain || ethereum?.isBinanceWallet);
    if (hasRawTxFlag || isBinance) {
        walletName =
            (hasRawTxFlag && RAW_TX_WALLETS.find((flag) => ethereum?.[flag])) ||
                (isBinance ? 'Binance Web3 Wallet' : undefined);
        reasons.push('wallet advertises eth_signTransaction support');
        return { lane: 'bundle', walletName, reasons };
    }
    if (isMetaMask) {
        walletName = 'MetaMask';
        reasons.push('metamask/unknown wallet cannot sign raw tx for bundle lane');
        return { lane: 'sign_only', walletName, reasons };
    }
    reasons.push('unknown wallet; treat as unsupported for gasless Permit2');
    return { lane: 'unsupported', walletName, reasons };
}
export function buildPermit2ApprovalTx(params) {
    const token = ethers.getAddress(params.token);
    const spender = ethers.getAddress(params.permit2Address);
    const iface = new ethers.Interface(['function approve(address spender,uint256 amount)']);
    const data = iface.encodeFunctionData('approve', [spender, params.amount ?? ethers.MaxUint256]);
    const tx = {
        to: token,
        data,
        value: 0n,
        chainId: params.chainId,
        gasLimit: params.gasLimit ?? 60000n,
        maxFeePerGas: params.maxFeePerGas,
        maxPriorityFeePerGas: params.maxPriorityFeePerGas,
    };
    if (params.nonce !== undefined) {
        tx.nonce = params.nonce;
    }
    return tx;
}
export const PERMIT2_WITNESS_TYPESTRING = 'FlexWitness witness)FlexWitness(bytes32 schemeId,bytes32 intentHash,address payer,bytes32 salt)TokenPermissions(address token,uint256 amount)';
export function buildPermit2WitnessTypedData(params) {
    const witnessHash = hashFlexWitness(params.witness);
    const domain = {
        name: 'Permit2',
        chainId: params.chainId,
        verifyingContract: ethers.getAddress(params.permit2Address),
    };
    const types = {
        TokenPermissions: [
            { name: 'token', type: 'address' },
            { name: 'amount', type: 'uint256' },
        ],
        FlexWitness: [
            { name: 'schemeId', type: 'bytes32' },
            { name: 'intentHash', type: 'bytes32' },
            { name: 'payer', type: 'address' },
            { name: 'salt', type: 'bytes32' },
        ],
        PermitWitnessTransferFrom: [
            { name: 'permitted', type: 'TokenPermissions' },
            { name: 'spender', type: 'address' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
            { name: 'witness', type: 'FlexWitness' },
        ],
    };
    return {
        domain,
        types,
        message: {
            permitted: {
                token: ethers.getAddress(params.token),
                amount: BigInt(params.amount),
            },
            spender: ethers.getAddress(params.routerAddress),
            nonce: typeof params.nonce === 'bigint' ? params.nonce : BigInt(params.nonce),
            deadline: Number(params.deadline),
            witness: {
                schemeId: params.witness.schemeId,
                intentHash: params.witness.intentHash,
                payer: ethers.getAddress(params.witness.payer),
                salt: params.witness.salt,
            },
        },
        witnessHash,
        witnessTypeString: params.witnessTypeString ?? PERMIT2_WITNESS_TYPESTRING,
    };
}
