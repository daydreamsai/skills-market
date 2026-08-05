/**
 * x402 Crypto — pay-per-call crypto market data for Lucid Agents.
 * Aggregates 7 x402 services (prices, sentiment, indicators, yields, gas, pools, new pairs).
 * Payment: x402 micropayments, USDC on Base. No API keys.
 */

interface X402Response {
  status: number;
  body: any;
}

const SERVICES = {
  price: "https://multi-chain-price-oracle.vercel.app/entrypoints/price/invoke",
  sentiment: "https://crypto-market-sentiment.vercel.app/entrypoints/sentiment/invoke",
  funding: "https://crypto-market-sentiment.vercel.app/entrypoints/funding/invoke",
  indicators: "https://technical-indicators-oracle.vercel.app/entrypoints/indicators/invoke",
  yields: "https://defi-yield-aggregator.vercel.app/entrypoints/yields/invoke",
  gas: "https://multi-chain-gas-oracle.vercel.app/entrypoints/gas/invoke",
  pool_metrics: "https://yield-pool-watcher-five.vercel.app/entrypoints/metrics/invoke",
  new_pairs: "https://fresh-markets-watch.vercel.app/entrypoints/scan/invoke",
} as const;

async function invoke(url: string, input: Record<string, any>): Promise<X402Response> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ input }),
  });
  const body = await res.json().catch(() => ({ raw: res.statusText }));
  return { status: res.status, body };
}

function paymentHint(body: any): string {
  const a = body.accepts?.[0];
  return a
    ? `x402 payment required: pay ${a.maxAmountRequired} USDC to ${a.payTo} on ${a.network}, then retry with X-PAYMENT header.`
    : "x402 payment required (402 response contains paymentRequirements).";
}

export const x402Crypto = {
  async prices(input: { symbols: string[] }): Promise<any> {
    const { status, body } = await invoke(SERVICES.price, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async sentiment(): Promise<any> {
    const { status, body } = await invoke(SERVICES.sentiment, {});
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async funding(): Promise<any> {
    const { status, body } = await invoke(SERVICES.funding, {});
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async indicators(input: { symbol: string; interval?: string }): Promise<any> {
    const { status, body } = await invoke(SERVICES.indicators, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async yields(input: { min_apy?: number; chain?: string; stablecoin_only?: boolean }): Promise<any> {
    const { status, body } = await invoke(SERVICES.yields, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async gas(input: { chain: string }): Promise<any> {
    const { status, body } = await invoke(SERVICES.gas, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async poolMetrics(input: { protocols?: string[]; pool_ids?: string[] }): Promise<any> {
    const { status, body } = await invoke(SERVICES.pool_metrics, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
  async freshMarkets(input: { chain?: string; window_minutes?: number; limit?: number }): Promise<any> {
    const { status, body } = await invoke(SERVICES.new_pairs, input);
    return status === 402 ? { error: paymentHint(body) } : (body.output ?? body);
  },
};

export default x402Crypto;
