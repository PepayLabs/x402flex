import {
  buildFlexResponse,
  createFlexIntent,
  getFlexSchemeId,
  type FlexResponseInput,
  type CreateFlexIntentParams,
} from '../sdk/index.js';

export function buildX402Route(input: FlexResponseInput) {
  return buildFlexResponse(input);
}

export function createX402Intent(input: CreateFlexIntentParams) {
  return createFlexIntent(input);
}

export { getFlexSchemeId };
