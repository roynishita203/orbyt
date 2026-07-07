.PHONY: build test deploy fmt clean

# Soroban SDK 22+ requires the wasm32v1-none target (wasm32-unknown-unknown
# is the older/generic target and is not what `stellar contract build`
# actually produces for this SDK version -- see ../../README.md).
build:
	cargo build --release --target wasm32v1-none

test:
	cargo test

deploy:
	../../scripts/deploy.sh

fmt:
	cargo fmt

clean:
	cargo clean
