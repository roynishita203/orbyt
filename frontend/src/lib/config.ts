export const config = {
  contractId: import.meta.env.VITE_CONTRACT_ID as string,
  rpcUrl: import.meta.env.VITE_RPC_URL as string,
  networkPassphrase: import.meta.env.VITE_NETWORK_PASSPHRASE as string,
  defaultAssetId: (import.meta.env.VITE_DEFAULT_ASSET_ID as string) ?? "",
};

export function assertConfigured() {
  const missing = Object.entries(config)
    .filter(([key, value]) => key !== "defaultAssetId" && !value)
    .map(([key]) => key);
  if (missing.length > 0) {
    throw new Error(
      `Missing frontend configuration: ${missing.join(", ")}. Copy .env.example to .env and fill it in.`,
    );
  }
}
