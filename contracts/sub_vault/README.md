# sub_vault

Soroban contract implementing SubVault's recurring-payments vault. Full
interface, error, and event reference: [`../../SPEC.md`](../../SPEC.md).

## Deployed (Testnet)

```
Contract ID: CBP5MBVXH7TVFXV6P6JPYM5D7N53KZPGTHXNGFCCJONAKBLLPYQW5SBI
Wasm hash:   60994996c7332bb4169be62bf28f787478af1a6d7724089bd799243c2e6486ab
Network:     Test SDF Network ; September 2015
```

## Commands

```bash
make test     # cargo test
make build    # cargo build --release --target wasm32v1-none
make deploy   # ../../scripts/deploy.sh -- deploys to testnet, prints the contract ID
make fmt      # cargo fmt
make clean    # cargo clean
```

Or directly:

```bash
cargo test -p sub_vault
stellar contract build   # produces target/wasm32v1-none/release/sub_vault.wasm with full metadata
```

## Why `wasm32v1-none`, not `wasm32-unknown-unknown`

Soroban SDK 22+ (this crate uses 26.1.0) targets `wasm32v1-none`, not the
older `wasm32-unknown-unknown`. `rustup target add wasm32v1-none` is
required; building against `wasm32-unknown-unknown` is not the artifact
`stellar contract build` or this Makefile produce.

## Layout

| File | Contents |
|---|---|
| `src/lib.rs` | Contract entry points (`create_plan`, `subscribe`, `charge`, ...) |
| `src/types.rs` | `PlanData`, `SubscriptionData`, `SubStatus`, storage keys |
| `src/error.rs` | `Error` enum |
| `src/events.rs` | `#[contractevent]` definitions |
| `src/test.rs` | Unit tests (`#[cfg(test)]`, run via `cargo test`) |
