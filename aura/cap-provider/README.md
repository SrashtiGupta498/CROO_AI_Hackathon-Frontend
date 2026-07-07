# Aura CAP Provider

The on-chain edge that makes the Aura skin-analysis agent **callable, paid, and
settled on CROO**. It uses the real published SDK — [`@croo-network/sdk`](https://www.npmjs.com/package/@croo-network/sdk)
(Node.js) — and bridges each paid order into the Python agent mesh in
[`../cap-mesh`](../cap-mesh).

```
Human (React app) ─┐
                   ├─► CAP order ─► cap-provider (this) ─► cap-mesh (Python) ─► report
Other agent (A2A) ─┘        │                                    │
                            └── @croo-network/sdk ──── on-chain (Base, USDC) ──┘
```

## Why Node here, Python there

The Aura brain (perception + remedy + the internal A2A concierge) is Python and
lives in `../cap-mesh`. **CROO's only published SDK is Node.js**, so the CAP
protocol edge must be Node. This process is a thin adapter: it speaks CAP over
`@croo-network/sdk` and shells out to `python -m mesh.analyze_cli` for the actual
analysis. One brain, one protocol edge.

## One-time setup you must do in the CROO Dashboard

The SDK does **not** register agents or services (that changed in v0.2 — setup
moved to the Dashboard). Before this process can receive orders:

1. Create the Aura agent → you get an **account-abstraction (AA) wallet address**.
2. Register the **`skin-analysis` service** (input/output schema + price in USDC).
3. Copy the **SDK-Key** (`croo_sk_…`).
4. **Deposit USDC to the agent's AA wallet address** (shown in the Dashboard) —
   this is the wallet the SDK checks and settles into. Do **not** fund the
   controller address.

## Configure

```bash
cd cap-provider
cp .env.example .env      # already copied for you
# edit .env — paste CROO_SDK_KEY (and CROO_API_URL / CROO_WS_URL if different)
npm install
```

| Env var | Purpose |
|---|---|
| `CROO_API_URL` | API base, e.g. `https://api.croo.network` |
| `CROO_WS_URL` | WebSocket, e.g. `wss://api.croo.network/ws` |
| `CROO_SDK_KEY` | Your agent's key (`croo_sk_…`) from the Dashboard |
| `BASE_RPC_URL` | Optional. Base RPC for balance checks (SDK defaults to Base mainnet) |
| `PYTHON_BIN` | Python that can import `../cap-mesh` (default `python`) |
| `CROO_PROVIDER_FUND_ADDRESS` | Only for `require_fund_transfer=true` services |
| `CROO_TARGET_SERVICE_ID` | Only for the requester example |

## Run

```bash
npm run provider      # Aura earns: listen, accept, analyze, deliver, settle
npm run requester     # Aura hires: negotiate, pay, download (needs CROO_TARGET_SERVICE_ID)
npm run typecheck      # verify against the SDK types
```

## Lifecycle this implements

| CAP event | Provider action (SDK method) |
|---|---|
| `NegotiationCreated` | `getNegotiation` → policy → `acceptNegotiation` (backend submits `createOrder` on-chain) |
| `OrderPaid` | run `cap-mesh` analysis → `deliverOrder` (Text). Unusable photo → `rejectOrder` (refund) |
| `OrderCompleted` | delivery verified → escrow settles to Aura's AA wallet |

Payment, escrow, and USDC settlement on Base are handled entirely by CAP — no
private keys are handled in this repo; the SDK-Key authorizes the backend to act
for Aura's AA wallet.

## Troubleshooting

- **`Missing required env var …`** — fill in `.env`.
- **`failed to start 'python'`** — set `PYTHON_BIN` in `.env` to a Python that can
  `cd ../cap-mesh && python -m mesh.analyze_cli`.
- **`isInsufficientBalance`** — deposit USDC to the agent's **AA wallet** address.
- **Requirements** — callers should send `requirements` as JSON, e.g.
  `{"image_ref": "<objectKey|url|id>", "goal": "reduce acne, organic only"}`.
  Non-JSON is accepted and treated as a free-text goal.
