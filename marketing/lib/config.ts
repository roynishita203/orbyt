export const config = {
  contractId: process.env.NEXT_PUBLIC_CONTRACT_ID as string,
  rpcUrl: process.env.NEXT_PUBLIC_RPC_URL as string,
  networkPassphrase: process.env.NEXT_PUBLIC_NETWORK_PASSPHRASE as string,
  defaultAssetId: (process.env.NEXT_PUBLIC_DEFAULT_ASSET_ID as string) ?? "",
}

export function assertConfigured() {
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "defaultAssetId" && !value)
    .map(([key]) => key)
  if (missing.length > 0) {
    throw new Error(`Missing dashboard configuration: ${missing.join(", ")}. Set these in .env.local.`)
  }
}
