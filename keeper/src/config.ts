import "dotenv/config";

export interface Config {
  keeperSecretKey: string;
  contractId: string;
  rpcUrl: string;
  networkPassphrase: string;
  pollIntervalMs: number;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function loadConfig(): Config {
  return {
    keeperSecretKey: requireEnv("KEEPER_SECRET_KEY"),
    contractId: requireEnv("CONTRACT_ID"),
    rpcUrl: requireEnv("RPC_URL"),
    networkPassphrase: requireEnv("NETWORK_PASSPHRASE"),
    pollIntervalMs: Number(process.env.POLL_INTERVAL_MS ?? 300_000),
  };
}
