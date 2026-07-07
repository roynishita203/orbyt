import { rpc } from "@stellar/stellar-sdk";
import { config } from "./config";

/** Soroban RPC server this app talks to (Testnet, per .env). */
export const server = new rpc.Server(config.rpcUrl);

/** Network passphrase matching `server`'s RPC endpoint. */
export const networkPassphrase = config.networkPassphrase;
