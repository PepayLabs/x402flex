/**
 * BNBPay Payment Module
 */
import { ethers } from 'ethers';
import { encodePaymentURI, decodePaymentURI, generateReferenceId, validatePaymentRequest, isNativeToken, normalizeReference, deriveResourceId, derivePaymentId, hashPaymentIntent, calculateReferenceHash, } from './utils.js';
import { generateQRCode } from './qrcode.js';
import { DEFAULT_EXPIRY_SECONDS, DEFAULT_CONFIRMATION_BLOCKS } from './constants.js';
import { X402FlexRegistry__factory } from './typechain/factories/X402FlexRegistry__factory.js';
import { X402FlexRouter__factory } from './typechain/factories/X402FlexRouter__factory.js';
// X402FlexRegistry ABI (synced via export script)
export const PAYMENT_REGISTRY_ABI = X402FlexRegistry__factory.abi;
const SCHEME_AA_PUSH = ethers.keccak256(ethers.toUtf8Bytes('aa_push'));
const PAYMENT_REGISTRY_INTERFACE = X402FlexRegistry__factory.createInterface();
const PAYMENT_SETTLED_TOPIC = PAYMENT_REGISTRY_INTERFACE.getEvent('PaymentSettledV2').topicHash;
// ERC20 ABI (minimal)
const ERC20_ABI = [
    'function transfer(address to, uint256 amount) external returns (bool)',
    'function approve(address spender, uint256 amount) external returns (bool)',
    'function allowance(address owner, address spender) external view returns (uint256)',
    'function balanceOf(address account) external view returns (uint256)',
];
/**
 * Create a payment request
 */
export function createPaymentRequest(options) {
    const request = {
        v: 1,
        chainId: options.chainId,
        recipient: options.recipient,
        amount: options.amount,
        currency: options.currency,
        token: options.token,
        referenceId: options.referenceId ? normalizeReference(options.referenceId) : generateReferenceId(),
        label: options.label,
        message: options.message,
        expires: options.expires || Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS,
        metadata: options.metadata,
        capabilities: options.capabilities || ['payments'],
    };
    validatePaymentRequest(request);
    const uri = encodePaymentURI(request);
    return { uri };
}
/**
 * Create payment request with QR code
 */
export async function createPaymentRequestWithQR(options) {
    const { uri } = createPaymentRequest(options);
    const qrCode = await generateQRCode(uri);
    return { uri, qrCode };
}
/**
 * Parse payment URI
 */
export function parsePaymentURI(uri) {
    return decodePaymentURI(uri);
}
/**
 * Build payment transaction
 */
export async function buildPaymentTransaction(provider, request, tokenAmount, mode = 'direct', routerAddressOrUnused, options) {
    const isNative = !request.token || isNativeToken(request.token);
    if (mode === 'direct') {
        // Direct transfer mode
        if (isNative) {
            // Native BNB transfer
            return {
                to: request.recipient,
                value: tokenAmount,
                data: '0x',
                ...options,
            };
        }
        else {
            // ERC20 transfer
            const tokenContract = new ethers.Contract(request.token, ERC20_ABI, provider);
            const data = tokenContract.interface.encodeFunctionData('transfer', [
                request.recipient,
                tokenAmount,
            ]);
            return {
                to: request.token,
                data,
                value: 0n,
                ...options,
            };
        }
    }
    else {
        const routerAddress = options?.routerAddress ?? routerAddressOrUnused;
        if (!routerAddress) {
            throw new Error('Router address required for contract mode');
        }
        const router = X402FlexRouter__factory.connect(routerAddress, provider);
        const referenceData = normalizeReference(request.referenceId);
        const deadline = options?.deadline ?? Math.floor(Date.now() / 1000) + DEFAULT_EXPIRY_SECONDS;
        const schemeId = options?.schemeId ?? SCHEME_AA_PUSH;
        const tokenAddress = request.token || ethers.ZeroAddress;
        const derivedResource = options?.resourceId
            ? { resourceId: options.resourceId }
            : deriveResourceId({
                merchant: request.recipient,
                referenceId: referenceData,
                token: tokenAddress,
                amount: tokenAmount,
                chainId: request.chainId,
                salt: options?.resourceSalt,
            });
        const resourceId = derivedResource.resourceId;
        const referenceHash = calculateReferenceHash(referenceData);
        if (options?.paymentId && !options.nonce) {
            throw new Error('nonce is required when paymentId is provided');
        }
        const nonce = options?.nonce ?? ethers.hexlify(ethers.randomBytes(32));
        const expectedPaymentId = derivePaymentId({
            token: tokenAddress,
            amount: tokenAmount,
            deadline,
            resourceId,
            referenceHash,
            nonce,
        });
        if (options?.paymentId && options.paymentId.toLowerCase() !== expectedPaymentId.toLowerCase()) {
            throw new Error('paymentId does not match intent fields');
        }
        const paymentId = options?.paymentId ?? expectedPaymentId;
        const txOverrides = { ...(options || {}) };
        delete txOverrides.routerAddress;
        delete txOverrides.paymentId;
        delete txOverrides.resourceId;
        delete txOverrides.resourceSalt;
        delete txOverrides.deadline;
        delete txOverrides.schemeId;
        delete txOverrides.witness;
        const intent = {
            paymentId,
            merchant: request.recipient,
            token: tokenAddress,
            amount: tokenAmount,
            deadline,
            payer: options?.witness?.payer ? ethers.getAddress(options.witness.payer) : ethers.ZeroAddress,
            resourceId,
            referenceHash,
            nonce,
        };
        const intentHash = hashPaymentIntent(intent);
        if (options?.witness) {
            if (!options.witness.payer) {
                throw new Error('Witness payer address is required when witness data is provided');
            }
            if (!options.witness.signature) {
                throw new Error('Witness signature is required when witness data is provided');
            }
        }
        const witness = options?.witness
            ? {
                schemeId: options.witness.schemeId ?? schemeId,
                intentHash,
                payer: options.witness.payer,
                salt: options.witness.salt ?? ethers.ZeroHash,
            }
            : {
                schemeId,
                intentHash,
                payer: ethers.ZeroAddress,
                salt: ethers.ZeroHash,
            };
        const witnessSignature = options?.witness?.signature ?? '0x';
        const routerInterface = router.interface;
        if (isNative) {
            const data = routerInterface.encodeFunctionData('depositAndSettleNative', [
                intent,
                witness,
                witnessSignature,
                referenceData,
            ]);
            return {
                to: routerAddress,
                data,
                value: tokenAmount,
                ...txOverrides,
            };
        }
        const data = routerInterface.encodeFunctionData('depositAndSettleToken', [
            intent,
            witness,
            witnessSignature,
            referenceData,
        ]);
        return {
            to: routerAddress,
            data,
            value: 0n,
            ...txOverrides,
        };
    }
}
/**
 * Preflight helper that mirrors X402FlexRegistry.canPay.
 * Returns { ok, reason } where ok=false indicates a blocking condition.
 */
export async function canPay(params) {
    const { provider, registryAddress, token, from, to, amount } = params;
    const registry = X402FlexRegistry__factory.connect(ethers.getAddress(registryAddress), provider);
    const [ok, reason] = await registry.canPay(ethers.getAddress(token), ethers.getAddress(from), ethers.getAddress(to), amount);
    return { ok, reason };
}
/**
 * Verify payment on-chain
 */
export async function verifyPayment(options) {
    const { provider, txHash, minConfirmations } = options;
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt) {
        return {
            status: 'pending',
            txHash,
            confirmations: 0,
            chainId: Number((await provider.getNetwork()).chainId),
            from: '',
            to: '',
            token: '',
            amount: '0',
            error: 'Transaction not found',
        };
    }
    // Get current block for confirmations
    const currentBlock = await provider.getBlockNumber();
    const confirmations = Number(currentBlock) - receipt.blockNumber + 1;
    // Get transaction details
    const tx = await provider.getTransaction(txHash);
    if (!tx) {
        throw new Error('Transaction not found');
    }
    // Get block for timestamp
    const block = await provider.getBlock(receipt.blockNumber);
    if (!block) {
        throw new Error('Block not found');
    }
    // Determine if transaction succeeded
    const chainId = Number((await provider.getNetwork()).chainId);
    const minConf = minConfirmations || DEFAULT_CONFIRMATION_BLOCKS[chainId] || 1;
    const isConfirmed = receipt.status === 1 && confirmations >= minConf;
    // Parse payment details from logs if using X402FlexRegistry
    let referenceId = options.referenceId;
    let referenceHash;
    let token = options.expectedToken || ethers.ZeroAddress;
    let amount = tx.value.toString();
    let feeAmount;
    let netAmount;
    let paymentId;
    let schemeId;
    let payerAddress = tx.from;
    let merchantAddress = tx.to || '';
    let resourceId;
    // Look for PaymentSettledV2 event in logs
    const paymentSettledEvent = receipt.logs.find((log) => log.topics[0] === PAYMENT_SETTLED_TOPIC);
    if (paymentSettledEvent) {
        const parsedLog = PAYMENT_REGISTRY_INTERFACE.parseLog({
            topics: paymentSettledEvent.topics,
            data: paymentSettledEvent.data,
        });
        if (parsedLog) {
            paymentId = parsedLog.args[0];
            payerAddress = parsedLog.args[1];
            merchantAddress = parsedLog.args[2];
            token = parsedLog.args[3];
            amount = parsedLog.args[4].toString();
            const eventFeeAmount = parsedLog.args[5].toString();
            feeAmount = eventFeeAmount;
            schemeId = ethers.hexlify(parsedLog.args[6]);
            referenceId = parsedLog.args[7];
            if (parsedLog.args.length >= 10) {
                referenceHash = ethers.hexlify(parsedLog.args[8]);
                resourceId = ethers.hexlify(parsedLog.args[9]);
            }
            else {
                resourceId = ethers.hexlify(parsedLog.args[8]);
            }
            const feeBig = BigInt(eventFeeAmount);
            netAmount = (BigInt(amount) - feeBig).toString();
        }
    }
    return {
        status: isConfirmed ? 'confirmed' : receipt.status === 0 ? 'failed' : 'pending',
        txHash,
        confirmations,
        chainId: Number((await provider.getNetwork()).chainId),
        from: payerAddress,
        to: merchantAddress,
        token,
        amount,
        paymentId,
        schemeId,
        feeAmount,
        netAmount,
        referenceId,
        referenceHash,
        resourceId,
        blockNumber: receipt.blockNumber,
        timestamp: block.timestamp,
    };
}
/**
 * Check if a paymentId has already been settled
 */
export async function isPaymentSettled(provider, paymentRegistry, merchant, paymentId) {
    const registry = X402FlexRegistry__factory.connect(paymentRegistry, provider);
    return await registry.isPaymentSettled(merchant, paymentId);
}
/**
 * Approve token spending
 */
export async function approveToken(signer, tokenAddress, spenderAddress, amount) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    return await token.approve(spenderAddress, amount);
}
/**
 * Check token allowance
 */
export async function checkAllowance(provider, tokenAddress, ownerAddress, spenderAddress) {
    const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
    return await token.allowance(ownerAddress, spenderAddress);
}
/**
 * Get token balance
 */
export async function getTokenBalance(provider, tokenAddress, accountAddress) {
    if (isNativeToken(tokenAddress)) {
        return await provider.getBalance(accountAddress);
    }
    else {
        const token = new ethers.Contract(tokenAddress, ERC20_ABI, provider);
        return await token.balanceOf(accountAddress);
    }
}
