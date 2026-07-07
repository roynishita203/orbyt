# SubVault Contract Specification

Soroban contract at `contracts/sub_vault/src/`. Deployed to Stellar Testnet for v1.

## Data structures (`types.rs`)

```rust
pub struct PlanData {
    pub merchant: Address,
    pub amount: i128,
    pub interval_secs: u64,
    pub asset: Address,   // SEP-41 / SAC token address
    pub active: bool,
}

pub enum SubStatus { Active, PastDue, Cancelled }

pub struct SubscriptionData {
    pub subscriber: Address,
    pub plan_id: u64,
    pub vault_balance: i128,
    pub next_charge_date: u64,
    pub status: SubStatus,
    pub created_at: u64,
}
```

`SubStatus` has no per-variant data, so Soroban compiles it as a `u32`
discriminant in declaration order (`Active = 0`, `PastDue = 1`,
`Cancelled = 2`), not a tagged union. Client code (frontend, keeper) that
decodes it directly must match that order.

## Public functions

| Function | Access | Description |
|---|---|---|
| `create_plan(merchant, amount, interval_secs, asset) -> u64` | `merchant.require_auth()` | Registers a plan, returns `plan_id` |
| `subscribe(subscriber, plan_id, initial_funding) -> u64` | `subscriber.require_auth()` | Pulls `initial_funding` into vault custody; `next_charge_date = now`, so the first charge is due immediately |
| `charge(subscription_id, caller)` | **Public, permissionless** | Only moves funds if `Active` and due; `caller` carries no privilege, it's recorded on the emitted event only |
| `cancel_subscription(subscription_id, caller)` | `caller.require_auth()`, must be the subscriber | Stops future charges; does not refund the vault |
| `top_up(subscription_id, subscriber, amount)` | `subscriber.require_auth()` | Adds funds; also flips `PastDue` back to `Active` |
| `withdraw_remaining(subscription_id, caller) -> i128` | `caller.require_auth()`, must be the subscriber, only if `Cancelled` | Returns the leftover vault balance |
| `get_subscription(subscription_id) -> SubscriptionData` | Public read | |
| `get_plan(plan_id) -> PlanData` | Public read | |
| `get_due_subscriptions() -> Vec<u64>` | Public read | `Active` subscriptions with `next_charge_date <= now`; this is what the keeper bot polls |

### Charge logic

```rust
fn charge(subscription_id, caller) {
    require(sub.status == Active, NotActive);
    require(now() >= sub.next_charge_date, NotYetDue);

    if sub.vault_balance >= plan.amount {
        transfer(vault -> merchant, plan.amount);
        sub.vault_balance -= plan.amount;
        sub.next_charge_date += plan.interval_secs;
        emit ChargeSuccess;
    } else {
        sub.status = PastDue;
        emit ChargeFailedInsufficientFunds;
    }
}
```

`charge` is deliberately callable by anyone. The keeper bot has no special
on-chain privilege -- it is just the party that happens to call it promptly.
Correctness lives entirely in the due-date and balance checks inside the
function, not in caller restrictions.

## Errors (`error.rs`)

| Error | Meaning |
|---|---|
| `PlanNotFound` / `SubscriptionNotFound` | Bad id |
| `NotActive` | Subscription is `PastDue` or `Cancelled` |
| `NotYetDue` | `charge` called before `next_charge_date` |
| `NotSubscriber` | Caller isn't the subscription's subscriber |
| `StillActive` | `withdraw_remaining` called before cancelling |
| `InsufficientVaultBalance` | Reserved; `charge` handles this by transitioning to `PastDue` rather than erroring |
| `PlanInactive` | Plan has been deactivated |
| `InvalidAmount` / `InvalidInterval` | Non-positive amount/interval on `create_plan`, `subscribe`, or `top_up` |

## Events (`events.rs`, via `#[contractevent]`)

Each event's default topic is the struct name in snake_case (e.g.
`PlanCreated` -> `"plan_created"`), followed by any `#[topic]`-marked field.

| Event | Topic fields | Data fields |
|---|---|---|
| `PlanCreated` | `plan_id` | `merchant, amount, interval_secs` |
| `SubscriptionCreated` | `subscription_id` | `subscriber, plan_id, initial_funding` |
| `ChargeSuccess` | `subscription_id` | `amount, next_charge_date, caller` |
| `ChargeFailedInsufficientFunds` | `subscription_id` | `caller` |
| `SubscriptionCancelled` | `subscription_id` | -- |
| `FundsToppedUp` | `subscription_id` | `amount` |
| `FundsWithdrawn` | `subscription_id` | `amount` |

The frontend has no on-chain enumeration of plans or subscriptions to
browse, so it replays these events via `getEvents` (see
`frontend/src/lib/events.ts`) to discover plan and subscription ids, then
calls `get_subscription`/`get_plan` for live, authoritative state.

## Storage

- `Plan(plan_id)`, `Subscription(subscription_id)`: persistent storage,
  TTL-bumped on every write (subscriptions can live for months).
- `PlanCounter`, `SubCounter`, `AllSubs`: instance storage. `AllSubs` is a
  flat `Vec<u64>` of every subscription id ever created -- a v1
  simplification `get_due_subscriptions` scans linearly. Fine at
  hackathon/demo scale; not a scalable indexing strategy.
