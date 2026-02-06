const DEFAULT_LEGACY_BUMP = 0.1; // +10%
const DEFAULT_TIP_MULTIPLIER = 1.2; // +20%
const DEFAULT_MIN_TIP_WEI = 1000000000n; // 1 gwei
const feeCache = new Map();
export async function computeGasFees(options) {
    const { provider, legacyBump = DEFAULT_LEGACY_BUMP, minTipWei = DEFAULT_MIN_TIP_WEI, tipMultiplier = DEFAULT_TIP_MULTIPLIER, maxPriorityFeePerGasCap, maxFeePerGasCap, cacheSeconds = 30, } = options;
    const cacheKey = `fee:${(options.chainId ?? 0)}`;
    const cached = feeCache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expires > now) {
        return cached.fees;
    }
    // Try EIP-1559 via feeHistory
    try {
        const feeHistory = await provider.send("eth_feeHistory", [5, "latest", [50]]);
        const baseFees = feeHistory.baseFeePerGas.map((x) => BigInt(x));
        if (baseFees.length > 0) {
            const baseFeePerGas = baseFees[baseFees.length - 1];
            // priorityFeePerGas from reward array (we asked for 50th percentile)
            const rewards = feeHistory.reward?.[feeHistory.reward.length - 1];
            const medianTip = rewards && rewards.length > 0 ? BigInt(rewards[0]) : minTipWei;
            const tip = clampBigInt((medianTip * BigInt(Math.round(tipMultiplier * 100))) / 100n, minTipWei, maxPriorityFeePerGasCap);
            const maxFeeCandidate = baseFeePerGas * 2n + tip;
            const maxFeePerGas = clampBigInt(maxFeeCandidate, undefined, maxFeePerGasCap);
            const fees = {
                style: "eip1559",
                baseFeePerGas,
                maxPriorityFeePerGas: tip,
                maxFeePerGas,
            };
            feeCache.set(cacheKey, { fees, expires: now + cacheSeconds * 1000 });
            return fees;
        }
    }
    catch {
        // fall back to legacy
    }
    // Legacy path
    const feeData = await provider.getFeeData();
    const gasPrice = feeData.gasPrice ?? 0n;
    const bumped = gasPrice + (gasPrice * BigInt(Math.round(legacyBump * 100))) / 100n;
    const finalGasPrice = clampBigInt(bumped, undefined, maxFeePerGasCap);
    const fees = {
        style: "legacy",
        gasPrice: finalGasPrice,
    };
    feeCache.set(cacheKey, { fees, expires: now + cacheSeconds * 1000 });
    return fees;
}
export function applyGasLimitBuffer(estimate, bufferMultiplier = 1.2, maxGasLimit) {
    const buffered = BigInt(Math.ceil(Number(estimate) * bufferMultiplier));
    const withCap = maxGasLimit ? (buffered > maxGasLimit ? maxGasLimit : buffered) : buffered;
    return { estimate, withBuffer: withCap };
}
function clampBigInt(value, min, max) {
    let v = value;
    if (min !== undefined && value < min)
        v = min;
    if (max !== undefined && v > max)
        v = max;
    return v;
}
