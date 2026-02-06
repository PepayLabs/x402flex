import type { ApiClient } from './adapter.js';

type GiftCardCreateRequest = Parameters<ApiClient['giftcards']['create']>[0];
type GiftCardClaimRequest = Parameters<ApiClient['giftcards']['claim']>[0];
type GiftCardRedeemRequest = Parameters<ApiClient['giftcards']['redeem']>[0];
type GiftCardListParams = Parameters<ApiClient['giftcards']['list']>[0];

export function createGiftCard(api: ApiClient, request: GiftCardCreateRequest) {
  return api.giftcards.create(request);
}

export function claimGiftCard(api: ApiClient, request: GiftCardClaimRequest) {
  return api.giftcards.claim(request);
}

export function redeemGiftCard(api: ApiClient, request: GiftCardRedeemRequest) {
  return api.giftcards.redeem(request);
}

export function cancelGiftCard(api: ApiClient, cardId: string) {
  return api.giftcards.cancel(cardId);
}

export function getGiftCard(api: ApiClient, cardId: string) {
  return api.giftcards.get(cardId);
}

export function listGiftCards(api: ApiClient, params?: GiftCardListParams) {
  return api.giftcards.list(params);
}
