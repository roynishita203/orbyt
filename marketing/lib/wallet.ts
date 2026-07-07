import { isConnected, isAllowed, requestAccess, getAddress, signTransaction as freighterSignTransaction } from "@stellar/freighter-api"
import type { SignTransaction } from "@stellar/stellar-sdk/contract"

// Freighter is a Manifest V3 extension -- its service worker can take a
// moment to spin up on first invocation after the browser starts, so keep
// this generous enough to not misdetect "not installed" on a cold start.
const DETECTION_TIMEOUT_MS = 3000

/**
 * isConnected()/isAllowed() message the Freighter content script and wait
 * for a response with no built-in timeout -- if the extension isn't
 * installed, nothing ever replies and the promise hangs forever. Race it
 * against a timeout so "not installed" resolves to a value instead of
 * hanging the UI.
 */
function withDetectionTimeout<T>(promise: Promise<T>, fallback: T): Promise<T> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(fallback), DETECTION_TIMEOUT_MS)
    promise.then((value) => {
      clearTimeout(timer)
      resolve(value)
    })
  })
}

/** Whether the Freighter browser extension is installed and detectable. */
export async function detectFreighter(): Promise<boolean> {
  const result = await withDetectionTimeout(isConnected(), { isConnected: false })
  if (result.error) return false
  return result.isConnected
}

/**
 * Requests permission to access the user's wallet (prompting Freighter's
 * own popup if needed) and returns the connected G-address.
 *
 * requestAccess() already returns the address directly -- an earlier
 * version of this function made a redundant follow-up getAddress() call,
 * which added an extra round-trip that could fail even after the user had
 * already approved the popup, making a successful connection look like it
 * silently did nothing.
 */
export async function connectWallet(): Promise<string> {
  const accessResult = await requestAccess()
  if (accessResult.error) {
    throw new Error(accessResult.error.message ?? "Freighter access was denied.")
  }
  return accessResult.address
}

/**
 * Silently returns the currently connected address, without prompting the
 * user, or `null` if the app has not been granted access yet (or Freighter
 * isn't installed at all).
 */
export async function getWalletAddress(): Promise<string | null> {
  const allowedResult = await withDetectionTimeout(isAllowed(), { isAllowed: false })
  if (allowedResult.error || !allowedResult.isAllowed) return null

  const addressResult = await getAddress()
  if (addressResult.error) return null

  return addressResult.address
}

export function shortenAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 5)}…${address.slice(-5)}`
}

/** Signs a contract transaction XDR with Freighter -- passed to contract.Client.from(). */
export const signTransaction: SignTransaction = async (xdr, opts) => {
  const result = await freighterSignTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase,
    address: opts?.address,
  })
  if (result.error) {
    throw new Error(result.error.message ?? "Freighter declined to sign the transaction.")
  }
  return result
}
