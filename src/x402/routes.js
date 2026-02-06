import { buildFlexResponse, createFlexIntent, getFlexSchemeId, } from '../sdk/index.js';
export function buildX402Route(input) {
    return buildFlexResponse(input);
}
export function createX402Intent(input) {
    return createFlexIntent(input);
}
export { getFlexSchemeId };
