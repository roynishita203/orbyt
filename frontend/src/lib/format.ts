// Most Stellar assets (including SAC-wrapped USDC) use 7 decimal places.
const ASSET_DECIMALS = 7;
const SCALE = 10n ** BigInt(ASSET_DECIMALS);

export function formatAmount(amount: bigint): string {
  const whole = amount / SCALE;
  const fraction = amount % SCALE;
  if (fraction === 0n) return whole.toString();
  return `${whole}.${fraction.toString().padStart(ASSET_DECIMALS, "0").replace(/0+$/, "")}`;
}

export function parseAmount(input: string): bigint {
  const [wholePart, fractionPart = ""] = input.trim().split(".");
  const whole = BigInt(wholePart || "0");
  const fraction = fractionPart.padEnd(ASSET_DECIMALS, "0").slice(0, ASSET_DECIMALS);
  return whole * SCALE + BigInt(fraction || "0");
}

export function formatDuration(seconds: bigint): string {
  const s = Number(seconds);
  if (s % 86400 === 0) return `${s / 86400}d`;
  if (s % 3600 === 0) return `${s / 3600}h`;
  if (s % 60 === 0) return `${s / 60}m`;
  return `${s}s`;
}

export function formatTimestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString();
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 5)}…${address.slice(-5)}`;
}
