#!/usr/bin/env bash
# Builds and deploys the SubVault contract to Stellar Testnet.
#
# Usage: scripts/deploy.sh [identity-name]
#
# Requires the `stellar` CLI: https://developers.stellar.org/docs/tools/cli/stellar-cli
set -euo pipefail

IDENTITY="${1:-sub-vault-deployer}"
NETWORK="testnet"

cd "$(dirname "$0")/.."

if ! stellar keys address "$IDENTITY" >/dev/null 2>&1; then
  echo "Creating and funding identity '$IDENTITY' on $NETWORK..."
  stellar keys generate "$IDENTITY" --network "$NETWORK" --fund
fi

echo "Building contract..."
stellar contract build

WASM_PATH="target/wasm32v1-none/release/sub_vault.wasm"

echo "Deploying to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm "$WASM_PATH" \
  --source-account "$IDENTITY" \
  --network "$NETWORK")

NATIVE_ASSET_ID=$(stellar contract id asset --asset native --network "$NETWORK")

cat <<EOF

Deployed SubVault contract: $CONTRACT_ID

For a zero-setup demo asset, the native XLM Stellar Asset Contract is
already available on every network -- no separate token deploy needed:
  Native asset SAC: $NATIVE_ASSET_ID

Next steps:
  - keeper/.env:    CONTRACT_ID=$CONTRACT_ID
  - frontend/.env:  VITE_CONTRACT_ID=$CONTRACT_ID
  - frontend/.env:  VITE_DEFAULT_ASSET_ID=$NATIVE_ASSET_ID
EOF
