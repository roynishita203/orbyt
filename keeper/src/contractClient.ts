import { Client as ContractClient, basicNodeSigner } from "@stellar/stellar-sdk/contract";
import { Keypair } from "@stellar/stellar-sdk";
import type { Config } from "./config.js";

export async function createContractClient(config: Config, keypair: Keypair): Promise<ContractClient> {
  const signer = basicNodeSigner(keypair, config.networkPassphrase);
  return ContractClient.from({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey: keypair.publicKey(),
    signTransaction: signer.signTransaction,
  });
}
