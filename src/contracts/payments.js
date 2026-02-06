import { ethers } from 'ethers';
import { canPay, createFlexIntent, sendRouterPayment, payWithPermit2, payWithEIP2612, payWithEIP3009, } from '../sdk/index.js';
import { SdkError } from '../core/errors.js';
function requireContract(adapter, networkRef, field) {
    const network = adapter.resolveNetwork(networkRef);
    const value = network.contracts[field];
    if (!value) {
        throw new SdkError('UNCONFIGURED_NETWORK_CONTRACTS', `Missing ${field} contract for network ${network.caip2}`);
    }
    return value;
}
export function createContractIntent(params) {
    return createFlexIntent(params);
}
export async function canPayOnContracts(adapter, params) {
    const network = adapter.resolveNetwork(params.network);
    const provider = adapter.providerFor(params.network);
    const registryAddress = requireContract(adapter, params.network, 'registry');
    return canPay({
        provider,
        registryAddress,
        token: params.token ?? ethers.ZeroAddress,
        from: params.from,
        to: params.to,
        amount: params.amount,
    });
}
export function sendContractRouterPayment(adapter, params) {
    const { network, routerAddress: overrideRouter, ...rest } = params;
    const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
    return sendRouterPayment({
        ...rest,
        routerAddress,
    });
}
export function sendContractPermit2Payment(adapter, params) {
    const { network, routerAddress: overrideRouter, ...rest } = params;
    const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
    return payWithPermit2({
        ...rest,
        routerAddress,
    });
}
export function sendContractEip2612Payment(adapter, params) {
    const { network, routerAddress: overrideRouter, ...rest } = params;
    const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
    return payWithEIP2612({
        ...rest,
        routerAddress,
    });
}
export function sendContractEip3009Payment(adapter, params) {
    const { network, routerAddress: overrideRouter, ...rest } = params;
    const routerAddress = overrideRouter ?? requireContract(adapter, network, 'router');
    return payWithEIP3009({
        ...rest,
        routerAddress,
    });
}
