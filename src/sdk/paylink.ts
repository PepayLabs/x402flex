export type Paylink = {
  recipient: string; // EVM address
  amount?: string; // decimal string
  token?: string; // symbol or address
  reference?: string; // hex string (0x...)
  label?: string;
  message?: string;
  memo?: string;
  network?: "mainnet" | "testnet";
  contractMode?: boolean;
};

export function createPaylink(p: Paylink): string {
  const params = new URLSearchParams();
  if (p.amount) params.set("amount", p.amount);
  if (p.token) params.set("token", p.token);
  if (p.reference) params.set("reference", p.reference);
  if (p.label) params.set("label", p.label);
  if (p.message) params.set("message", p.message);
  if (p.memo) params.set("memo", p.memo);
  if (p.network) params.set("network", p.network);
  if (p.contractMode) params.set("mode", "contract");
  return `bnbpay:${p.recipient}?${params.toString()}`;
}

export function parsePaylink(uri: string): Paylink {
  if (!uri.startsWith("bnbpay:")) throw new Error("Invalid scheme");
  const noScheme = uri.slice("bnbpay:".length);
  const [recipient, qs] = noScheme.split("?");
  const params = new URLSearchParams(qs || "");
  const pl: Paylink = { recipient };
  if (params.has("amount")) pl.amount = params.get("amount") || undefined;
  if (params.has("token")) pl.token = params.get("token") || undefined;
  if (params.has("reference")) pl.reference = params.get("reference") || undefined;
  if (params.has("label")) pl.label = params.get("label") || undefined;
  if (params.has("message")) pl.message = params.get("message") || undefined;
  if (params.has("memo")) pl.memo = params.get("memo") || undefined;
  if (params.has("network")) {
    const n = params.get("network");
    if (n === "mainnet" || n === "testnet") pl.network = n;
  }
  if (params.get("mode") === "contract") pl.contractMode = true;
  return pl;
}

