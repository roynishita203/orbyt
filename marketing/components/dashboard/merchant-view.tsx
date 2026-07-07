"use client"

import { useState } from "react"
import { useMerchantData } from "@/hooks/use-merchant-data"
import { config } from "@/lib/config"
import { shortenAddress } from "@/lib/wallet"
import { formatAmount, formatTimestamp, parseAmount, parseWholeNumber } from "@/lib/format"
import type { SubStatusValue, SubVaultClient } from "@/lib/subVaultTypes"
import { StatusBadge } from "./status-badge"

interface Props {
  client: SubVaultClient | null
  address: string | null
}

const DEMO_INTERVALS = [
  { label: "60 seconds (demo)", secs: 60 },
  { label: "2 minutes (demo)", secs: 120 },
  { label: "1 day", secs: 86_400 },
  { label: "30 days", secs: 2_592_000 },
]

const inputClass =
  "px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white min-w-[120px]"

export function MerchantView({ client, address }: Props) {
  const { subscribers, revenue, loading, error, refresh } = useMerchantData(client, address)
  const [amount, setAmount] = useState("10")
  const [intervalSecs, setIntervalSecs] = useState(String(DEMO_INTERVALS[3].secs))
  const [asset, setAsset] = useState(config.defaultAssetId)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [lastPlanId, setLastPlanId] = useState<string | null>(null)

  const createPlan = async () => {
    if (!client || !address) {
      setCreateError("Connect your wallet first.")
      return
    }
    setCreating(true)
    setCreateError(null)
    try {
      const tx = await client.create_plan({
        merchant: address,
        amount: parseAmount(amount),
        interval_secs: parseWholeNumber(intervalSecs, "interval"),
        asset,
      })
      const sent = await tx.signAndSend()
      setLastPlanId(String(sent.result))
      refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create Plan</h2>
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Amount
            <input className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Interval
            <select className={inputClass} value={intervalSecs} onChange={(e) => setIntervalSecs(e.target.value)}>
              {DEMO_INTERVALS.map((opt) => (
                <option key={opt.secs} value={opt.secs}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Asset (SAC address)
            <input className={inputClass} value={asset} onChange={(e) => setAsset(e.target.value)} />
          </label>
          <button className="btn-primary" disabled={creating || !address} onClick={() => void createPlan()}>
            {creating ? "Creating…" : "Create Plan"}
          </button>
        </div>
        {lastPlanId && <p className="text-sm text-gray-500 dark:text-gray-400 mt-3">Created plan #{lastPlanId}</p>}
        {createError && <p className="text-sm text-red-500 mt-3">{createError}</p>}
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Revenue</h2>
        <p className="text-3xl font-semibold text-gray-900 dark:text-white">{formatAmount(revenue)}</p>
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Active Subscribers</h2>
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {subscribers.length === 0 && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No subscribers yet.</p>
        )}
        {subscribers.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Subscription</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Subscriber</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Status</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Vault Balance</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Next Charge</th>
              </tr>
            </thead>
            <tbody>
              {subscribers.map((row) => (
                <tr key={String(row.subscriptionId)}>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    #{String(row.subscriptionId)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {shortenAddress(row.subscriber)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    <StatusBadge status={row.data.status as SubStatusValue} />
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {formatAmount(row.data.vault_balance)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {formatTimestamp(row.data.next_charge_date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
