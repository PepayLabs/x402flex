/**
 * QR Code generation for BNBPay
 */

import QRCode from 'qrcode';

export interface QROptions {
  width?: number;
  margin?: number;
  color?: {
    dark?: string;
    light?: string;
  };
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

/**
 * Generate QR code from payment URI
 */
export async function generateQRCode(
  uri: string,
  options: QROptions = {}
): Promise<string> {
  const defaultOptions = {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M' as const,
  };

  const qrOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    // Generate as data URL (base64 PNG)
    return await QRCode.toDataURL(uri, qrOptions);
  } catch (error) {
    throw new Error(`Failed to generate QR code: ${error}`);
  }
}

/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(
  uri: string,
  options: QROptions = {}
): Promise<string> {
  const defaultOptions = {
    width: 400,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    errorCorrectionLevel: 'M' as const,
  };

  const qrOptions = {
    ...defaultOptions,
    ...options,
  };

  try {
    return await QRCode.toString(uri, {
      ...qrOptions,
      type: 'svg',
    });
  } catch (error) {
    throw new Error(`Failed to generate QR code SVG: ${error}`);
  }
}

/**
 * Generate QR code with BNBPay branding
 */
export async function generateBrandedQRCode(
  uri: string,
  options: QROptions = {}
): Promise<string> {
  // Use BNB Chain colors
  const brandedOptions: QROptions = {
    ...options,
    color: {
      dark: options.color?.dark || '#F0B90B', // BNB yellow
      light: options.color?.light || '#FFFFFF',
    },
    errorCorrectionLevel: 'H', // High error correction for logo overlay
  };

  return generateQRCode(uri, brandedOptions);
}