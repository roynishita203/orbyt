import { useCallback, useEffect, useState } from "react";
import { scanEvents, type PlanCreatedEvent } from "../lib/events";
import type { SubVaultClient, SubscriptionData } from "../lib/subVaultTypes";

export interface MySubscriptionRow {
  subscriptionId: bigint;
  data: SubscriptionData;
}

export interface SubscriberData {
  availablePlans: PlanCreatedEvent[];
  mySubscriptions: MySubscriptionRow[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

const LIVE_POLL_MS = 20_000;

export function useSubscriberData(client: SubVaultClient | null, subscriber: string | null): SubscriberData {
  const [availablePlans, setAvailablePlans] = useState<PlanCreatedEvent[]>([]);
  const [mySubscriptions, setMySubscriptions] = useState<MySubscriptionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);

  const refresh = useCallback(() => setRefreshToken((t) => t + 1), []);

  useEffect(() => {
    if (!client) {
      setAvailablePlans([]);
      setMySubscriptions([]);
      return;
    }

    let cancelled = false;
    let knownSubscriptionIds: bigint[] = [];

    const loadLiveSubscriptions = async () => {
      if (knownSubscriptionIds.length === 0 || !client) return;
      const rows = await Promise.all(
        knownSubscriptionIds.map(async (id) => {
          const { result } = await client.get_subscription({ subscription_id: id });
          return { subscriptionId: id, data: result };
        }),
      );
      if (!cancelled) setMySubscriptions(rows);
    };

    setLoading(true);
    setError(null);

    (async () => {
      try {
        const events = await scanEvents();
        if (cancelled) return;

        const dedupedPlans = Array.from(
          new Map(events.plansCreated.map((p) => [String(p.planId), p])).values(),
        );
        setAvailablePlans(dedupedPlans);

        knownSubscriptionIds = subscriber
          ? events.subscriptionsCreated
              .filter((s) => s.subscriber === subscriber)
              .map((s) => s.subscriptionId)
          : [];

        await loadLiveSubscriptions();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    const interval = setInterval(() => {
      void loadLiveSubscriptions();
    }, LIVE_POLL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [client, subscriber, refreshToken]);

  return { availablePlans, mySubscriptions, loading, error, refresh };
}
