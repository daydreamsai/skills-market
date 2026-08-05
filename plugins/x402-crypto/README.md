# x402 Crypto

Pay-per-call crypto market data for Lucid Agents via [x402](https://x402.org) micropayments on Base mainnet. No API keys, no signup — payment IS the authentication.

**8 tools · $0.001–$0.002 USDC per call** — up to 50x cheaper than comparable x402 services.

## Tools

| Tool | Description | Price |
|------|-------------|-------|
| `prices` | Live USD prices for 20+ tokens (CoinGecko, 60s cache) | $0.001 |
| `sentiment` | Fear & Greed index + market cap, BTC/ETH dominance | $0.001 |
| `funding` | Perp funding rates (Binance USDT) | $0.001 |
| `indicators` | RSI, MACD, EMA, SMA, volatility, ATR + signals | $0.002 |
| `yields` | Top DeFi yields across 40+ chains (DeFiLlama, 15k+ pools) | $0.001 |
| `gas` | Gas prices on 9 EVM chains (public RPCs, 30s cache) | $0.001 |
| `poolMetrics` | APY/TVL snapshots for Aave V3 / Uniswap V3 pools | $0.001 |
| `freshMarkets` | New AMM pairs in the last N minutes | $0.001 |

## Install

```bash
/plugin marketplace add daydreamsai/skills-market
/plugin install x402-crypto@daydreams-skills
```

## Usage

```ts
import { x402Crypto } from '@daydreamsai/x402-crypto';

const prices = await x402Crypto.prices({ symbols: ['BTC', 'ETH'] });
const sentiment = await x402Crypto.sentiment();
const signals = await x402Crypto.indicators({ symbol: 'ETH', interval: '4h' });
const pools = await x402Crypto.yields({ min_apy: 10, stablecoin_only: true });
```

Each call returns the service output directly. On a 402 response (payment required), the result contains `{ error: "x402 payment required..." }` with the payTo address and amount.

## Payment

- Protocol: x402 (paymentRequirements in 402 response)
- Amount: $0.001–$0.002 USDC per call
- Network: Base mainnet
- Asset: USDC Base (0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913)
- Wallet: 0x61090C6e6Fbdaee9d695c6D164A3ead268AeA4Ac

## Backend services

All 7 backend services are live, discovered via `/.well-known/x402.json`, and listed in [awesome-x402](https://github.com/xpaysh/awesome-x402):

- multi-chain-price-oracle.vercel.app
- crypto-market-sentiment.vercel.app
- technical-indicators-oracle.vercel.app
- defi-yield-aggregator.vercel.app
- multi-chain-gas-oracle.vercel.app
- yield-pool-watcher-five.vercel.app
- fresh-markets-watch.vercel.app

## Data sources

CoinGecko (prices), Binance (funding/klines), Alternative.me (Fear & Greed), DeFiLlama (yields), public RPCs (gas), The Graph (pools), EVM RPCs (new pairs). All free-tier sources with caching.
