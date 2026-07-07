// Most Stellar assets (including SAC-wrapped USDC) use 7 decimal places.
const ASSET_DECIMALS = 7
const SCALE = 10n ** BigInt(ASSET_DECIMALS)

export function formatAmount(amount: bigint): string {
  const whole = amount / SCALE
  const fraction = amount % SCALE
  if (fraction === 0n) return whole.toString()
  return `${whole}.${fraction.toString().padStart(ASSET_DECIMALS, "0").replace(/0+$/, "")}`
}

/** Parses a decimal amount like "10" or "10.5" into stroops. Throws a
 * friendly error instead of letting an invalid string reach BigInt()
 * directly, which throws an unreadable native error (e.g. calling
 * BigInt("abc") throws "Cannot convert abc to a BigInt"). */
export function parseAmount(input: string): bigint {
  const trimmed = input.trim()
  if (!/^\d+(\.\d*)?$|^\.\d+$/.test(trimmed)) {
    throw new Error(`"${input}" is not a valid amount. Enter a number like 10 or 10.5.`)
  }
  const [wholePart, fractionPart = ""] = trimmed.split(".")
  const whole = BigInt(wholePart || "0")
  const fraction = fractionPart.padEnd(ASSET_DECIMALS, "0").slice(0, ASSET_DECIMALS)
  return whole * SCALE + BigInt(fraction || "0")
}

/** Parses a whole-number id/interval field. Throws a friendly error instead
 * of letting an invalid string reach BigInt() directly. */
export function parseWholeNumber(input: string, label: string): bigint {
  const trimmed = input.trim()
  if (!/^\d+$/.test(trimmed)) {
    throw new Error(`"${input}" is not a valid ${label}. Enter a whole number.`)
  }
  return BigInt(trimmed)
}

export function formatDuration(seconds: bigint): string {
  const s = Number(seconds)
  if (s % 86400 === 0) return `${s / 86400}d`
  if (s % 3600 === 0) return `${s / 3600}h`
  if (s % 60 === 0) return `${s / 60}m`
  return `${s}s`
}

export function formatTimestamp(seconds: bigint): string {
  return new Date(Number(seconds) * 1000).toLocaleString()
}
