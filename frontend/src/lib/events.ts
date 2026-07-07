import { rpc, scValToNative } from "@stellar/stellar-sdk";
import { config } from "./config";

const server = new rpc.Server(config.rpcUrl);

// Soroban RPC nodes only retain a bounded window of events (commonly ~7
// days on testnet). This app has no on-chain enumeration for plans or
// subscriptions, so it discovers them by replaying PlanCreated /
// SubscriptionCreated / ChargeSuccess events instead.
const LEDGER_WINDOW = 17280 * 2; // ~2 days at 5s/ledger
const MAX_PAGES = 20;
const PAGE_LIMIT = 200;

export interface PlanCreatedEvent {
  planId: bigint;
  merchant: string;
  amount: bigint;
  intervalSecs: bigint;
}

export interface SubscriptionCreatedEvent {
  subscriptionId: bigint;
  subscriber: string;
  planId: bigint;
  initialFunding: bigint;
}

export interface ChargeSuccessEvent {
  subscriptionId: bigint;
  amount: bigint;
  nextChargeDate: bigint;
}

export interface ScannedEvents {
  plansCreated: PlanCreatedEvent[];
  subscriptionsCreated: SubscriptionCreatedEvent[];
  chargesSucceeded: ChargeSuccessEvent[];
}

export async function scanEvents(): Promise<ScannedEvents> {
  const plansCreated: PlanCreatedEvent[] = [];
  const subscriptionsCreated: SubscriptionCreatedEvent[] = [];
  const chargesSucceeded: ChargeSuccessEvent[] = [];

  const latest = await server.getLatestLedger();
  const startLedger = Math.max(1, latest.sequence - LEDGER_WINDOW);

  let cursor: string | undefined;
  for (let page = 0; page < MAX_PAGES; page++) {
    const response = await server.getEvents(
      cursor
        ? { filters: [{ type: "contract", contractIds: [config.contractId] }], cursor, limit: PAGE_LIMIT }
        : {
            filters: [{ type: "contract", contractIds: [config.contractId] }],
            startLedger,
            limit: PAGE_LIMIT,
          },
    );

    for (const event of response.events) {
      const name = scValToNative(event.topic[0]) as string;
      const data = scValToNative(event.value) as Record<string, unknown>;

      switch (name) {
        case "plan_created":
          plansCreated.push({
            planId: scValToNative(event.topic[1]) as bigint,
            merchant: data.merchant as string,
            amount: data.amount as bigint,
            intervalSecs: data.interval_secs as bigint,
          });
          break;
        case "subscription_created":
          subscriptionsCreated.push({
            subscriptionId: scValToNative(event.topic[1]) as bigint,
            subscriber: data.subscriber as string,
            planId: data.plan_id as bigint,
            initialFunding: data.initial_funding as bigint,
          });
          break;
        case "charge_success":
          chargesSucceeded.push({
            subscriptionId: scValToNative(event.topic[1]) as bigint,
            amount: data.amount as bigint,
            nextChargeDate: data.next_charge_date as bigint,
          });
          break;
        default:
          break;
      }
    }

    if (response.events.length < PAGE_LIMIT) break;
    cursor = response.cursor;
  }

  return { plansCreated, subscriptionsCreated, chargesSucceeded };
}
