import type { ApiClient } from './adapter.js';

export function createGiftCard(api: ApiClient, request: any) {
  return api.giftcards.create(request);
}

export function claimGiftCard(api: ApiClient, request: any) {
  return api.giftcards.claim(request);
}

export function redeemGiftCard(api: ApiClient, request: any) {
  return api.giftcards.redeem(request);
}

export function cancelGiftCard(api: ApiClient, cardId: string) {
  return api.giftcards.cancel(cardId);
}

export function getGiftCard(api: ApiClient, cardId: string) {
  return api.giftcards.get(cardId);
}

export function listGiftCards(api: ApiClient, params?: any) {
  return api.giftcards.list(params as any);
}
