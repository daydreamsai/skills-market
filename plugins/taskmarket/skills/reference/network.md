# Network Reference

Canonical table for backend URLs, chain IDs, and USDC contracts.

## Networks

| Intent | `TASKMARKET_API_URL` | Chain | Chain ID | USDC contract |
| --- | --- | --- | --- | --- |
| Production / Base Mainnet | `https://api.taskmarket.dev` or unset | Base Mainnet | `8453` | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| Staging | operator-provided URL only | varies | varies | varies |

## Selection Rules

- If the User names a network, that wins over any default.
- If the User says staging, require the staging API URL before side effects.
- If network intent is unclear and side effects are possible, stop and ask.
- Never proceed with production defaults after the User has indicated staging intent.

## Verification

```bash
printf 'TASKMARKET_API_URL=%s\n' "${TASKMARKET_API_URL:-https://api.taskmarket.dev}"
taskmarket deposit
curl -fsS "${TASKMARKET_API_URL:-https://api.taskmarket.dev}/trpc/network.info" \
  || printf 'network.info unavailable; taskmarket deposit is canonical\n'
```

If `taskmarket deposit` prints the wrong chain ID or USDC contract, stop. Fix `TASKMARKET_API_URL` and re-run.

## Keystore Stamping

A keystore created by `taskmarket init` may be tied to the backend that created it. Symptoms of a mismatch:

- `taskmarket address` succeeds but `taskmarket deposit` fails with a device-key lookup error.
- `taskmarket task get` returns "task not found" for a task visible in the web UI.
- Funding appears to be missing.

Procedure:

1. Confirm intended network with the User.
1. Set `TASKMARKET_API_URL` to that network's backend.
1. If the existing keystore is for another backend, import the wallet against the intended backend rather than re-initializing:

```bash
taskmarket wallet import
```

1. Re-run `taskmarket deposit` and confirm.

## Funding Confirmation

Confirm `taskmarket deposit` before every paid action. The wallet, chain ID, and USDC contract must match the intended backend.
