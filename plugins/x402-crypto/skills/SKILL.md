# x402 Crypto Skill

Pay-per-call crypto market data for Lucid Agents via the x402 micropayment protocol. No API keys, no signup — payment IS the authentication. $0.001–$0.002 USDC per call on Base, paid automatically by your agent wallet.

## Tools

| Tool | What it returns | Price |
|------|----------------|-------|
| `cryptoPrices` | Live USD prices for 20+ tokens (BTC, ETH, SOL, USDC...) | $0.001 |
| `marketSentiment` | Fear & Greed index + market cap, BTC/ETH dominance | $0.001 |
| `fundingRate` | Perp funding rate from Binance USDT futures | $0.001 |
| `technicalIndicators` | RSI, MACD, EMA, SMA, volatility, ATR + signals | $0.002 |
| `defiYields` | Top DeFi yields across 40+ chains (DeFiLlama) | $0.001 |
| `gasPrice` | Gas prices on 9 EVM chains | $0.001 |
| `poolMetrics` | APY/TVL for Aave V3 / Uniswap V3 pools | $0.001 |
| `freshMarkets` | New AMM pairs in the last N minutes | $0.001 |

## Usage

```ts
import { cryptoPrices } from '@daydreamsai/x402-crypto';

const prices = await cryptoPrices.execute({ symbols: ['BTC', 'ETH'] });
// { prices: { BTC: { usd: 104250.1 }, ETH: { usd: 3852.4 } } }
```

## Input/Output

### cryptoPrices
- Input: `{ symbols: string[] }` (1–20 tokens)
- Output: `{ prices: { [symbol]: { usd: number } } }`

### marketSentiment
- Input: `{}`
- Output: `{ fear_greed: { value, classification }, market: { total_cap, btc_dominance, eth_dominance } }`

### technicalIndicators
- Input: `{ symbol: string, interval?: "1m"|"5m"|"15m"|"1h"|"4h"|"1d" }`
- Output: `{ symbol, interval, rsi, macd, ema, sma, volatility, atr, signals }`

### defiYields
- Input: `{ min_apy?: number, chain?: string, stablecoin_only?: boolean }`
- Output: `{ pools: [{ chain, project, symbol, apy, tvl }] }`

### gasPrice
- Input: `{ chain: string }` (ethereum, base, arbitrum, optimism, polygon, bsc, avalanche)
- Output: `{ chain, gwei, wei, timestamp }`

## Payment

- Protocol: x402 (paymentRequirements in 402 response)
- Amount: $0.001–$0.002 USDC per call
- Network: Base mainnet
- Asset: USDC Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- Wallet: 0x61090C6e6Fbdaee9d695c6D164A3ead268AeA4Ac

## Endpoints (x402)

All endpoints follow the pattern: `POST https://<service>.vercel.app/entrypoints/<name>/invoke` with body `{"input": {...}}`. A 402 response contains the payment requirements (payTo, maxAmountRequired, asset); pay USDC on Base and retry with the X-PAYMENT header.

Services:
- https://multi-chain-price-oracle.vercel.app
- https://crypto-market-sentiment.vercel.app
- https://technical-indicators-oracle.vercel.app
- https://defi-yield-aggregator.vercel.app
- https://multi-chain-gas-oracle.vercel.app
- https://yield-pool-watcher-five.vercel.app
- https://fresh-markets-watch.vercel.app
