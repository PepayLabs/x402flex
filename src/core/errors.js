export class SdkError extends Error {
    constructor(code, message, details) {
        super(message);
        this.name = 'SdkError';
        this.code = code;
        this.details = details;
    }
}
export function sdkConfigError(message, details) {
    return new SdkError('SDK_CONFIG_ERROR', message, details);
}
export function ensure(condition, code, message) {
    if (!condition) {
        throw new SdkError(code, message);
    }
}
