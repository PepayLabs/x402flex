export function listContractNetworks(adapter) {
    return Object.values(adapter.config.networks);
}
