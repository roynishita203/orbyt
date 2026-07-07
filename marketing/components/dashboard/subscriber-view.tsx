"use client"

import { useState } from "react"
import { useSubscriberData } from "@/hooks/use-subscriber-data"
import { shortenAddress } from "@/lib/wallet"
import { formatAmount, formatDuration, formatTimestamp, parseAmount, parseWholeNumber } from "@/lib/format"
import { SubStatus, type SubStatusValue, type SubVaultClient } from "@/lib/subVaultTypes"
import { StatusBadge } from "./status-badge"

interface Props {
  client: SubVaultClient | null
  address: string | null
}

const inputClass =
  "px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white min-w-[120px]"
const secondaryButtonClass =
  "px-4 py-2 rounded-md border border-gray-300 dark:border-gray-600 text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"

export function SubscriberView({ client, address }: Props) {
  const { availablePlans, mySubscriptions, loading, error, refresh } = useSubscriberData(client, address)
  const [selectedPlanId, setSelectedPlanId] = useState("")
  const [fundingInput, setFundingInput] = useState("10")
  const [busy, setBusy] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusy(key)
    setActionError(null)
    try {
      await action()
      refresh()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err))
    } finally {
      setBusy(null)
    }
  }

  const subscribe = () =>
    runAction("subscribe", async () => {
      if (!client || !address) throw new Error("Connect your wallet first.")
      if (!selectedPlanId) throw new Error("Choose a plan first.")
      const tx = await client.subscribe({
        subscriber: address,
        plan_id: parseWholeNumber(selectedPlanId, "Plan ID"),
        initial_funding: parseAmount(fundingInput),
      })
      await tx.signAndSend()
    })

  const topUp = (subscriptionId: bigint, amount: string) =>
    runAction(`topup-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.")
      const tx = await client.top_up({ subscription_id: subscriptionId, subscriber: address, amount: parseAmount(amount) })
      await tx.signAndSend()
    })

  const cancel = (subscriptionId: bigint) =>
    runAction(`cancel-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.")
      const tx = await client.cancel_subscription({ subscription_id: subscriptionId, caller: address })
      await tx.signAndSend()
    })

  const withdraw = (subscriptionId: bigint) =>
    runAction(`withdraw-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.")
      const tx = await client.withdraw_remaining({ subscription_id: subscriptionId, caller: address })
      await tx.signAndSend()
    })

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Browse Plans</h2>
        {loading && <p className="text-sm text-gray-500 dark:text-gray-400">Loading plans…</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {availablePlans.length === 0 && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No plans found yet.</p>
        )}
        {availablePlans.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Plan</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Merchant</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Amount</th>
                <th className="text-left py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Interval</th>
                <th className="py-2 px-3" />
              </tr>
            </thead>
            <tbody>
              {availablePlans.map((plan) => (
                <tr key={String(plan.planId)}>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">#{String(plan.planId)}</td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {shortenAddress(plan.merchant)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {formatAmount(plan.amount)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    {formatDuration(plan.intervalSecs)}
                  </td>
                  <td className="py-2 px-3 border-t border-gray-100 dark:border-gray-800">
                    <button className={secondaryButtonClass} onClick={() => setSelectedPlanId(String(plan.planId))}>
                      Select
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="flex flex-wrap items-end gap-3 mt-4">
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Plan ID
            <input
              className={inputClass}
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              placeholder="e.g. 1"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-gray-500 dark:text-gray-400">
            Initial funding
            <input className={inputClass} value={fundingInput} onChange={(e) => setFundingInput(e.target.value)} />
          </label>
          <button className="btn-primary" disabled={busy === "subscribe" || !address} onClick={() => void subscribe()}>
            {busy === "subscribe" ? "Subscribing…" : "Subscribe"}
          </button>
        </div>
        {actionError && <p className="text-sm text-red-500 mt-3">{actionError}</p>}
      </section>

      <section className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">My Subscriptions</h2>
        {!address && <p className="text-sm text-gray-500 dark:text-gray-400">Connect your wallet to see your subscriptions.</p>}
        {address && mySubscriptions.length === 0 && !loading && (
          <p className="text-sm text-gray-500 dark:text-gray-400">No subscriptions yet.</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
          {mySubscriptions.map(({ subscriptionId, data }) => (
            <SubscriptionCard
              key={String(subscriptionId)}
              subscriptionId={subscriptionId}
              vaultBalance={data.vault_balance}
              nextChargeDate={data.next_charge_date}
              status={data.status}
              busy={busy}
              onTopUp={(amount) => topUp(subscriptionId, amount)}
              onCancel={() => cancel(subscriptionId)}
              onWithdraw={() => withdraw(subscriptionId)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function SubscriptionCard({
  subscriptionId,
  vaultBalance,
  nextChargeDate,
  status,
  busy,
  onTopUp,
  onCancel,
  onWithdraw,
}: {
  subscriptionId: bigint
  vaultBalance: bigint
  nextChargeDate: bigint
  status: number
  busy: string | null
  onTopUp: (amount: string) => void
  onCancel: () => void
  onWithdraw: () => void
}) {
  const [topUpAmount, setTopUpAmount] = useState("10")
  const isCancelled = status === SubStatus.Cancelled

  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-4 flex flex-col gap-2">
      <div className="flex justify-between items-center font-medium text-gray-900 dark:text-white">
        <span>Subscription #{String(subscriptionId)}</span>
        <StatusBadge status={status as SubStatusValue} />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-300">Vault balance: {formatAmount(vaultBalance)}</p>
      <p className="text-sm text-gray-600 dark:text-gray-300">Next charge: {formatTimestamp(nextChargeDate)}</p>

      {!isCancelled && (
        <div className="flex flex-wrap gap-2 mt-2">
          <input className={inputClass} value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
          <button
            className={secondaryButtonClass}
            disabled={busy === `topup-${subscriptionId}`}
            onClick={() => onTopUp(topUpAmount)}
          >
            Top Up
          </button>
          <button className={secondaryButtonClass} disabled={busy === `cancel-${subscriptionId}`} onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      {isCancelled && (
        <button
          className={`${secondaryButtonClass} mt-2`}
          disabled={busy === `withdraw-${subscriptionId}`}
          onClick={onWithdraw}
        >
          Withdraw Remaining
        </button>
      )}
    </div>
  )
}
