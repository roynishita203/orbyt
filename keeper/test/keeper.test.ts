import { describe, expect, it, vi } from "vitest";
import { chargeWithRetry, pollOnce, type SubVaultClientLike } from "../src/keeper.js";

function makeClient(overrides: Partial<SubVaultClientLike> = {}): SubVaultClientLike {
  return {
    get_due_subscriptions: vi.fn().mockResolvedValue({ result: [] }),
    charge: vi.fn().mockResolvedValue({ signAndSend: vi.fn().mockResolvedValue({ result: undefined }) }),
    ...overrides,
  };
}

describe("pollOnce", () => {
  it("does nothing when no subscriptions are due", async () => {
    const client = makeClient();
    await pollOnce(client, "GCALLER");
    expect(client.charge).not.toHaveBeenCalled();
  });

  it("charges every due subscription", async () => {
    const signAndSend = vi.fn().mockResolvedValue({ result: undefined });
    const charge = vi.fn().mockResolvedValue({ signAndSend });
    const client = makeClient({
      get_due_subscriptions: vi.fn().mockResolvedValue({ result: [1n, 2n, 3n] }),
      charge,
    });

    await pollOnce(client, "GCALLER");

    expect(charge).toHaveBeenCalledTimes(3);
    expect(charge).toHaveBeenNthCalledWith(1, { subscription_id: 1n, caller: "GCALLER" });
    expect(charge).toHaveBeenNthCalledWith(2, { subscription_id: 2n, caller: "GCALLER" });
    expect(charge).toHaveBeenNthCalledWith(3, { subscription_id: 3n, caller: "GCALLER" });
    expect(signAndSend).toHaveBeenCalledTimes(3);
  });
});

describe("chargeWithRetry", () => {
  it("succeeds on the first attempt without retrying", async () => {
    const signAndSend = vi.fn().mockResolvedValue({ result: undefined });
    const charge = vi.fn().mockResolvedValue({ signAndSend });
    const client = makeClient({ charge });

    await chargeWithRetry(client, "GCALLER", 42n);

    expect(charge).toHaveBeenCalledTimes(1);
  });

  it("does not retry on a benign NotYetDue race", async () => {
    const charge = vi.fn().mockRejectedValue(new Error("contract error: NotYetDue"));
    const client = makeClient({ charge });

    await chargeWithRetry(client, "GCALLER", 42n);

    expect(charge).toHaveBeenCalledTimes(1);
  });

  it("does not retry once a subscription is no longer active", async () => {
    const charge = vi.fn().mockRejectedValue(new Error("contract error: NotActive"));
    const client = makeClient({ charge });

    await chargeWithRetry(client, "GCALLER", 42n);

    expect(charge).toHaveBeenCalledTimes(1);
  });

  it("retries once on a transient error, then gives up", async () => {
    const charge = vi.fn().mockRejectedValue(new Error("network timeout"));
    const client = makeClient({ charge });

    await chargeWithRetry(client, "GCALLER", 42n);

    expect(charge).toHaveBeenCalledTimes(2);
  });

  it("recovers if the retry succeeds", async () => {
    const signAndSend = vi.fn().mockResolvedValue({ result: undefined });
    const charge = vi
      .fn()
      .mockRejectedValueOnce(new Error("network timeout"))
      .mockResolvedValueOnce({ signAndSend });
    const client = makeClient({ charge });

    await chargeWithRetry(client, "GCALLER", 42n);

    expect(charge).toHaveBeenCalledTimes(2);
    expect(signAndSend).toHaveBeenCalledTimes(1);
  });
});
