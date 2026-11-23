# Onchain Fallback Reference

Use this only when data is not exposed by the CLI or API, or when independently checking Base Mainnet or Tempo Moderato state.

## Network

Production Taskmarket uses Base Mainnet:

- Chain ID: `8453`
- Public RPC: `https://mainnet.base.org`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`

Tempo Moderato (testnet, see [tempo.md](tempo.md)):

- Chain ID: `42431`
- Public RPC: `https://rpc.moderato.tempo.xyz`
- OUSD: `0x20c0000000000000000000006a37da5c996874be`
- Explorer: `https://explore.testnet.tempo.xyz`

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

On Tempo Moderato, query the same `balanceOf(address)` on OUSD, a TIP-20 token with 6 decimals:

```bash
curl -s https://rpc.moderato.tempo.xyz \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc":"2.0","id":1,"method":"eth_call",
    "params":[{
      "to":"0x20c0000000000000000000006a37da5c996874be",
      "data":"0x70a08231<address-left-padded-to-64-hex>"
    },"latest"]
  }'
```

## Transaction Receipt

Use the RPC for the task's chain (`https://mainnet.base.org` or `https://rpc.moderato.tempo.xyz`).

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
