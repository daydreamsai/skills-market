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
  - https://github.com/jeepengBot/ascii-service-py: Python/FastAPI implementation
---

# ASCII Art Service

Paid ASCII art generation endpoint with x402 payment integration. Convert images 
and text prompts into customizable ASCII art.

## Overview

This service provides a paid endpoint for generating ASCII art from:
- Image URLs (fetched and converted)
- Base64-encoded images

**Pricing:** $0.01 per conversion (configurable)

**Character Sets:**
- `ascii`: `@%#*+=-:. ` (10 chars) - universally supported
- `standard`: `$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/|()1{}[]?-_+~<>i!lI;:,"^\`'. ` (70 chars) - universally supported
- `blocks`: 159 Unicode Legacy Computing symbols (high quality, limited font support)
- `shades`: 27 Block elements: `░▒▓█▀▄▌▐` + quadrants + fractional blocks (macOS-safe)
- `box`: 62 Box drawing characters: `│─└┴┬├┼` light/heavy/double lines (macOS-safe)
- `shapes`: 64 Geometric shapes: squares, triangles, arrows, circles, stars (macOS-safe)
- `braille`: 256 Braille patterns for fine gradients (macOS-safe)
- `patterns`: 29 Mixed patterns, diagonals `╱╲╳`, nested squares (macOS-safe)

## Quick Start

This is a Python/FastAPI implementation. For a TypeScript/Lucid Agents SDK version, see the Lucid Agents docs.

### 1. Install Dependencies

```bash
git clone https://github.com/jeepengBot/ascii-service-py.git
cd ascii-service-py
pip install -r requirements.txt
```

### 2. Environment Variables

```bash
# Required for paid mode
export RECEIVABLE_ADDRESS=0xYourAddress
export NETWORK=base-sepolia  # or 'base' for mainnet
export PRICE_USD=0.01

# Optional
export PORT=3000
export DEV_MODE=false
```

### 3. Run the Service

```bash
# Free mode (no payments)
python api.py

# With x402 payments
export RECEIVABLE_ADDRESS=0x394510c00848FF412324e1E692F8d5Fd0A8ed753
export NETWORK=base
python api.py
```

### 4. Test the API

```bash
# Health check
curl http://localhost:3000/health

# List available charsets
curl http://localhost:3000/charsets

# Generate ASCII art (free mode)
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "source": {"type": "url", "url": "https://example.com/image.jpg"},
    "charset": "braille",
    "width": 80
  }'
```

## Character Sets

The service provides these character sets via the `/charsets` endpoint:

| Charset | Chars | Description | Font Support |
|---------|-------|-------------|--------------|
| `ascii` | 10 | Simple gradient: `@%#*+=-:. ` | Universal |
| `standard` | 70 | Classic ASCII art set | Universal |
| `shades` | 27 | Block elements + shaded fills | Universal |
| `box` | 62 | Box drawing (lines/corners) | Universal |
| `shapes` | 64 | Geometric shapes, arrows, stars | Universal |
| `braille` | 256 | Braille dots for fine gradients | Universal |
| `patterns` | 29 | Mixed patterns + diagonals | Universal |
| `blocks` | 159 | Legacy Computing symbols | Limited (Linux) |

**Recommendation:** Use `shades`, `braille`, or `patterns` for best quality with universal font support.

## API Endpoints

### `GET /health`
Returns service status and payment configuration.

```json
{
  "status": "healthy",
  "payment_enabled": true
}
```

### `GET /charsets`
Returns available character sets with metadata.

```json
{
  "charsets": {
    "braille": {
      "chars": 256,
      "description": "Braille patterns (256 dots for fine gradients)",
      "universal": true
    }
  }
}
```

### `POST /generate`
Generates ASCII art from an image URL or base64 data.

**Request:**
```json
{
  "source": {
    "type": "url",
    "url": "https://example.com/image.jpg"
  },
  "charset": "braille",
  "width": 80
}
```

**Response:**
```json
{
  "success": true,
  "ascii": "⠀⠀⠀⠀⠀⣀⣤⣶⣾⣿⣿⣿...",
  "charset": "braille",
  "dimensions": {
    "width": 80,
    "height": 45
  }
}
```

**With base64 image:**
```json
{
  "source": {
    "type": "image",
    "data": "iVBORw0KGgoAAAANSUhEUgAA..."
  },
  "charset": "shades",
  "width": 60
}
```

## Payment Configuration

Pricing is configured via environment variables:

```bash
export PRICE_USD=0.01  # Price per conversion in USD
```

### x402 Integration

The service uses the x402 payment protocol. When payment is enabled:

1. Client requests `/generate` without payment → receives `402 Payment Required`
2. Client signs payment payload with their wallet
3. Client retries with `X-PAYMENT-PROOF` header
4. Service verifies via facilitator and returns ASCII art

**Headers:**
- `X-PAYMENT-PROOF`: Signed payment payload
- `X-PAYMENT-TOKEN`: Alternative payment token

### Free Mode

Run without payments by omitting `RECEIVABLE_ADDRESS`:

```bash
unset RECEIVABLE_ADDRESS
python api.py  # Free mode, no payment required
```

## Client Usage

### cURL Example (Free Mode)

```bash
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{
    "source": {"type": "url", "url": "https://example.com/image.jpg"},
    "charset": "braille",
    "width": 80
  }'
```

### cURL Example (With Payment)

```bash
# 1. Request without payment (get 402 response)
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -d '{"source": {"type": "url", "url": "..."}, "charset": "shades"}'

# 2. Sign payment payload with wallet
# 3. Retry with payment proof
curl -X POST http://localhost:3000/generate \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT-PROOF: $SIGNED_PAYLOAD" \
  -d '{
    "source": {"type": "url", "url": "https://example.com/image.jpg"},
    "charset": "shades",
    "width": 60
  }'
```

### Python Client Example

```python
import requests
import base64

def generate_ascii(image_path, charset="braille", width=80):
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode()
    
    response = requests.post("http://localhost:3000/generate", json={
        "source": {"type": "image", "data": image_data},
        "charset": charset,
        "width": width
    })
    
    return response.json()["ascii"]

# Usage
art = generate_ascii("photo.jpg", charset="shapes", width=60)
print(art)
```

## Deployment

### Railway (Configured)

The service includes Railway configuration (`Procfile`, `nixpacks.toml`):

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

**Environment variables in Railway dashboard:**
- `RECEIVABLE_ADDRESS` - Your wallet address to receive USDC
- `NETWORK` - `base` or `base-sepolia`
- `PRICE_USD` - Price per conversion (default: 0.01)

### Docker

```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt

COPY api.py .
EXPOSE 3000

CMD ["python", "api.py"]
```

### Local Development

```bash
# Clone and setup
git clone https://github.com/jeepengBot/ascii-service-py.git
cd ascii-service-py
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run in free mode (no payments)
python api.py

# Or with payments
export RECEIVABLE_ADDRESS=0xYourAddress
export NETWORK=base
python api.py
```

## Testing

```python
import pytest
import requests

BASE_URL = "http://localhost:3000"

def test_health():
    response = requests.get(f"{BASE_URL}/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_list_charsets():
    response = requests.get(f"{BASE_URL}/charsets")
    data = response.json()
    
    assert "charsets" in data
    assert "braille" in data["charsets"]
    assert "shades" in data["charsets"]
    assert data["charsets"]["braille"]["universal"] == True

def test_generate_from_url():
    response = requests.post(f"{BASE_URL}/generate", json={
        "source": {"type": "url", "url": "https://picsum.photos/200/200"},
        "charset": "standard",
        "width": 40
    })
    
    data = response.json()
    assert data["success"] == True
    assert "ascii" in data
    assert "\n" in data["ascii"]
    assert data["charset"] == "standard"

def test_charset_respected():
    """Ensure output only contains chars from selected charset."""
    response = requests.post(f"{BASE_URL}/generate", json={
        "source": {"type": "url", "url": "https://picsum.photos/100/100"},
        "charset": "ascii",
        "width": 20
    })
    
    ascii_art = response.json()["ascii"]
    unique_chars = set(ascii_art.replace("\n", "").replace(" ", ""))
    
    assert unique_chars.issubset(set("@%#*+=-:."))
```

## Resources

- https://github.com/daydreamsai/lucid-agents: Lucid Agents SDK
- https://x402.org: x402 payment protocol
- https://github.com/image-js/image-js: Image processing library
- https://jeepengbot.github.io/: Service homepage
