import { sendRouterPayment, payWithPermit2, payWithEIP2612, payWithEIP3009, } from '../../sdk/index.js';
export function executeRouterPayment(params) {
    return sendRouterPayment(params);
}
export function executePermit2Payment(params) {
    return payWithPermit2(params);
}
export function executeEip2612Payment(params) {
    return payWithEIP2612(params);
}
export function executeEip3009Payment(params) {
    return payWithEIP3009(params);
}
