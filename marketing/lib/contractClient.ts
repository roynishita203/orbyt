import { Client as ContractClient } from "@stellar/stellar-sdk/contract"
import { config } from "./config"
import type { SubVaultClient } from "./subVaultTypes"
import { signTransaction } from "./wallet"

export async function createContractClient(publicKey?: string): Promise<SubVaultClient> {
  const client = await ContractClient.from({
    contractId: config.contractId,
    networkPassphrase: config.networkPassphrase,
    rpcUrl: config.rpcUrl,
    publicKey,
    signTransaction,
  })
  return client as unknown as SubVaultClient
}
