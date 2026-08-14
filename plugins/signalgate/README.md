# SignalGate Sentiment — Daydreams Skill

Real-time AI-powered crypto market sentiment for **BTC**, **ETH**, and **SOL** — powered by the [x402 micropayment protocol](https://x402.org). No API key required. Pay per call, automatically.

---

## How It Works

1. Your agent calls `signalgateSentiment.execute({ ticker: "BTC" })`
2. The skill hits the SignalGate API, which returns a `402 Payment Required`
3. Payment details (wallet, amount, nonce) are parsed from the response
4. A signed `X-Payment` header is built and the request is retried
5. The API returns a sentiment signal — bullish, bearish, or neutral

All of this happens in a single `execute()` call. No wallets to configure manually, no subscriptions.

---

## Usage

```ts
import { signalgateSentiment } from '@daydreamsai/signalgate-sentiment';

const result = await signalgateSentiment.execute({ ticker: 'BTC' });

console.log(result);
// {
//   ticker: "BTC",
//   signal: "bullish",
//   confidence: 0.82,
//   reasoning: "Strong on-chain accumulation with positive funding rates"
// }
```

---

## Input

| Field | Type | Required | Options |
|-------|------|----------|---------||
| `ticker` | `string` | Yes | `BTC`, `ETH`, `SOL` |

## Output

| Field | Type | Description |
|-------|------|-------------|
| `ticker` | `string` | The requested asset |
| `signal` | `string` | `bullish` / `bearish` / `neutral` |
| `confidence` | `number` | Confidence score from `0.0` to `1.0` |
| `reasoning` | `string` | Human-readable explanation of the signal |

---

## Payment Details

| Field | Value |
|-------|-------|
| Protocol | [x402](https://x402.org) |
| Cost | $0.05 USDC per call |
| Network | Base (L2) |
| Wallet | `0x65F204B928a32806FCb364cB8d36B49b647c9f30` |

Payment is handled automatically by the x402 flow inside the skill. The agent runtime settles the micropayment on Base — no manual setup needed.

---

## Live Endpoint

```
GET https://signalgate-web.vercel.app/api/sentiment-x402?ticker=BTC
```

Returns `402` with payment details on first call. Retry with `X-Payment` header to receive sentiment data.

---

## Installation

```bash
# Inside a Daydreams project
pnpm add @daydreamsai/signalgate-sentiment
```

```ts
import { signalgateSentiment } from '@daydreamsai/signalgate-sentiment';
```

---

## License

MIT