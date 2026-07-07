import { useEffect, useState } from "react";
import "./App.css";
import { ConnectWalletBar } from "./components/ConnectWalletBar";
import { MerchantView } from "./components/MerchantView";
import { SubscriberView } from "./components/SubscriberView";
import { useWallet } from "./hooks/useWallet";
import { assertConfigured } from "./lib/config";
import { createContractClient } from "./lib/contractClient";
import type { SubVaultClient } from "./lib/subVaultTypes";

type Tab = "subscriber" | "merchant";

function App() {
  const { address, connecting, error, connect } = useWallet();
  const [tab, setTab] = useState<Tab>("subscriber");
  const [client, setClient] = useState<SubVaultClient | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    try {
      assertConfigured();
    } catch (err) {
      setConfigError(err instanceof Error ? err.message : String(err));
      return;
    }
    createContractClient(address ?? undefined)
      .then(setClient)
      .catch((err) => setConfigError(err instanceof Error ? err.message : String(err)));
  }, [address]);

  return (
    <div className="app">
      <header className="app-header">
        <h1>SubVault</h1>
        <p className="tagline">Recurring payments on Soroban -- set it and forget it.</p>
        <ConnectWalletBar address={address} connecting={connecting} error={error} onConnect={() => void connect()} />
      </header>

      {configError && <p className="error banner">{configError}</p>}

      <nav className="tabs">
        <button className={tab === "subscriber" ? "active" : ""} onClick={() => setTab("subscriber")}>
          Subscriber
        </button>
        <button className={tab === "merchant" ? "active" : ""} onClick={() => setTab("merchant")}>
          Merchant
        </button>
      </nav>

      {tab === "subscriber" ? (
        <SubscriberView client={client} address={address} />
      ) : (
        <MerchantView client={client} address={address} />
      )}
    </div>
  );
}

export default App;
