import { describe, expect, it, vi } from "vitest";
import { callContractFunction } from "../contract";
import type { SubVaultClient } from "../subVaultTypes";

describe("callContractFunction", () => {
  it("signs and sends write calls, returning the final result", async () => {
    const signAndSend = vi.fn().mockResolvedValue({ result: 1n });
    const create_plan = vi.fn().mockResolvedValue({ signAndSend });
    const client = { create_plan } as unknown as SubVaultClient;

    const result = await callContractFunction(client, "create_plan", {
      merchant: "GMERCHANT",
      amount: 100n,
      interval_secs: 60n,
      asset: "CASSET",
    });

    expect(create_plan).toHaveBeenCalledWith({
      merchant: "GMERCHANT",
      amount: 100n,
      interval_secs: 60n,
      asset: "CASSET",
    });
    expect(signAndSend).toHaveBeenCalledTimes(1);
    expect(result).toBe(1n);
  });

  it("returns the result directly for read calls with no signAndSend", async () => {
    const get_due_subscriptions = vi.fn().mockResolvedValue({ result: [1n, 2n] });
    const client = { get_due_subscriptions } as unknown as SubVaultClient;

    const result = await callContractFunction(client, "get_due_subscriptions");

    expect(get_due_subscriptions).toHaveBeenCalledWith();
    expect(result).toEqual([1n, 2n]);
  });
});
