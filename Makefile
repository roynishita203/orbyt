.PHONY: build test deploy fmt clean

# Root workspace Makefile for SubVault.
# The Soroban SDK (26.x) requires the wasm32v1-none target; wasm32-unknown-unknown
# is the older/generic target and is not what `stellar contract build` produces
# for this SDK version (see README.md).

build:
	cargo build --release --target wasm32v1-none

test:
	cargo test

deploy:
	./scripts/deploy.sh

fmt:
	cargo fmt

clean:
	cargo clean
