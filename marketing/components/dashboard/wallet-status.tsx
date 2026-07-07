"use client"

import { useWallet } from "@/hooks/use-wallet"

/** Dashboard header wallet control. Per product decision, the address itself is never shown -- just connect/disconnect. */
export function WalletStatus() {
  const { address, isInstalled, isConnecting, error, connect, disconnect } = useWallet()

  if (isInstalled === false) {
    return (
      <a
        href="https://freighter.app"
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        Install Freighter
      </a>
    )
  }

  return (
    <div className="flex items-center gap-3">
      {address ? (
        <button
          onClick={disconnect}
          className="px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          Disconnect
        </button>
      ) : (
        <button onClick={() => void connect()} disabled={isConnecting} className="btn-primary">
          {isConnecting ? "Connecting…" : "Connect Freighter"}
        </button>
      )}
      {error && <span className="text-sm text-red-500">{error}</span>}
    </div>
  )
}
