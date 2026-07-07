import { useState } from "react";
import { useMerchantData } from "../hooks/useMerchantData";
import { config } from "../lib/config";
import { formatAmount, formatTimestamp, parseAmount, shortenAddress } from "../lib/format";
import { subStatusLabel, type SubStatusValue, type SubVaultClient } from "../lib/subVaultTypes";

interface Props {
  client: SubVaultClient | null;
  address: string | null;
}

const DEMO_INTERVALS = [
  { label: "60 seconds (demo)", secs: 60 },
  { label: "2 minutes (demo)", secs: 120 },
  { label: "1 day", secs: 86_400 },
  { label: "30 days", secs: 2_592_000 },
];

export function MerchantView({ client, address }: Props) {
  const { subscribers, revenue, loading, error, refresh } = useMerchantData(client, address);
  const [amount, setAmount] = useState("10");
  const [intervalSecs, setIntervalSecs] = useState(String(DEMO_INTERVALS[3].secs));
  const [asset, setAsset] = useState(config.defaultAssetId);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [lastPlanId, setLastPlanId] = useState<string | null>(null);

  const createPlan = async () => {
    if (!client || !address) {
      setCreateError("Connect your wallet first.");
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const tx = await client.create_plan({
        merchant: address,
        amount: parseAmount(amount),
        interval_secs: BigInt(intervalSecs),
        asset,
      });
      const sent = await tx.signAndSend();
      setLastPlanId(String(sent.result));
      refresh();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="view">
      <section className="panel">
        <h2>Create Plan</h2>
        <div className="row">
          <label>
            Amount
            <input value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <label>
            Interval
            <select value={intervalSecs} onChange={(e) => setIntervalSecs(e.target.value)}>
              {DEMO_INTERVALS.map((opt) => (
                <option key={opt.secs} value={opt.secs}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Asset (SAC address)
            <input value={asset} onChange={(e) => setAsset(e.target.value)} />
          </label>
          <button disabled={creating || !address} onClick={() => void createPlan()}>
            {creating ? "Creating…" : "Create Plan"}
          </button>
        </div>
        {lastPlanId && <p className="muted">Created plan #{lastPlanId}</p>}
        {createError && <p className="error">{createError}</p>}
      </section>

      <section className="panel">
        <h2>Revenue</h2>
        <p className="stat">{formatAmount(revenue)}</p>
      </section>

      <section className="panel">
        <h2>Active Subscribers</h2>
        {loading && <p className="muted">Loading…</p>}
        {error && <p className="error">{error}</p>}
        {subscribers.length === 0 && !loading && <p className="muted">No subscribers yet.</p>}
        <table>
          <thead>
            <tr>
              <th>Subscription</th>
              <th>Subscriber</th>
              <th>Status</th>
              <th>Vault Balance</th>
              <th>Next Charge</th>
            </tr>
          </thead>
          <tbody>
            {subscribers.map((row) => (
              <tr key={String(row.subscriptionId)}>
                <td>#{String(row.subscriptionId)}</td>
                <td>{shortenAddress(row.subscriber)}</td>
                <td>
                  <span className={`badge badge-${row.data.status}`}>
                    {subStatusLabel(row.data.status as SubStatusValue)}
                  </span>
                </td>
                <td>{formatAmount(row.data.vault_balance)}</td>
                <td>{formatTimestamp(row.data.next_charge_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
