import type { SubVaultClient } from "./subVaultTypes";

type MethodName = keyof SubVaultClient;
type MethodArgs<K extends MethodName> = Parameters<SubVaultClient[K]>[0];
type Unwrapped<T> = T extends { signAndSend(): Promise<{ result: infer R }> }
  ? R
  : T extends { result: infer R }
    ? R
    : never;
type MethodResult<K extends MethodName> = Unwrapped<Awaited<ReturnType<SubVaultClient[K]>>>;

/**
 * Generic dispatcher over the SubVault contract client: invokes `method`
 * with `args`, signs and submits it if it's a write call (anything
 * returning an AssembledTransaction with `signAndSend`), and unwraps the
 * final `result` either way -- so callers don't need to special-case reads
 * vs writes.
 */
export async function callContractFunction<K extends MethodName>(
  client: SubVaultClient,
  method: K,
  ...args: MethodArgs<K> extends undefined ? [] : [MethodArgs<K>]
): Promise<MethodResult<K>> {
  const fn = client[method] as (...fnArgs: unknown[]) => Promise<unknown>;
  const outcome = await fn(...args);

  if (outcome && typeof outcome === "object" && "signAndSend" in outcome) {
    const sent = await (outcome as { signAndSend(): Promise<{ result: unknown }> }).signAndSend();
    return sent.result as MethodResult<K>;
  }

  return (outcome as { result: unknown }).result as MethodResult<K>;
}
