export function createGiftCard(api, request) {
    return api.giftcards.create(request);
}
export function claimGiftCard(api, request) {
    return api.giftcards.claim(request);
}
export function redeemGiftCard(api, request) {
    return api.giftcards.redeem(request);
}
export function cancelGiftCard(api, cardId) {
    return api.giftcards.cancel(cardId);
}
export function getGiftCard(api, cardId) {
    return api.giftcards.get(cardId);
}
export function listGiftCards(api, params) {
    return api.giftcards.list(params);
}
