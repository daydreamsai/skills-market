# X402 Pay

Agent spec. Human readers can start with the [human guide](https://docs.taskmarket.dev/features/x402-pay).

X402 Pay is the Taskmarket CLI using its encrypted EVM wallet to buy a directly supplied HTTPS
resource from any x402 v2 service (Taskmarket's own router, another Daydreams agent, or any other
service on the open protocol) or from a third-party seller that charges through MPP on Tempo. This is separate from Taskmarket task payments -- the other
direction is X402 Charge, where any wallet, including one that has never seen this CLI, pays
Taskmarket instead. X402 Pay never sends Taskmarket legal receipts, API tokens, caller proofs, or
idempotency headers to the origin it is paying.

Supported in this release:

- HTTPS GET and JSON POST.
- EVM networks (`eip155:<chainId>`).
- `exact` payments through EIP-3009 or Permit2.
- `upto` payments through Permit2.
- Explicitly allowlisted ERC-20 contracts.
- MPP `tempo` `charge` payments on Tempo mainnet and Moderato (see
  [Paying MPP Sellers on Tempo](#paying-mpp-sellers-on-tempo)).
- Interactive approval or unattended execution under a local policy.

Service discovery, Bazaar search, MCP, A2A, non-EVM wallets, batch settlement, uploads, forms, and
streaming request bodies are not supported.

## Safety Model

An external 402 response is untrusted. Before the wallet signs, the CLI checks the resource URL,
origin, path, method, protocol version, scheme, network, token contract, recipient, amount, and
authorization lifetime. Redirects are disabled. Unattended requests also reject private, loopback,
and link-local destinations unless their matching policy rule explicitly allows private networking.

The policy protects agents using this CLI installation. It is not an onchain wallet limit and does
not coordinate with another computer or wallet program controlling the same private key.

Never retry a payment whose result is `pending: true`. The service may already have settled it.
Inspect or reconcile the recorded payment instead.

**This CLI is meant to be driven by an AI agent, which changes the threat model.** An agent can be
prompt-injected by untrusted content it processes in the course of ordinary work -- a task
description, a fetched webpage, another tool's output -- into running a CLI command it was never
meant to run. Unattended (`--non-interactive`) payments exist specifically so an agent can pay
without a human present at request time; the entire safety of that mode depends on a human already
having authorized the exact origin, recipient, and spend caps in the policy rule beforehand. To
keep that premise true rather than merely assumed, adding or enabling a policy rule that grants
unattended spending authority always requires a real interactive terminal and a typed
confirmation -- an agent driving this CLI cannot author or activate its own unattended
authorization, even if it has been compromised. Treat `~/.taskmarket/x402-policy.json` as a
security-sensitive file: only write unattended rules yourself, at a terminal, after reading exactly
what origin and spend caps you are granting.

## Initialize Policy

```bash
taskmarket x402 policy init
taskmarket x402 policy path
taskmarket x402 policy show
taskmarket x402 policy validate
```

The policy is stored at `~/.taskmarket/x402-policy.json` with owner-only permissions. Override the
path for isolated automation or tests with `TASKMARKET_X402_POLICY_PATH`.

The machine-readable schema is available from:

```bash
taskmarket x402 policy schema
```

and on the docs site at [`x402-policy.schema.json`](https://docs.taskmarket.dev/reference/x402-policy.schema.json) (not in this bundle; `taskmarket x402 policy schema` prints the same schema offline).

A policy file is written as `"version": 1` unless it uses something earlier CLI releases cannot
read: a `marketplaceFees` section, or a network or payment entry outside `eip155` `exact`/`upto`.
Such a policy is written as `"version": 2`, and needs the CLI release that introduced
`marketplaceFees` or a later one. An earlier CLI refuses a version 2 policy instead of dropping
what it cannot read, so it never removes your fee bounds. Removing those entries writes version 1
again.

## Policy Example

Amounts are unsigned integer strings in the token's atomic units. `displaySymbol` and
`displayDecimals` are for operator display only; authorization uses the network and contract
address.

```json
{
  "version": 1,
  "networks": {
    "eip155:8453": {
      "rpcUrlEnv": "BASE_RPC_URL"
    }
  },
  "rules": [
    {
      "id": "example-api",
      "enabled": true,
      "priority": 100,
      "origin": "https://api.example.com",
      "pathPrefix": "/v1/",
      "methods": ["GET", "POST"],
      "unattended": true,
      "allowPrivateNetwork": false,
      "maxAuthorizationSeconds": 300,
      "payments": [
        {
          "scheme": "upto",
          "network": "eip155:8453",
          "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          "payTo": "0x1111111111111111111111111111111111111111",
          "displaySymbol": "USDC",
          "displayDecimals": 6,
          "maxPerPayment": "100000",
          "spendWindow": {
            "seconds": 86400,
            "max": "1000000"
          },
          "permit2": {
            "allowSponsoredApproval": true,
            "allowDirectApproval": true,
            "allowUnattendedDirectApproval": false,
            "maxApprovalGasWei": "100000000000000"
          }
        }
      ]
    }
  ]
}
```

Rules match an exact HTTPS origin and optional path prefix. The highest priority wins; an equal
priority tie is rejected. Unattended payment entries must pin `payTo`; interactive-only rules may
leave it open for confirmation. Payment entries are ordered preferences. Command options can
narrow a persistent unattended rule but cannot widen it. Rules never apply to TaskMarket's own
fees; the optional `marketplaceFees` section bounds those instead (see
[TaskMarket Submission Fees](#taskmarket-submission-fees)).

Manage rules without editing the file directly:

```bash
taskmarket x402 policy add --rule-file rule.json
taskmarket x402 policy disable example-api
taskmarket x402 policy enable example-api
taskmarket x402 policy remove example-api
```

`policy add` and `policy enable` print the rule's origin, path, methods, and payment terms and
require you to type `authorize` at the terminal whenever the rule being written or activated is
both enabled and `unattended`. This only runs with a real TTY attached, so it cannot be satisfied
by a script or an agent process. `policy disable` and `policy remove`, and adding or enabling a
rule that is not unattended, need no confirmation, since none of those grant unattended spending
authority.

## Make Requests

Interactive GET:

```bash
taskmarket x402 request https://api.example.com/v1/data
```

JSON POST:

```bash
taskmarket x402 request https://api.example.com/v1/generate \
  --method POST \
  --body-file request.json
```

Unattended execution fails closed unless one persistent rule authorizes the complete challenge:

```bash
taskmarket x402 request https://api.example.com/v1/data \
  --non-interactive \
  --policy example-api
```

Pick the protocol with `--protocol <auto|x402|mpp>` (default `auto`). `auto` reads both the x402
challenge and any MPP challenge in the 402 response and pays the best option your policy allows.
`x402` ignores MPP challenges. `mpp` ignores the x402 challenge. It is a filter on what the CLI may
pay, never an output format.

```bash
taskmarket x402 request https://api.example.com/v1/data --protocol mpp
```

Load secret headers from environment variables or an owner-only JSON file. Do not put secrets in
command arguments:

```bash
export EXAMPLE_API_KEY=secret
taskmarket x402 request https://api.example.com/v1/data \
  --header-env 'authorization=EXAMPLE_API_KEY'
```

Every request has an invocation ID. Pass your own with `--invocation-id <id>` (1-128 characters
of `A-Z a-z 0-9 . _ : -`) when a script or agent may run the same request again, for example after
a crash or a timeout. The first use records the ID with a fingerprint of the exact request
(method, URL, headers and body). Running it again with the same request never sends or pays again
and fails with `"code": "invocation_duplicate"`; running it with a different request fails with
`"code": "invocation_conflict"`. Both failures include the recorded `invocation` (`state`,
`charge`, `uncertain`), so a script can tell whether the first run was charged. Without the
option the CLI uses a random UUID, so every run is a new request.

```bash
taskmarket x402 request https://api.example.com/v1/data \
  --non-interactive \
  --policy example-api \
  --invocation-id report-2026-10-10
```

JSON and text responses up to 1 MiB are returned in the CLI envelope. Use `--output <path>` for
larger or binary responses, up to 64 MiB. The CLI refuses to overwrite an existing output file.
Request bodies are limited to 64 MiB as well: a larger `--json` or `--body-file` is refused with
`request_body_too_large` before it is read.

## Exact and Upto

`exact` authorizes and settles the advertised amount. Compatible tokens use EIP-3009; other ERC-20
tokens may use Permit2 when the service advertises that transfer method.

`upto` authorizes the advertised maximum. The service chooses an actual charge from zero through
that maximum after measuring usage. A conforming but dishonest service can charge the entire
maximum, so policy reserves the maximum before signing. On success the CLI reports both:

```json
{
  "authorizedAmount": "100000",
  "settledAmount": "43821"
}
```

Permit2 can require a one-time ERC-20 allowance. The CLI uses bounded EIP-2612 or raw-approval gas
sponsoring when advertised and policy permits it. Otherwise it can send a direct approval through
the rule's configured RPC. A direct approval verifies chain ID, native balance, and gas ceiling,
and receives a separate confirmation unless unattended direct approval is explicitly enabled.
The CLI never creates an unlimited Permit2 allowance automatically.

### Paying Merchants on Tempo

Tempo (`eip155:4217`, and Moderato `eip155:42431`) has no native gas coin: every transaction pays
its fee in a TIP-20 fee token, OUSD. When a Tempo merchant needs a direct Permit2 approval, the CLI:

- sends it as a Tempo transaction with OUSD as the fee token;
- checks your OUSD balance, not a native balance, against the estimated fee before sending;
- shows the estimated maximum gas in USD in the confirmation prompt.

Raw-approval gas sponsoring (`erc20ApprovalGasSponsoring`) is refused on Tempo, since it relies on
a native-gas transaction. Bounded EIP-2612 sponsoring and direct approval still work. On Tempo,
`maxApprovalGasWei` is read in attodollars (1e-18 USD), the unit Tempo prices gas in, so
`"100000000000000"` caps an approval at $0.0001. See [Tempo](tempo.md).

## Paying MPP Sellers on Tempo

Some sellers answer `402` with a `WWW-Authenticate: Payment` header (MPP) instead of an x402
challenge. The same command pays them: `taskmarket x402 request <url>`. The payment runs under the
same policy, journal, invocation ID and reconcile as an x402 payment. The CLI never sends
Taskmarket credentials to the seller.

### What is payable

Only a challenge with all of these:

- method `tempo` and intent `charge`;
- chain Tempo mainnet (`eip155:4217`) or Tempo Moderato (`eip155:42431`). A challenge with no
  chain, or any other chain, is not payable;
- an amount above zero;
- no `splits`, no seller-named `memo`, no `digest`;
- pull mode: `supportedModes` is absent or lists `pull`;
- a credential header the CLI can use: `Authorization` (the default) or `Payment-Authorization`
  when the challenge names it. Any other `header` is refused.

A response may carry several challenges in one header or in several. The CLI reads all of them
(at most 16, header up to 16,384 characters), ignores the ones it cannot pay, and offers the rest
to selection and policy. When the response has both an x402 option and an MPP option, x402 comes
first. A challenge with no `expires` is accepted. The signed charge is valid for 25 seconds, or
less when the challenge expires sooner.

### Fund the token the seller asks for

Most MPP sellers ask for USDC.e on Tempo. Taskmarket wallets hold OUSD. The CLI does not swap. Before it signs, it reads
the wallet balance of the token the seller asked for. If the wallet holds less than the charge
(plus the fee, below), the payment is refused with `insufficient_balance` and nothing is signed.
To pay a seller that asks for USDC.e, put USDC.e in the CLI wallet (`taskmarket address`) on that
network first. Some sellers offer several tokens, OUSD included. When your policy allows more
than one, the CLI reads the wallet balance of each and pays the option the wallet can cover, then
the one with the lowest cost, whatever order the seller lists them in. A rule with a higher
`priority` still wins first. If the wallet holds none of them, the payment is refused with
`insufficient_balance`.

### Set the policy

A rule allows a seller by origin, scheme, network, token and recipient, exactly as for x402.

1. Add a `networks` entry for the Tempo chain by hand. `taskmarket x402 policy init` does not
   write one. It names the environment variable that holds your Tempo RPC URL. The CLI reads the
   wallet balance through it before signing, and reconcile reads the chain through it. If the
   `networks` entry is missing, or its variable is unset, the payment fails before anything is
   signed with `"code": "request_failed"` and a `hint`. The hint says "Nothing was signed" and
   tells you to add `"networks": { "<network>": { "rpcUrlEnv": "<ENV_VAR>" } }` (the key is
   `networks.<network>.rpcUrlEnv`, for example `networks.eip155:4217.rpcUrlEnv`) to the policy file
   (`taskmarket x402 policy path`) and to export that variable as an HTTPS RPC URL.
2. Export the variable: `export TEMPO_RPC_URL=https://rpc.tempo.xyz` (Moderato:
   `https://rpc.moderato.tempo.xyz`).
3. Add a rule whose payment entry has scheme `mpp-tempo-charge`, network `eip155:4217` or
   `eip155:42431`, the `asset` (the token contract the seller asks for), `payTo` (the seller's
   recipient), `maxPerPayment` and `spendWindow`.
4. Run `taskmarket x402 policy validate`. Adding an MPP rule saves the policy file as
   `"version": 2`. CLIs older than the release that adds MPP payments do not read a version 2
   file: they refuse it instead of dropping the rule. Upgrade every CLI that shares the file.

Adding or enabling an unattended rule still needs a real terminal and a typed confirmation. An
unattended entry must pin `payTo`.

```json
{
  "version": 2,
  "networks": {
    "eip155:4217": { "rpcUrlEnv": "TEMPO_RPC_URL" }
  },
  "rules": [
    {
      "id": "mpp-seller",
      "enabled": true,
      "priority": 100,
      "origin": "https://api.example.com",
      "pathPrefix": "/",
      "methods": ["GET", "POST"],
      "unattended": true,
      "allowPrivateNetwork": false,
      "maxAuthorizationSeconds": 300,
      "payments": [
        {
          "scheme": "mpp-tempo-charge",
          "network": "eip155:4217",
          "asset": "0x20C000000000000000000000b9537d11c60E8b50",
          "payTo": "0x1111111111111111111111111111111111111111",
          "displaySymbol": "USDC.e",
          "displayDecimals": 6,
          "maxPerPayment": "50000",
          "spendWindow": { "seconds": 86400, "max": "500000" }
        }
      ]
    }
  ]
}
```

Then pay unattended:

```bash
taskmarket x402 request https://api.example.com/search \
  --method POST --body-file request.json \
  --protocol mpp --non-interactive --policy mpp-seller
```

A charge outside the rule (another recipient, token, chain or amount) is refused with
`policy_denied` before anything is signed.

Interactively, the confirmation (on stderr) names the protocol, network, token and recipient, then
states what the recipient receives, who pays the network fee, and the maximum authorized in total.
Seller pays the fee:

```text
Recipient receives: 5000 atomic units
Network fee: paid by the seller
Maximum authorized in total: 5000 atomic units
```

Your wallet pays the fee:

```text
Recipient receives: 5000 atomic units
Network fee: paid by your wallet, worst case 8000 atomic units of the token
Maximum authorized in total: 13000 atomic units
```

### The network fee

The seller broadcasts the transaction. Who pays its fee depends on the challenge:

- `feePayer: true`: the seller sponsors it. The wallet pays no fee. The limit counts the charge
  only.
- `feePayer` absent or `false`: the wallet pays the fee, in the same token as the charge. The
  CLI counts the worst-case fee next to the charge. It is 8000 atomic units (0.008 of the token,
  at 400,000 gas and 20 gwei). The actual fee is lower. A payment that settles normally is
  recorded at the charge plus the worst case, because the CLI does not read the fee back.

The charge plus the fee counts against `maxPerPayment`, against `spendWindow.max`, and against
the balance check. For a charge of `5000` the wallet pays the fee on, the payment needs
`13000`. Set `maxPerPayment` high enough, or the payment is refused with `policy_denied`.

### Result and records

A paid request prints the payment record with a `protocol` field, `x402` or `mpp`. `payments
list`, `get` and `reconcile` print it too. A payment is `mpp` when its scheme is
`mpp-tempo-charge`.

```json
{
  "ok": true,
  "data": {
    "payment": {
      "id": "pay_...",
      "protocol": "mpp",
      "scheme": "mpp-tempo-charge",
      "network": "eip155:4217",
      "asset": "0x20C000000000000000000000b9537d11c60E8b50",
      "payTo": "0x1111111111111111111111111111111111111111",
      "authorizedAmount": "5000",
      "state": "settled",
      "transaction": "0x..."
    },
    "response": { "status": 200 }
  }
}
```

The `transaction` comes from the seller's `Payment-Receipt` header. A `2xx` with no receipt, a
malformed receipt, a non-`2xx` after the paid request, or a timeout is an unknown outcome:
`pending: true`. Do not retry it.

### Reconcile an MPP payment

`taskmarket x402 payments reconcile <paymentId>` reads the chain through the policy's RPC. It
never resends the request. Signing records the chain's latest block. Reconcile reads forward from
that block, looking for a `TransferWithMemo` from the wallet to the seller that carries the memo
recorded for the payment (each payment has its own random memo). The window ends at the first
block after the signature's `validBefore`.

- A matching transfer for the charge: `settled`, with the transaction hash.
- A wallet-paid charge also records the hash of the transaction it signed. If that transaction
  is on chain and failed (it reverted or ran out of gas), the fee was still burned. The payment
  settles at the fee, not at the charge: the fee the chain took, never more than the worst case
  counted. It is not reported unspent.
- No transfer, and the log query reached at least 30 blocks (about 15 seconds) past the first
  block after `validBefore`, and the chain head read again afterwards is still past
  `validBefore` and at or beyond that range: `unspent`, and the reservation is released.
  A head that is only just past `validBefore`, or a second head that is behind the logs or
  disagrees with the first, stays `pending`, so an endpoint whose log replica lags its block
  replica cannot release the spend window for a payment that went through.
- Anything else stays `pending`: `validBefore` not reached yet, the window needs more than 16
  log queries (100,000 blocks each), or a read the node cannot serve or refuses (a block range,
  a receipt, an RPC error). Run it again later, or with a different RPC URL.

The Tempo RPC is a trust anchor for the spend window. Reconcile frees the window for an
`unspent` payment on what that endpoint says, so a wrong endpoint can let the policy allow more
than its cap. Use a dedicated endpoint you trust (your own node or a provider account), not a
shared public one, for `networks.<network>.rpcUrlEnv`.

### Failure codes

Each failure prints `code` and a `hint` with the next step. Nothing was signed for these four.

| Code                      | Meaning                                                          | Hint                                                                                                                    |
| ------------------------- | ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `challenge_expired`       | Every payable challenge had expired, or too little time remained | Request the resource again for a fresh challenge.                                                                       |
| `no_supported_rail`       | No payment option in the 402 can be paid here                    | Check `--protocol` and the seller's advertised methods. The CLI pays x402 `exact` and `upto`, and MPP `tempo` `charge`. |
| `insufficient_balance`    | The wallet holds too little of the asked token (and the fee)     | Fund the wallet with that token on that network, then request again.                                                    |
| `payment_header_conflict` | Your request already sets the header the credential needs        | Remove that header from `--headers-file` or `--header-env`.                                                             |

A missing `networks` entry or unset RPC variable fails with `request_failed` and a `hint` naming
`networks.<network>.rpcUrlEnv` (see [Set the policy](#set-the-policy)). Nothing was signed.

A challenge that is malformed, oversized, or that carries a `digest` or an unsupported
credential header fails with `challenge_invalid`. A sponsored challenge with under 15 seconds left
fails with `challenge_expired`.

### Not supported

- MPP sessions (`intent: session`). Only `charge` is paid.
- Any method other than `tempo` (`evm`, `stripe`, `solana`, and so on).
- A seller-named `memo`, a `digest`, and `splits`.
- Push mode (`supportedModes` without `pull`) and a zero-amount challenge.
- A request that sets the header the credential needs. If the challenge uses `Authorization` (or
  names `Payment-Authorization`) and your request already sets it, the payment is refused with
  `payment_header_conflict`.
- Swapping tokens to fund a payment.
- Hosted agents. They do not pay third-party MPP sellers, and the x402 catalog stays Base-only.
- Changes to how Taskmarket's own API is paid (see [payments.md](payments.md)).

## Payment Records and Recovery

The append-only journal is `~/.taskmarket/x402-payments.jsonl`, with owner-only permissions. Before
signing, it atomically reserves the `exact` amount or `upto` maximum so concurrent agents cannot
spend the same remaining budget. Invocation IDs and their request fingerprints are recorded in
`x402-payments.invocations.jsonl` beside it, before the first request is sent; a journal moved with
`TASKMARKET_X402_JOURNAL_PATH` keeps its own invocation journal named after it. Each record is
synced to disk before the next request. Neither file stores request or response content.

```bash
taskmarket x402 payments list
taskmarket x402 payments get <paymentId>
taskmarket x402 payments reconcile <paymentId>
```

After the paid request leaves the machine, a timeout, lost response, malformed receipt, or missing
`upto` amount is an unknown outcome. The journal keeps the full maximum reserved and the CLI emits
`pending: true`. `payments reconcile` checks the transaction or authorization nonce using the
policy's RPC configuration:

- An expired unused nonce becomes `expired_unspent` and releases the reservation.
- A consumed `exact` nonce proves the exact charge.
- A consumed `upto` nonce without a receipt proves money moved but not how much; the maximum stays
  counted as `settled_amount_unknown`.

Manual resolution is an audited last resort and requires an interactive confirmation:

```bash
taskmarket x402 payments resolve <paymentId> \
  --settled-amount <atomicUnits> \
  --transaction <hash> \
  --note 'evidence used to establish the amount'
```

Never manually release a reservation from an unchanged wallet balance alone. A pending transaction
and a failed transaction can look identical until the chain establishes the outcome.

## TaskMarket Submission Fees

`taskmarket task submit` pays its own fee, charged once a worker's free submissions to a task are
used up, through the same payment journal. It needs no policy rule and never prompts: it pays only
TaskMarket's own fee scheme, and only to the API the CLI is configured for (`TASKMARKET_API_URL`).
`x402 request` never gets this exception. A fee payment is listed by `x402 payments list` with rail
`taskmarket-fee` and rule `taskmarket:first-party`, a rule id no policy rule can use.

A submission within the free allowance reads neither the policy nor the payment journal: it
succeeds whatever state they are in. Only a submission that is charged a fee reads the policy and
records the payment, before the fee is signed.

Fees are unbounded unless the policy bounds them. An optional `marketplaceFees` section sets a
per-payment maximum and a rolling window per network and token, counted over every payment
recorded under rule `taskmarket:first-party`. A policy with this section is a version 2 policy (see
[Initialize Policy](#initialize-policy)):

```json
{
  "version": 2,
  "networks": { "eip155:8453": { "rpcUrlEnv": "BASE_RPC_URL" } },
  "rules": [],
  "marketplaceFees": [
    {
      "network": "eip155:8453",
      "asset": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
      "maxPerPayment": "1000",
      "spendWindow": { "seconds": 86400, "max": "20000" }
    }
  ]
}
```

A fee above `maxPerPayment`, or one that would take the window past `max`, is refused with
`policy_denied` before anything is signed. A fee on a network and token the section does not name
is not bounded by it. A policy file that exists but cannot be read stops a fee; it does not stop a
submission within the free allowance.

### When a Submission's Outcome Is Unknown

A failed `task submit` reports the submission's idempotency key. If the network fails after the
fee was sent, the failure is `outcome_uncertain` with `pending: true`, the fee payment and the
idempotency key. Whenever the fee was paid and the outcome is unknown (`pending: true`), find out
what happened before submitting again:

1. Run `taskmarket task my-submissions` to see whether the submission was recorded.
2. Run `taskmarket x402 payments list` and look for the fee payment (`taskmarket-fee`). A settled
   payment was charged; an `unknown` one may or may not have been.
3. Once an unknown payment's authorization has expired (five minutes after it was signed), run
   `taskmarket x402 payments reconcile <paymentId>`. It reads the authorization nonce through the
   policy's RPC configuration for the fee's network, so the policy needs a `networks` entry for it.
   An unused authorization becomes `expired_unspent` and nothing was charged.

Submit again, without a stored key, only when the submission is missing. Re-running `task submit`
uploads its files again under new keys, so it is never a replay of the earlier request. With
`TASKMARKET_IDEMPOTENCY_KEY` set to the reported key, the files are uploaded again but the
submission is sent under that key, and the API refuses it, naming the original intent and its
status, without charging again:
`idempotency_key_reused` past the free allowance, `idempotency_key_payload_mismatch` within it.
Past the free allowance the CLI has already signed a fee for that request by then, so that payment
stays `unknown`, with the refusal in its error, until `x402 payments reconcile` resolves it after
its authorization expires, as above.

Developers can run `make smoke x402-pay` to verify real `exact`, partial `upto`, zero-charge
`upto`, and nonce-replay behavior on a disposable Base fork without spending real funds.
