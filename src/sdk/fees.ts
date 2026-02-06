/**
 * BNBPay Fee Calculation Utilities
 */

import { FeeCalculation } from './types.js';

const MAX_FEE_BPS = 1000; // 10% maximum fee

/**
 * Calculate fee amounts for a payment
 * @param amount Total payment amount in smallest units
 * @param feeBps Fee in basis points (100 = 1%)
 * @returns Fee calculation breakdown
 */
export function calculateFee(amount: string | number, feeBps: number = 0): FeeCalculation {
  const totalAmount = BigInt(amount);
  
  // Ensure fee doesn't exceed maximum
  const cappedFeeBps = Math.min(feeBps, MAX_FEE_BPS);
  
  // Calculate fee amount (amount * feeBps / 10000)
  const feeAmount = (totalAmount * BigInt(cappedFeeBps)) / BigInt(10000);
  
  // Calculate merchant amount (total - fee)
  const merchantAmount = totalAmount - feeAmount;
  
  // Calculate percentage for display
  const feePercentage = (cappedFeeBps / 100).toFixed(2);
  
  return {
    totalAmount: totalAmount.toString(),
    merchantAmount: merchantAmount.toString(),
    feeAmount: feeAmount.toString(),
    feeBps: cappedFeeBps,
    feePercentage: `${feePercentage}%`
  };
}

/**
 * Calculate the total amount needed including fee
 * @param merchantAmount Amount the merchant should receive
 * @param feeBps Fee in basis points
 * @returns Total amount payer needs to send
 */
export function calculateTotalWithFee(merchantAmount: string | number, feeBps: number = 0): string {
  const amount = BigInt(merchantAmount);
  const cappedFeeBps = Math.min(feeBps, MAX_FEE_BPS);
  
  // Calculate total: merchantAmount / (1 - feeBps/10000)
  // Rearranged to avoid division: total = merchantAmount * 10000 / (10000 - feeBps)
  const divisor = BigInt(10000 - cappedFeeBps);
  const total = (amount * BigInt(10000)) / divisor;
  
  return total.toString();
}

/**
 * Validate fee basis points
 * @param feeBps Fee in basis points
 * @returns True if valid, false otherwise
 */
export function isValidFeeBps(feeBps: number): boolean {
  return feeBps >= 0 && feeBps <= MAX_FEE_BPS;
}

/**
 * Format fee for display
 * @param feeBps Fee in basis points
 * @returns Human-readable fee string
 */
export function formatFee(feeBps: number): string {
  if (feeBps === 0) {
    return 'No fee';
  }
  
  const percentage = (feeBps / 100).toFixed(2);
  return `${percentage}% fee`;
}

/**
 * Parse fee from percentage string
 * @param feeStr Fee as percentage string (e.g., "1.5%")
 * @returns Fee in basis points
 */
export function parseFeePercentage(feeStr: string): number {
  const cleaned = feeStr.replace('%', '').trim();
  const percentage = parseFloat(cleaned);
  
  if (isNaN(percentage)) {
    throw new Error('Invalid fee percentage');
  }
  
  const feeBps = Math.round(percentage * 100);
  
  if (!isValidFeeBps(feeBps)) {
    throw new Error(`Fee must be between 0% and ${MAX_FEE_BPS / 100}%`);
  }
  
  return feeBps;
}

/**
 * Get fee breakdown message for user display
 * @param amount Payment amount
 * @param feeBps Fee in basis points
 * @param currency Currency symbol (e.g., "USD", "USDT")
 * @returns User-friendly fee breakdown message
 */
export function getFeeBreakdownMessage(
  amount: string | number,
  feeBps: number,
  currency: string = 'USD'
): string {
  if (feeBps === 0) {
    return `Payment of ${currency} ${amount} with no processing fees`;
  }
  
  const calc = calculateFee(amount, feeBps);
  
  return `Payment of ${currency} ${calc.totalAmount}:
  • Merchant receives: ${currency} ${calc.merchantAmount}
  • Processing fee (${calc.feePercentage}): ${currency} ${calc.feeAmount}`;
}