export const tokens = {
    56: {
        BNB: { symbol: "BNB", name: "BNB", decimals: 18, isNative: true, capabilities: { supportsPermit2: false, supportsEIP2612: false, supportsEIP3009: false } },
        USDT: { symbol: "USDT", name: "Tether USD", decimals: 18, address: "0x55d398326f99059ff775485246999027b3197955", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        USDC: { symbol: "USDC", name: "USD Coin", decimals: 18, address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        FDUSD: { symbol: "FDUSD", name: "First Digital USD", decimals: 18, address: "0xc5f0f7b66764f6ec8c8dff7ba683102295e16409", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        BNBUSD: { symbol: "BNBUSD", name: "BNB USD", decimals: 18, address: "0xe9e7cea3dedca5984780bafc599bd69add087d56", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        USD1: { symbol: "USD1", name: "USD1", decimals: 18, address: "0x8d0d000ee44948fc98c9b98a4fa4921476f08b0d", capabilities: { supportsPermit2: true, supportsEIP2612: true, supportsEIP3009: false } },
        WUSD: { symbol: "WUSD", name: "Wrapped USD (not deployed on mainnet)", decimals: 18, address: undefined, capabilities: { supportsPermit2: true, supportsEIP2612: true, supportsEIP3009: false } },
        XUSD: { symbol: "XUSD", name: "XUSD (EIP-3009, not deployed on mainnet)", decimals: 18, address: undefined, capabilities: { supportsPermit2: false, supportsEIP2612: false, supportsEIP3009: true } },
    },
    97: {
        BNB: { symbol: "BNB", name: "BNB", decimals: 18, isNative: true, capabilities: { supportsPermit2: false, supportsEIP2612: false, supportsEIP3009: false } },
        USDT: { symbol: "USDT", name: "Tether USD", decimals: 18, address: "0x337610d27c682e347c9cd60bd4b3b107c9d34ddd", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        USDC: { symbol: "USDC", name: "USD Coin", decimals: 18, address: "0xed24fc36d5ee211ea25a80239fb8c4cfd80f12ee", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        USD1: { symbol: "USD1", name: "USD1", decimals: 18, address: "0xE71Ad4C949dF74c229697b3A8414A0833ABd4165", capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        WUSD: { symbol: "WUSD", name: "Wrapped USD", decimals: 18, address: "0x5e5ecf5e2512719DE778b88191062114Aa771BCf", capabilities: { supportsPermit2: true, supportsEIP2612: true, supportsEIP3009: false } },
        XUSD: { symbol: "XUSD", name: "XUSD", decimals: 18, address: "0xBCa3782BC181446a0bdB87356Bde326559a4FAb2", capabilities: { supportsPermit2: false, supportsEIP2612: false, supportsEIP3009: true } },
        FDUSD: { symbol: "FDUSD", name: "First Digital USD (Not on Testnet)", decimals: 18, address: undefined, capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } },
        BNBUSD: { symbol: "BNBUSD", name: "BNB-Peg BUSD Token (Not on Testnet)", decimals: 18, address: undefined, capabilities: { supportsPermit2: true, supportsEIP2612: false, supportsEIP3009: false } }
    }
};
export const tokenAliases = {
    bnb: "BNB",
    usdt: "USDT",
    usdc: "USDC",
    fdusd: "FDUSD",
    bnbusd: "BNBUSD",
    usd1: "USD1",
    wusd: "WUSD",
    xusd: "XUSD"
};
