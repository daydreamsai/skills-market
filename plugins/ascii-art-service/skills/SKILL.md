---
name: ascii-art-service
description: |
  Paid ASCII art generation service with x402 payment integration. 
  Convert images and text prompts into ASCII art with customizable character sets.
  
  Activate when: Building an ASCII art endpoint, integrating x402 payments for 
  image processing services, or creating paid generative art APIs.

see-also:
  - https://github.com/daydreamsai/lucid-agents: Lucid Agents SDK
  - https://x402.org: x402 payment protocol
---

# ASCII Art Service

Paid ASCII art generation endpoint with x402 payment integration. Convert images 
and text prompts into customizable ASCII art.

## Overview

This service provides a paid endpoint for generating ASCII art from:
- Image URLs (fetched and converted)
- Text prompts (generates image via AI, then converts)

**Pricing:** $0.01 per conversion (configurable)

**Character Sets:**
- `minimal`: `@%#*+=-:. ` (10 chars)
- `standard`: `$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^\`'. ` (70 chars)
- `blocks`: `█▓▒░ ` (5 chars)
- `braille`: `⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏` (16 patterns)

## Quick Start

### 1. Install Dependencies

```bash
bun install @lucid-agents/core @lucid-agents/hono @lucid-agents/payments zod
```

### 2. Create the Service

```typescript
import { createAgent } from '@lucid-agents/core';
import { http } from '@lucid-agents/http';
import { payments, paymentsFromEnv } from '@lucid-agents/payments';
import { createAgentApp } from '@lucid-agents/hono';
import { z } from 'zod';

const agent = await createAgent({
  name: 'ascii-art-service',
  version: '1.0.0',
  description: 'Paid ASCII art generation endpoint',
})
  .use(http())
  .use(payments({
    config: {
      ...paymentsFromEnv(),
      receivableAddress: process.env.RECEIVABLE_ADDRESS!,
      network: process.env.NETWORK as 'base' | 'base-sepolia',
    },
    storage: { type: 'sqlite' },
  }))
  .build();

const { app, addEntrypoint } = await createAgentApp(agent);

addEntrypoint({
  key: 'generate',
  description: 'Generate ASCII art from image or prompt',
  price: 1000, // $0.01 USDC (6 decimals: 1000 = $0.001)
  input: z.object({
    source: z.union([
      z.object({ type: z.literal('url'), url: z.string().url() }),
      z.object({ type: z.literal('prompt'), prompt: z.string().min(1) }),
    ]),
    charset: z.enum(['minimal', 'standard', 'blocks', 'braille']).default('standard'),
    width: z.number().int().min(20).max(120).default(60),
  }),
  async handler({ input, agent }) {
    // Verify payment was received
    await agent.payments.verifyPayment(ctx);
    
    // Generate ASCII art
    const ascii = await generateASCII({
      source: input.source,
      charset: CHARSETS[input.charset],
      width: input.width,
    });
    
    return {
      output: {
        ascii,
        charset: input.charset,
        dimensions: { width: input.width, height: ascii.split('\n').length },
      },
    };
  },
});

export default {
  port: Number(process.env.PORT ?? 3000),
  fetch: app.fetch,
};
```

### 3. Environment Variables

```bash
# Required
RECEIVABLE_ADDRESS=0xYourAddress
NETWORK=base-sepolia  # or 'base' for mainnet

# Optional
PORT=3000
DATABASE_URL=sqlite:./payments.db
```

### 4. Run the Service

```bash
bun run src/index.ts
```

## Character Sets

Define as constants:

```typescript
const CHARSETS = {
  minimal: '@%#*+=-:. ',
  standard: '$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^\`\'. ',
  blocks: '█▓▒░ ',
  braille: '⠀⠁⠂⠃⠄⠅⠆⠇⠈⠉⠊⠋⠌⠍⠎⠏',
};
```

## ASCII Generation Implementation

```typescript
import { Image } from 'image-js';
import fetch from 'node-fetch';

async function generateASCII({
  source,
  charset,
  width,
}: {
  source: { type: 'url'; url: string } | { type: 'prompt'; prompt: string };
  charset: string;
  width: number;
}): Promise<string> {
  // Get image
  let imageData: ArrayBuffer;
  
  if (source.type === 'prompt') {
    // Generate image via AI service (e.g., DALL-E, Stability)
    imageData = await generateImageFromPrompt(source.prompt);
  } else {
    // Fetch image from URL
    const response = await fetch(source.url);
    imageData = await response.arrayBuffer();
  }
  
  // Process image
  const image = await Image.load(imageData);
  const grayscale = image.grey();
  
  // Resize maintaining aspect ratio
  const aspectRatio = image.height / image.width;
  const targetWidth = width;
  const targetHeight = Math.round(width * aspectRatio * 0.5); // 0.5 for char aspect
  
  const resized = grayscale.resize({
    width: targetWidth,
    height: targetHeight,
  });
  
  // Map pixels to characters
  let ascii = '';
  const chars = charset;
  
  for (let y = 0; y < resized.height; y++) {
    for (let x = 0; x < resized.width; x++) {
      const pixel = resized.getPixelXY(x, y)[0];
      const charIndex = Math.floor((pixel / 255) * (chars.length - 1));
      ascii += chars[charIndex];
    }
    ascii += '\n';
  }
  
  return ascii;
}
```

## Payment Configuration

### Price Tiers

```typescript
const PRICE_TIERS = {
  minimal: 500,      // $0.005
  standard: 1000,    // $0.01
  hd: 2500,          // $0.025 (higher resolution)
};

// Usage in entrypoint
addEntrypoint({
  key: 'generate',
  price: ({ input }) => PRICE_TIERS[input.quality ?? 'standard'],
  // ...
});
```

### Webhook for Payment Confirmation

```typescript
addEntrypoint({
  key: 'webhook',
  description: 'Handle x402 payment webhooks',
  input: z.object({
    paymentId: z.string(),
    status: z.enum(['confirmed', 'failed']),
  }),
  async handler({ input, agent }) {
    await agent.payments.handleWebhook(input);
    return { output: { received: true } };
  },
});
```

## Client Usage

### TypeScript Client

```typescript
import { paymentsClient } from '@lucid-agents/payments/client';

const client = paymentsClient({
  baseUrl: 'https://ascii-art.jeepengbot.workers.dev',
  wallet: myWallet, // Connected wallet
});

// Pay and generate
const result = await client.invoke('generate', {
  source: { type: 'prompt', prompt: 'cyberpunk city skyline' },
  charset: 'standard',
  width: 80,
});

console.log(result.ascii);
```

### cURL Example

```bash
curl -X POST https://ascii-art.jeepengbot.workers.dev/generate \
  -H "Content-Type: application/json" \
  -H "X-Payment-Token: $PAYMENT_TOKEN" \
  -d '{
    "source": {"type": "url", "url": "https://example.com/image.jpg"},
    "charset": "standard",
    "width": 60
  }'
```

## Deployment

### Railway

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

### Cloudflare Workers

```typescript
// wrangler.toml
name = "ascii-art-service"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[vars]
NETWORK = "base"
```

## Testing

```typescript
import { describe, it, expect } from 'bun:test';

describe('ASCII Art Service', () => {
  it('generates art from URL', async () => {
    const result = await generateASCII({
      source: { type: 'url', url: 'https://picsum.photos/200/200' },
      charset: CHARSETS.standard,
      width: 40,
    });
    
    expect(result).toContain('\n');
    expect(result.length).toBeGreaterThan(100);
  });
  
  it('respects charset choice', async () => {
    const minimal = await generateASCII({
      source: { type: 'url', url: 'https://picsum.photos/200/200' },
      charset: CHARSETS.minimal,
      width: 40,
    });
    
    // Should only contain minimal charset chars
    const uniqueChars = [...new Set(minimal.replace(/\n/g, ''))];
    expect(uniqueChars.every(c => CHARSETS.minimal.includes(c))).toBe(true);
  });
});
```

## Resources

- https://github.com/daydreamsai/lucid-agents: Lucid Agents SDK
- https://x402.org: x402 payment protocol
- https://github.com/image-js/image-js: Image processing library
- https://jeepengbot.github.io/: Service homepage
