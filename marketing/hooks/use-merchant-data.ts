"use client"

import { useCallback, useEffect, useState } from "react"
import { scanEvents } from "@/lib/events"
import type { SubVaultClient, SubscriptionData } from "@/lib/subVaultTypes"

export interface MerchantSubscriberRow {
  subscriptionId: bigint
  subscriber: string
  data: SubscriptionData
}

export interface MerchantData {
  planIds: bigint[]
  subscribers: MerchantSubscriberRow[]
  revenue: bigint
  loading: boolean
  error: string | null
  refresh: () => void
}

export function useMerchantData(client: SubVaultClient | null, merchant: string | null): MerchantData {
  const [planIds, setPlanIds] = useState<bigint[]>([])
  const [subscribers, setSubscribers] = useState<MerchantSubscriberRow[]>([])
  const [revenue, setRevenue] = useState<bigint>(0n)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), [])

  useEffect(() => {
    if (!client || !merchant) {
      setPlanIds([])
      setSubscribers([])
      setRevenue(0n)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        const events = await scanEvents()
        const myPlanIds = events.plansCreated.filter((p) => p.merchant === merchant).map((p) => p.planId)
        const myPlanIdSet = new Set(myPlanIds.map(String))

        const mySubs = events.subscriptionsCreated.filter((s) => myPlanIdSet.has(String(s.planId)))
        const mySubIdSet = new Set(mySubs.map((s) => String(s.subscriptionId)))

        const totalRevenue = events.chargesSucceeded
          .filter((c) => mySubIdSet.has(String(c.subscriptionId)))
          .reduce((sum, c) => sum + c.amount, 0n)

        const rows = await Promise.all(
          mySubs.map(async (s) => {
            const { result } = await client.get_subscription({ subscription_id: s.subscriptionId })
            return { subscriptionId: s.subscriptionId, subscriber: s.subscriber, data: result }
          }),
        )

        if (cancelled) return
        setPlanIds(myPlanIds)
        setSubscribers(rows)
        setRevenue(totalRevenue)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [client, merchant, refreshToken])

  return { planIds, subscribers, revenue, loading, error, refresh }
}
