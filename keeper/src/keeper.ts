import { log } from "./logger.js";

/**
 * Minimal shape of the parts of `contract.Client` (and the AssembledTransaction
 * it returns) that the keeper loop depends on. Narrowing to this interface
 * keeps the polling logic testable without spinning up a real RPC client.
 */
export interface SubVaultClientLike {
  get_due_subscriptions(): Promise<{ result: bigint[] }>;
  charge(args: {
    subscription_id: bigint;
    caller: string;
  }): Promise<{ signAndSend(): Promise<{ result: unknown }> }>;
}

const MAX_ATTEMPTS = 2;

/** Errors that mean "someone else already handled this cycle" -- not a real failure. */
function isBenignRaceError(message: string): boolean {
  return message.includes("NotYetDue") || message.includes("NotActive");
}

export async function chargeWithRetry(
  client: SubVaultClientLike,
  callerPublicKey: string,
  subscriptionId: bigint,
  attempt = 1,
): Promise<void> {
  try {
    const tx = await client.charge({ subscription_id: subscriptionId, caller: callerPublicKey });
    await tx.signAndSend();
    log.info("charge succeeded", { subscriptionId: subscriptionId.toString() });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    if (isBenignRaceError(message)) {
      log.info("charge skipped (already handled or no longer active)", {
        subscriptionId: subscriptionId.toString(),
        reason: message,
      });
      return;
    }

    if (attempt < MAX_ATTEMPTS) {
      log.warn("charge attempt failed, retrying", {
        subscriptionId: subscriptionId.toString(),
        attempt,
        error: message,
      });
      await chargeWithRetry(client, callerPublicKey, subscriptionId, attempt + 1);
      return;
    }

    log.error("charge failed, will retry next poll cycle", {
      subscriptionId: subscriptionId.toString(),
      attempts: attempt,
      error: message,
    });
  }
}

export async function pollOnce(client: SubVaultClientLike, callerPublicKey: string): Promise<void> {
  const { result: dueIds } = await client.get_due_subscriptions();

  if (dueIds.length === 0) {
    log.info("poll complete: nothing due");
    return;
  }

  log.info("poll complete: found due subscriptions", {
    count: dueIds.length,
    ids: dueIds.map((id) => id.toString()),
  });

  for (const id of dueIds) {
    await chargeWithRetry(client, callerPublicKey, id);
  }
}
