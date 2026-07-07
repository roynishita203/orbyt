import { Keypair } from "@stellar/stellar-sdk";
import { loadConfig } from "./config.js";
import { createContractClient } from "./contractClient.js";
import { pollOnce, type SubVaultClientLike } from "./keeper.js";
import { log } from "./logger.js";

async function main() {
  const config = loadConfig();
  const keypair = Keypair.fromSecret(config.keeperSecretKey);
  // contract.Client attaches methods dynamically from the on-chain contract
  // spec, so the compiler can't see `charge`/`get_due_subscriptions` on its
  // static type. SubVaultClientLike documents the subset the keeper relies on.
  const client = (await createContractClient(config, keypair)) as unknown as SubVaultClientLike;

  log.info("keeper bot starting", {
    contractId: config.contractId,
    rpcUrl: config.rpcUrl,
    pollIntervalMs: config.pollIntervalMs,
    keeperPublicKey: keypair.publicKey(),
  });

  let stopped = false;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      await pollOnce(client, keypair.publicKey());
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      log.error("poll cycle threw unexpectedly", { error: message });
    } finally {
      running = false;
    }
  };

  await tick();
  const interval = setInterval(() => {
    if (!stopped) void tick();
  }, config.pollIntervalMs);

  const shutdown = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(interval);
    log.info("keeper bot shutting down");
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  log.error("keeper bot failed to start", {
    error: err instanceof Error ? err.message : String(err),
  });
  process.exit(1);
});
