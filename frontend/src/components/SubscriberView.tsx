import { useState } from "react";
import { useSubscriberData } from "../hooks/useSubscriberData";
import { formatAmount, formatDuration, formatTimestamp, parseAmount, shortenAddress } from "../lib/format";
import { SubStatus, subStatusLabel, type SubStatusValue, type SubVaultClient } from "../lib/subVaultTypes";

interface Props {
  client: SubVaultClient | null;
  address: string | null;
}

export function SubscriberView({ client, address }: Props) {
  const { availablePlans, mySubscriptions, loading, error, refresh } = useSubscriberData(client, address);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("");
  const [fundingInput, setFundingInput] = useState("10");
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setActionError(null);
    try {
      await action();
      refresh();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const subscribe = () =>
    runAction("subscribe", async () => {
      if (!client || !address) throw new Error("Connect your wallet first.");
      if (!selectedPlanId) throw new Error("Choose a plan first.");
      const tx = await client.subscribe({
        subscriber: address,
        plan_id: BigInt(selectedPlanId),
        initial_funding: parseAmount(fundingInput),
      });
      await tx.signAndSend();
    });

  const topUp = (subscriptionId: bigint, amount: string) =>
    runAction(`topup-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.");
      const tx = await client.top_up({
        subscription_id: subscriptionId,
        subscriber: address,
        amount: parseAmount(amount),
      });
      await tx.signAndSend();
    });

  const cancel = (subscriptionId: bigint) =>
    runAction(`cancel-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.");
      const tx = await client.cancel_subscription({ subscription_id: subscriptionId, caller: address });
      await tx.signAndSend();
    });

  const withdraw = (subscriptionId: bigint) =>
    runAction(`withdraw-${subscriptionId}`, async () => {
      if (!client || !address) throw new Error("Connect your wallet first.");
      const tx = await client.withdraw_remaining({ subscription_id: subscriptionId, caller: address });
      await tx.signAndSend();
    });

  return (
    <div className="view">
      <section className="panel">
        <h2>Browse Plans</h2>
        {loading && <p className="muted">Loading plans…</p>}
        {error && <p className="error">{error}</p>}
        {availablePlans.length === 0 && !loading && <p className="muted">No plans found yet.</p>}
        <table>
          <thead>
            <tr>
              <th>Plan</th>
              <th>Merchant</th>
              <th>Amount</th>
              <th>Interval</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {availablePlans.map((plan) => (
              <tr key={String(plan.planId)}>
                <td>#{String(plan.planId)}</td>
                <td>{shortenAddress(plan.merchant)}</td>
                <td>{formatAmount(plan.amount)}</td>
                <td>{formatDuration(plan.intervalSecs)}</td>
                <td>
                  <button onClick={() => setSelectedPlanId(String(plan.planId))}>Select</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="row">
          <label>
            Plan ID
            <input
              value={selectedPlanId}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              placeholder="e.g. 1"
            />
          </label>
          <label>
            Initial funding
            <input value={fundingInput} onChange={(e) => setFundingInput(e.target.value)} />
          </label>
          <button disabled={busy === "subscribe" || !address} onClick={() => void subscribe()}>
            {busy === "subscribe" ? "Subscribing…" : "Subscribe"}
          </button>
        </div>
        {actionError && <p className="error">{actionError}</p>}
      </section>

      <section className="panel">
        <h2>My Subscriptions</h2>
        {!address && <p className="muted">Connect your wallet to see your subscriptions.</p>}
        {address && mySubscriptions.length === 0 && !loading && (
          <p className="muted">No subscriptions yet.</p>
        )}
        <div className="cards">
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
  );
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
  subscriptionId: bigint;
  vaultBalance: bigint;
  nextChargeDate: bigint;
  status: number;
  busy: string | null;
  onTopUp: (amount: string) => void;
  onCancel: () => void;
  onWithdraw: () => void;
}) {
  const [topUpAmount, setTopUpAmount] = useState("10");
  const isCancelled = status === SubStatus.Cancelled;

  return (
    <div className="card">
      <div className="card-header">
        <span>Subscription #{String(subscriptionId)}</span>
        <span className={`badge badge-${status}`}>{subStatusLabel(status as SubStatusValue)}</span>
      </div>
      <p>Vault balance: {formatAmount(vaultBalance)}</p>
      <p>Next charge: {formatTimestamp(nextChargeDate)}</p>

      {!isCancelled && (
        <div className="row">
          <input value={topUpAmount} onChange={(e) => setTopUpAmount(e.target.value)} />
          <button disabled={busy === `topup-${subscriptionId}`} onClick={() => onTopUp(topUpAmount)}>
            Top Up
          </button>
          <button disabled={busy === `cancel-${subscriptionId}`} onClick={onCancel}>
            Cancel
          </button>
        </div>
      )}

      {isCancelled && (
        <button disabled={busy === `withdraw-${subscriptionId}`} onClick={onWithdraw}>
          Withdraw Remaining
        </button>
      )}
    </div>
  );
}
