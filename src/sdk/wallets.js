/**
 * Wallet connection utilities for BNBPay
 */
import { ethers } from 'ethers';
import { NETWORK_METADATA, SUPPORTED_CHAIN_IDS } from './constants.js';
/**
 * Detect available wallets
 */
export function detectWallets() {
    const wallets = [];
    // Check for injected wallets
    if (typeof window !== 'undefined') {
        const win = window;
        // MetaMask
        if (win.ethereum?.isMetaMask) {
            wallets.push({
                name: 'MetaMask',
                available: true,
                type: 'injected',
            });
        }
        // Binance Wallet
        if (win.BinanceChain) {
            wallets.push({
                name: 'Binance Web3 Wallet',
                available: true,
                type: 'injected',
            });
        }
        // Trust Wallet
        if (win.ethereum?.isTrust) {
            wallets.push({
                name: 'Trust Wallet',
                available: true,
                type: 'injected',
            });
        }
        // OKX Wallet
        if (win.okxwallet) {
            wallets.push({
                name: 'OKX Wallet',
                available: true,
                type: 'injected',
            });
        }
        // Rabby Wallet
        if (win.ethereum?.isRabby) {
            wallets.push({
                name: 'Rabby Wallet',
                available: true,
                type: 'injected',
            });
        }
    }
    // WalletConnect is always available as an option
    wallets.push({
        name: 'WalletConnect',
        available: true,
        type: 'walletconnect',
    });
    return wallets;
}
/**
 * Connect to injected wallet (MetaMask, Binance, etc.)
 */
export async function connectInjectedWallet() {
    if (typeof window === 'undefined') {
        throw new Error('No window object - are you in a browser?');
    }
    const win = window;
    if (!win.ethereum) {
        throw new Error('No injected wallet found. Please install MetaMask or another Web3 wallet.');
    }
    // Request account access
    const accounts = await win.ethereum.request({
        method: 'eth_requestAccounts'
    });
    if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your wallet.');
    }
    // Create provider and signer
    const provider = new ethers.BrowserProvider(win.ethereum);
    const signer = await provider.getSigner();
    const network = await provider.getNetwork();
    return {
        address: accounts[0],
        chainId: Number(network.chainId),
        signer,
        provider,
        disconnect: async () => {
            // Most wallets don't have a disconnect method
            // User must disconnect from wallet UI
        },
        switchNetwork: async (chainId) => {
            await switchNetwork(chainId);
        },
    };
}
/**
 * Switch to BNB Chain network
 */
export async function switchNetwork(chainId) {
    if (typeof window === 'undefined') {
        throw new Error('No window object');
    }
    const win = window;
    if (!win.ethereum) {
        throw new Error('No injected wallet found');
    }
    const chainIdHex = '0x' + chainId.toString(16);
    try {
        // Try to switch network
        await win.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chainIdHex }],
        });
    }
    catch (error) {
        // Network not added to wallet
        if (error.code === 4902) {
            const networkParams = getNetworkParams(chainId);
            if (networkParams) {
                // Add the network
                await win.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [networkParams],
                });
            }
            else {
                throw new Error(`Unknown network: ${chainId}`);
            }
        }
        else {
            throw error;
        }
    }
}
/**
 * Get network parameters for adding to wallet
 */
function getNetworkParams(chainId) {
    const meta = NETWORK_METADATA[chainId];
    if (!meta)
        return null;
    return {
        chainId: '0x' + chainId.toString(16),
        chainName: meta.chainName,
        nativeCurrency: meta.nativeCurrency,
        rpcUrls: meta.rpcUrls,
        blockExplorerUrls: meta.blockExplorerUrls,
    };
}
/**
 * Create a provider for BNB Chain
 */
export function createProvider(chainId) {
    const meta = NETWORK_METADATA[chainId];
    if (!meta) {
        throw new Error(`Unsupported chainId ${chainId}. Supported: ${SUPPORTED_CHAIN_IDS.join(', ')}`);
    }
    return new ethers.JsonRpcProvider(meta.rpcUrls[0], chainId);
}
/**
 * Check if connected to correct network
 */
export async function checkNetwork(provider, expectedChainId) {
    const network = await provider.getNetwork();
    return Number(network.chainId) === expectedChainId;
}
