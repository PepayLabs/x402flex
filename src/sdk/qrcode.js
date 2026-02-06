/**
 * QR Code generation for BNBPay
 */
import QRCode from 'qrcode';
/**
 * Generate QR code from payment URI
 */
export async function generateQRCode(uri, options = {}) {
    const defaultOptions = {
        width: 400,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
    };
    const qrOptions = {
        ...defaultOptions,
        ...options,
    };
    try {
        // Generate as data URL (base64 PNG)
        return await QRCode.toDataURL(uri, qrOptions);
    }
    catch (error) {
        throw new Error(`Failed to generate QR code: ${error}`);
    }
}
/**
 * Generate QR code as SVG string
 */
export async function generateQRCodeSVG(uri, options = {}) {
    const defaultOptions = {
        width: 400,
        margin: 2,
        color: {
            dark: '#000000',
            light: '#FFFFFF',
        },
        errorCorrectionLevel: 'M',
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
    }
    catch (error) {
        throw new Error(`Failed to generate QR code SVG: ${error}`);
    }
}
/**
 * Generate QR code with BNBPay branding
 */
export async function generateBrandedQRCode(uri, options = {}) {
    // Use BNB Chain colors
    const brandedOptions = {
        ...options,
        color: {
            dark: options.color?.dark || '#F0B90B', // BNB yellow
            light: options.color?.light || '#FFFFFF',
        },
        errorCorrectionLevel: 'H', // High error correction for logo overlay
    };
    return generateQRCode(uri, brandedOptions);
}
