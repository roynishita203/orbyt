"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { MerchantView } from "@/components/dashboard/merchant-view"
import { SubscriberView } from "@/components/dashboard/subscriber-view"
import { WalletStatus } from "@/components/dashboard/wallet-status"
import { useWallet } from "@/hooks/use-wallet"
import { assertConfigured } from "@/lib/config"
import { createContractClient } from "@/lib/contractClient"
import type { SubVaultClient } from "@/lib/subVaultTypes"

type Tab = "subscriber" | "merchant"

export default function DashboardPage() {
  const { address } = useWallet()
  const [tab, setTab] = useState<Tab>("subscriber")
  const [client, setClient] = useState<SubVaultClient | null>(null)
  const [configError, setConfigError] = useState<string | null>(null)

  useEffect(() => {
    try {
      assertConfigured()
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err))
      return
    }
    createContractClient(address ?? undefined)
      .then(setClient)
      .catch((err) => setConfigError(err instanceof Error ? err.message : String(err)))
  }, [address])

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-4 mb-6">
        <div>
          <Link href="/" className="text-sm text-gray-500 dark:text-gray-400 hover:text-[#7A7FEE] transition-colors">
            ← SubVault
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-1">Dashboard</h1>
        </div>
        <WalletStatus />
      </header>

      {configError && (
        <p className="mb-6 p-4 rounded-md border border-red-300 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {configError}
        </p>
      )}

      <nav className="flex gap-2 mb-6">
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "subscriber"
              ? "bg-[#7A7FEE] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
          onClick={() => setTab("subscriber")}
        >
          Subscriber
        </button>
        <button
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            tab === "merchant"
              ? "bg-[#7A7FEE] text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
          onClick={() => setTab("merchant")}
        >
          Merchant
        </button>
      </nav>

      {tab === "subscriber" ? (
        <SubscriberView client={client} address={address} />
      ) : (
        <MerchantView client={client} address={address} />
      )}
    </main>
  )
}
