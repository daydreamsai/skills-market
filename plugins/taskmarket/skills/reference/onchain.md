# Onchain Fallback Reference

Use this only when data is not exposed by the CLI or API, or when independently checking Base Mainnet state.

## Network

Production Taskmarket uses Base Mainnet:

- Chain ID: `8453`
- Public RPC: `https://mainnet.base.org`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

## USDC Balance

Query `balanceOf(address)` on the USDC contract. Replace `<address-left-padded-to-64-hex>` with the lowercased address without `0x`, left padded to 64 hex characters.

```bash
curl -s https://mainnet.base.org \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"eth_call",
    "params":[{
      "to":"0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "data":"0x70a08231<address-left-padded-to-64-hex>"
    },"latest"]
  }'
```

The `result` is a 32-byte hex uint256 in USDC base units. Divide by 1e6 for USDC.

## Transaction Receipt

```bash
curl -s https://mainnet.base.org \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_getTransactionReceipt","params":["<txHash>"]}'
```

Receipt `status` values:

- `"0x1"`: success
- `"0x0"`: reverted
- `null`: not mined yet

If CLI/API state and contract state disagree after one re-fetch, stop and report rather than retrying side effects.
