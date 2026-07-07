import { shortenAddress } from "../lib/format";

interface Props {
  address: string | null;
  connecting: boolean;
  error: string | null;
  onConnect: () => void;
}

export function ConnectWalletBar({ address, connecting, error, onConnect }: Props) {
  return (
    <div className="wallet-bar">
      {address ? (
        <span className="wallet-address">{shortenAddress(address)}</span>
      ) : (
        <button onClick={onConnect} disabled={connecting}>
          {connecting ? "Connecting…" : "Connect Freighter"}
        </button>
      )}
      {error && <span className="error">{error}</span>}
    </div>
  );
}
