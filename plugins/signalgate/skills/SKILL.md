# SignalGate Sentiment Skill

Real-time AI-powered crypto market sentiment analysis for BTC, ETH, and SOL.

## Overview

SignalGate uses the x402 micropayment protocol — no API keys needed. Each call costs $0.05 USDC on Base, paid automatically by your agent wallet.

## Usage

```ts
import { signalgateSentiment } from '@daydreamsai/signalgate-sentiment';

const result = await signalgateSentiment.execute({ ticker: 'BTC' });
// {
//   ticker: "BTC",
//   signal: "bullish",
//   confidence: 0.82,
//   reasoning: "Strong on-chain accumulation with positive funding rates"
// }
```

## Input

| Field | Type | Options |
|-------|------|---------||
| ticker | string | BTC, ETH, SOL |

## Output

| Field | Type | Description |
|-------|------|-------------|
| ticker | string | The requested asset |
| signal | string | bullish / bearish / neutral |
| confidence | number | 0.0 - 1.0 |
| reasoning | string | Human-readable explanation |

## Payment

- Protocol: x402
- Amount: $0.05 USDC per call
- Network: Base (L2)
- Wallet: 0x65F204B928a32806FCb364cB8d36B49b647c9f30

## Endpoint

`https://signalgate-web.vercel.app/api/sentiment-x402`