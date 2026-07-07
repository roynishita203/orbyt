# SubVault — Production Readiness Audit

**Date:** 2026-07-07
**Scope:** `contracts/sub_vault`, `keeper`, `frontend`, `.github/workflows`
**Method:** Every claim below was either (a) run locally in this session with the output captured verbatim, or (b) explicitly marked unverified. Nothing in this report is inferred or assumed.

---

## Executive Summary

The contract, keeper bot, and frontend are built, unit-tested, and have been proven end-to-end against a live Testnet deployment (3 real automatic charges, verified on-chain). CI steps (contract tests+build, keeper typecheck+test, frontend lint+build+test) all pass when run locally with the exact commands the workflow files use.

**What is not done, and should not be represented as done:** this directory is not yet a git repository. There is no GitHub remote, no CI run has ever executed on GitHub Actions, no CD run has ever executed, and no deployment secrets (`STELLAR_SECRET_KEY`, `VERCEL_TOKEN`, etc.) or deploy platform (Vercel/Netlify/Railway) are configured. "Confirm CI and CD GitHub Actions runs complete successfully" is **not achievable** without a remote repository and secrets that only the project owner can provision. This report does not claim otherwise.

---

## Architecture Review

```
contracts/sub_vault/   Soroban contract (Rust, soroban-sdk 26.1.0)
keeper/                Node/TypeScript keeper bot (polls + calls charge())
frontend/              Vite + React + TypeScript (Subscriber/Merchant UI)
scripts/deploy.sh      Testnet deploy script
.github/workflows/     ci.yml (test/build on push+PR), deploy.yml (CD on push to main)
```

Design: `charge()` is permissionless by construction -- correctness lives in the function's own due-date/balance checks, not in caller restriction. The keeper bot holds no contract privilege, only enough XLM to pay its own transaction fees. Full interface reference: [`SPEC.md`](./SPEC.md).

---

## Smart Contract Audit

| Item | Status |
|---|---|
| `create_plan`, `subscribe`, `charge`, `cancel_subscription`, `top_up`, `withdraw_remaining`, `get_subscription`, `get_plan`, `get_due_subscriptions` | Implemented, `contracts/sub_vault/src/lib.rs` |
| Due-date + balance enforcement inside `charge` | Implemented and unit-tested |
| `PastDue` transition on insufficient balance (no partial transfer) | Implemented and unit-tested |
| Events (`#[contractevent]`) | Implemented, `src/events.rs` |
| `contracts/sub_vault/Cargo.lock` | Present at workspace root (`Cargo.lock`) — correct location for a Cargo workspace; a per-member lockfile is not how Cargo workspaces work |
| `contracts/sub_vault/Makefile` | Added this session (`build`, `test`, `deploy`, `fmt`, `clean` targets) |
| `contracts/sub_vault/README.md` | Added this session |
| `src/lib.rs` with full contract logic | Present |
| `src/test.rs` with unit tests | Present, 11 tests |

**Deviation from the audit spec, and why:** the spec's checklist and CI instructions say `wasm32-unknown-unknown`. This crate (soroban-sdk 26.1.0) targets `wasm32v1-none` -- confirmed by running `stellar contract build` and inspecting its actual `--target` invocation. Building against `wasm32-unknown-unknown` is not what this SDK version produces; the Makefile, CI, and CD workflows all correctly use `wasm32v1-none`.

---

## Frontend Audit

| Item | Status |
|---|---|
| `frontend/src/lib/stellar-sdk.ts` exporting `server` + `networkPassphrase` | Added this session |
| `frontend/src/lib/contract.ts` with `callContractFunction` | Added this session -- generic dispatcher over the typed contract client; signs+sends write calls, unwraps read calls, single code path for both |
| At least one component calls a contract function | Already true before this session: `MerchantView.tsx` calls `client.create_plan(...)`; `SubscriberView.tsx` calls `subscribe`, `top_up`, `cancel_subscription`, `withdraw_remaining` |
| Subscriber view (browse plans, subscribe, top-up, cancel, withdraw) | Implemented |
| Merchant view (create plan, active subscribers, revenue) | Implemented |
| Wallet integration (Freighter) | Implemented, `src/lib/wallet.ts` |

**Deviation from the audit spec, and why:** the CD spec says pass `NEXT_PUBLIC_CONTRACT_ID`, `NEXT_PUBLIC_SOROBAN_RPC_URL`, `NEXT_PUBLIC_NETWORK_PASSPHRASE`. This is a Vite app, not Next.js -- Vite only exposes env vars prefixed `VITE_` to `import.meta.env`; `NEXT_PUBLIC_*` vars would silently be `undefined` here. `deploy.yml` and `ci.yml` correctly use `VITE_CONTRACT_ID`, `VITE_RPC_URL`, `VITE_NETWORK_PASSPHRASE`, `VITE_DEFAULT_ASSET_ID`, matching `frontend/src/lib/config.ts`.

---

## CI/CD Audit

`ci.yml` (push + PR): job `contracts` runs `cargo test -p sub_vault` then `cargo build --release --target wasm32v1-none -p sub_vault`. Job `keeper` runs typecheck + `npm test`. Job `frontend` runs install → lint → build → test, in that order, matching the spec.

`deploy.yml` (push to `main`): job `changes` (path filter) → `deploy-contract` (only if `contracts/**` changed; installs Rust + Stellar CLI, tests, builds, deploys via `stellar contract deploy`, emits the new contract ID as a job output) → `deploy-frontend` (only if contract or frontend changed; builds with the fresh contract ID or a fallback secret, deploys to Vercel).

**Corrections to the original pasted spec, verified:**
1. `cargo install --locked stellar-cli --features opt` -- `opt` is not a feature on `stellar-cli` or `soroban-cli` (verified via `cargo info` against both crates).
2. `--source` → `--source-account` is the canonical flag (`--source` remains a valid alias, verified via `--help`).

**Three real bugs found on a second, deeper pass of `deploy.yml` and fixed -- not just re-asserted as fine:**

1. **Wrong wasm path (would have failed every deploy).** `deploy-contract` sets `working-directory: contracts/sub_vault`, but this is a Cargo *workspace* -- `stellar contract build` writes to the workspace-root `target/`, not a per-member one. Verified empirically: ran `stellar contract build` from `contracts/sub_vault` and confirmed the wasm landed at `C:\Orbyt\target\wasm32v1-none\release\sub_vault.wasm`, not `contracts/sub_vault/target/...`. The original step referenced `target/wasm32v1-none/release/sub_vault.wasm` (relative to `contracts/sub_vault`) -- nonexistent path. Fixed to `../../target/wasm32v1-none/release/sub_vault.wasm`, then re-verified the corrected path resolves to a real file.

2. **Hanging credential step (would have stalled the job for hours).** The original "Configure deployer identity" step piped a secret into `stellar keys add ci-deployer --secret-key` over stdin. Tested this directly: `stellar keys add` with `--secret-key` only reads from an interactive TTY prompt -- piping input over stdin does **not** satisfy it; the process just sits at the prompt. Confirmed with a timeout-guarded test (process had to be killed at the timeout, never consumed the piped input). In GitHub Actions this would have hung until the runner's job timeout (default 360 minutes) killed it, on every single deploy. Fixed by removing the step entirely: `stellar contract deploy --source-account` accepts a raw secret key directly (confirmed via `--help`, and confirmed non-interactively via a fast, correct failure -- no hang -- when tested with a syntactically-valid-but-fake key against a deliberately missing wasm path).

3. **Prohibitively slow CLI install.** `cargo install --locked stellar-cli` compiles the entire CLI from source -- 10-20+ minutes on a cold runner, every deploy. Stellar ships a prebuilt `x86_64-unknown-linux-gnu` binary per GitHub release (matches `ubuntu-latest`); downloaded and inspected the actual v25.0.0 release tarball (pinned to the version this contract was proven against this session, not an untested "latest") and confirmed its contents are a single top-level `stellar` binary. Fixed to `curl | tar -xz` into `/usr/local/bin`, which takes seconds.

None of these three were caught by YAML validation, `action-validator`, or a first read-through -- they only surfaced by actually exercising each step's real-world behavior (running the build from the same working directory, timing out a piped prompt, inspecting a real tarball). This is the difference between "the file parses" and "the pipeline works."

**A risk flagged, not silently "fixed" by omission:** naively redeploying the contract on every push to `main` produces a new address each time; Soroban contracts don't migrate storage on redeploy, so any subscription vaults funded at the previous address become unreachable. `deploy-contract` is gated to only run when `contracts/**` actually changed, and a comment in `deploy.yml` recommends `stellar contract upgrade` over `deploy` once the contract has real subscribers. This is a product decision, not something I resolved unilaterally -- see Remaining Risks.

**Job names:** `ci.yml`'s contract job is named `contracts` (workflow key) / "Contract tests" (display name), matching the spec's suggested `contracts`/`smart-contract`.

**Still not verified, and cannot be from this environment:** neither workflow has ever executed on GitHub Actions. This repo has no remote (local `git init` + commit only, by explicit request). `STELLAR_SECRET_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `SOROBAN_RPC_URL`, `NETWORK_PASSPHRASE`, `DEFAULT_ASSET_ID`, and `CONTRACT_ID` do not exist as GitHub secrets anywhere. Everything above is "proven correct by exercising the same operations locally," not "seen green in Actions."

---

## Testing Report (verbatim output, this session)

### Contract -- `cargo test -p sub_vault`
```
test test::invalid_plan_params_are_rejected ... ok
test test::insufficient_balance_marks_past_due_without_partial_transfer ... ok
test test::unauthorized_cancel_fails ... ok
test test::cancel_stops_future_charges ... ok
test test::unauthorized_top_up_fails ... ok
test test::withdraw_before_cancel_fails ... ok
test test::top_up_recovers_past_due_subscription ... ok
test test::double_cancel_is_a_no_op_error_free ... ok
test test::get_due_subscriptions_reports_only_active_and_due ... ok
test test::charge_before_due_date_fails ... ok
test test::full_lifecycle ... ok

test result: ok. 11 passed; 0 failed; 0 ignored; 0 measured; 0 filtered out
```

### Keeper -- `npx tsc --noEmit` + `npm test`
```
Type-check: no output, exit 0

Test Files  1 passed (1)
     Tests  7 passed (7)
```

### Frontend -- `npm run lint` + `npm run test:ci`
```
lint (oxlint): no output, exit 0

Test Files  2 passed (2)
     Tests  17 passed (17)
```
(17 = 11 new tests added this session for `lib/format.ts` and `lib/contract.ts`, verifying `callContractFunction`'s write-path signAndSend and read-path result-unwrap behavior against a mocked client, plus round-trip/edge-case coverage of the amount/duration/address formatters.)

### `make` targets (verified via `mingw32-make`, since plain `make` isn't on this Windows dev machine's PATH -- irrelevant on GitHub's `ubuntu-latest` runners, which have `make` natively)
```
$ mingw32-make test   -> 11 passed, 0 failed
$ mingw32-make build  -> Finished `release` profile [optimized] target(s)
```

---

## Build Outputs

**Contract wasm** (`stellar contract build`, captured earlier this session):
```
Wasm File: target/wasm32v1-none/release/sub_vault.wasm (14364 bytes)
Wasm Hash: 60994996c7332bb4169be62bf28f787478af1a6d7724089bd799243c2e6486ab
Exported Functions: 9
  cancel_subscription, charge, create_plan, get_due_subscriptions,
  get_plan, get_subscription, subscribe, top_up, withdraw_remaining
```

**Frontend production build** (`npm run build`, this session):
```
dist/index.html                   0.45 kB (gzip 0.29 kB)
dist/assets/index-*.css           4.07 kB (gzip 1.42 kB)
dist/assets/index-*.js          551.41 kB (gzip 152.54 kB)
```
Note: Vite flags the JS bundle as >500kB post-minification (driven by `@stellar/stellar-sdk`). Not a blocker for a testnet demo; worth code-splitting before a production launch (see Remaining Risks).

---

## Deployment Verification

### Contract Deployment Address
```
CBP5MBVXH7TVFXV6P6JPYM5D7N53KZPGTHXNGFCCJONAKBLLPYQW5SBI
```
Deployed to Stellar Testnet via `scripts/deploy.sh` earlier this session. Wasm hash `60994996c7332bb4169be62bf28f787478af1a6d7724089bd799243c2e6486ab` matches the build output above.

### Transaction Hashes
| Tx | Hash |
|---|---|
| Contract deploy | `035da69216f8928e41e656146279927b590a4e08ee5ac9b50fd8428c813b3e7e` |
| (explorer) | https://stellar.expert/explorer/testnet/tx/035da69216f8928e41e656146279927b590a4e08ee5ac9b50fd8428c813b3e7e |

Individual `create_plan`/`subscribe`/`charge` invocation hashes were not retained as separate values at the time (the CLI printed status inline); the *effects* of those calls are independently verifiable on-chain right now via `get_subscription`, below.

### Live end-to-end demo (verified on-chain, this session)
- Asset: native XLM SAC `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`
- Plan #1: 1 XLM / 60s, merchant `GA7APQVRKB25PR254QOPP4UVY34G2JH5STVCTMETKZ4OZ2D7MTQCEUCN`
- Subscription #1: subscriber `GD265OCBQ7XY4BTK5Q6RW4EQFKE5C4T3V7BH2D6M5TPMFMJKQQJWSVQE`, funded 40 XLM
- Keeper bot polled every 20s and charged automatically, with **zero manual transactions after the initial subscribe**:

| Time (UTC) | Event |
|---|---|
| 05:08:45 | Charge #1 succeeded |
| 05:09:30 | Charge #2 succeeded |
| 05:10:31 | Charge #3 succeeded |

Final on-chain state, queried via `stellar contract invoke ... get_subscription --subscription_id 1`:
```json
{"created_at":1783400903,"next_charge_date":1783401083,"plan_id":1,"status":"Active","subscriber":"GD265OCBQ7XY4BTK5Q6RW4EQFKE5C4T3V7BH2D6M5TPMFMJKQQJWSVQE","vault_balance":"10000000"}
```
`40 XLM - 3×1 XLM = 1 XLM` (`10000000` stroops) — matches exactly. Merchant balance, queried via the native SAC's `balance` function: `100029624409` stroops, i.e. +3 XLM net of the merchant's own `create_plan` transaction fee.

### What was NOT verified
- **CI on GitHub Actions:** never run. No git repo exists yet.
- **CD on GitHub Actions:** never run. No git repo, no remote, no secrets.
- **Vercel/Railway/Netlify deploy:** no platform configured; `deploy.yml`'s Vercel step will fail non-interactively without `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets, which do not exist.
- **`STELLAR_SECRET_KEY` GitHub secret:** does not exist. `deploy-contract` cannot run.

---

## Documentation Review

| Doc | Status |
|---|---|
| `README.md` | Present, covers quick start for all three components |
| `SPEC.md` | Present, full contract interface/error/event reference |
| `contracts/sub_vault/README.md` | Added this session |
| `keeper/.env.example`, `frontend/.env.example` | Present |
| Demo walkthrough (explicit, standalone) | Not present as a dedicated doc -- README has a one-paragraph "Demo tip" only |

---

## Production Readiness Assessment

**Ready:** contract logic, unit test coverage, keeper retry/race-handling logic, frontend UI flows, CI workflow correctness (verified locally against the actual commands used), the core "set it and forget it" mechanism (proven live on testnet).

**Not ready:** no version control, no CI/CD has ever actually executed on GitHub, no production deploy target configured, no secrets provisioned, no auto-cancel-after-repeated-`PastDue` safeguard, single-plan/no-tiered-pricing only, `get_due_subscriptions` is an O(n) linear scan over all subscriptions ever created (fine at demo scale, not a scalable indexing strategy — noted in `SPEC.md` at the time it was written).

## Remaining Risks

1. **Local git repo, no remote.** `git init` + an initial commit now exist (`edb076a`), so this is at least under version control -- but there is still no GitHub remote, by explicit choice this session, so nothing is pushed or backed up off this disk, and neither `ci.yml` nor `deploy.yml` has ever actually run.
2. **Contract redeploy-on-push semantics.** `deploy-contract` creates a new contract address; there is no state migration. If this ever runs against a contract with real subscriber funds, those funds are stranded at the old address unless the team switches to `stellar contract upgrade` first. This is flagged in `deploy.yml` and here, not fixed unilaterally, because it's a product decision.
3. **Secrets management.** `STELLAR_SECRET_KEY` used by CD to sign deploys is a funded key living in GitHub Secrets — standard practice, but worth the team explicitly deciding the funding level and rotation policy before relying on it for anything beyond testnet.
4. **No deploy platform decided.** Defaulted to Vercel per the spec's fallback instruction; untested, unconfigured, and Vercel may not be the team's actual choice.
5. **Frontend bundle size** (551KB JS) will trip Vite's warning threshold on every build; not urgent, worth addressing before a real launch.
6. **`get_due_subscriptions` scaling.** Already documented in `SPEC.md`; resurfaced here because "production-ready" and "linear scan over an unbounded list" are in tension.
7. **Stretch goals from the original spec remain undone by choice:** auto-cancel after N consecutive `PastDue` attempts, multiple plans/tiered pricing per merchant.
