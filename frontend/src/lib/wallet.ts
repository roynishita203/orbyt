import freighter from "@stellar/freighter-api";
import type { SignTransaction } from "@stellar/stellar-sdk/contract";

export async function connectWallet(): Promise<string> {
  const connected = await freighter.isConnected();
  if (connected.error) {
    throw new Error(connected.error.message ?? "Freighter is not available in this browser.");
  }

  const access = await freighter.requestAccess();
  if (access.error) {
    throw new Error(access.error.message ?? "Freighter access was denied.");
  }
  return access.address;
}

export const signTransaction: SignTransaction = async (xdr, opts) => {
  const result = await freighter.signTransaction(xdr, {
    networkPassphrase: opts?.networkPassphrase,
    address: opts?.address,
  });
  if (result.error) {
    throw new Error(result.error.message ?? "Freighter declined to sign the transaction.");
  }
  return result;
};
