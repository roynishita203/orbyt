# SubVault

Recurring payments on Stellar Soroban. A subscriber pre-funds a vault once;
a merchant gets paid automatically on a fixed schedule via a permissionless
`charge()` call that an off-chain keeper bot triggers when a cycle is due.

```
contracts/sub_vault/   Soroban contract (Rust)
keeper/                Off-chain keeper bot (Node.js/TypeScript)
frontend/              React app (Subscriber + Merchant views)
scripts/deploy.sh      Testnet deploy script
```

## How it works

1. A merchant calls `create_plan(merchant, amount, interval_secs, asset)` and gets a `plan_id`.
2. A subscriber calls `subscribe(subscriber, plan_id, initial_funding)`, which pulls
   `initial_funding` into the contract's custody. The first charge is due immediately.
3. A keeper bot polls `get_due_subscriptions()` and calls `charge(subscription_id, caller)`
   for anything due.
4. `charge` is **permissionless** -- anyone can call it, including the keeper bot, a
   competing keeper, or the subscriber themselves. The function only actually moves
   funds if the subscription is `Active` and due; the security model lives entirely in
   those checks, not in who is allowed to call the function. If the vault balance is
   insufficient, the subscription flips to `PastDue` instead of partially charging.
5. Subscribers can `top_up` (which also recovers a `PastDue` subscription back to
   `Active`), `cancel_subscription` at any time, and `withdraw_remaining` once cancelled.

See [`SPEC.md`](./SPEC.md) for the full contract interface, error cases, and events.

## Quick start

### 1. Contract

```bash
cargo test -p sub_vault      # unit tests
stellar contract build       # produces target/wasm32v1-none/release/sub_vault.wasm
./scripts/deploy.sh          # deploys to testnet, prints the contract ID
```

### 2. Keeper bot

```bash
cd keeper
cp .env.example .env         # fill in CONTRACT_ID, KEEPER_SECRET_KEY, etc.
npm install
npm test                     # unit tests (mocked contract client)
npm run dev                  # start polling testnet
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env         # fill in VITE_CONTRACT_ID, etc.
npm install
npm run dev
```

Requires the [Freighter](https://www.freighter.app/) browser wallet to connect and sign.


