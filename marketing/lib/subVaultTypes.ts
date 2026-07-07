/**
 * Mirrors ../contracts/sub_vault/src/types.rs. `#[contracttype]` enums with
 * no associated data compile to a plain u32 discriminant (assigned by
 * declaration order), not a tagged union -- so SubStatus decodes to a
 * number, not a `{ tag: ... }` object. Keep this in sync with types.rs.
 */
export const SubStatus = {
  Active: 0,
  PastDue: 1,
  Cancelled: 2,
} as const

export type SubStatusValue = (typeof SubStatus)[keyof typeof SubStatus]

export function subStatusLabel(status: SubStatusValue): string {
  switch (status) {
    case SubStatus.Active:
      return "Active"
    case SubStatus.PastDue:
      return "Past Due"
    case SubStatus.Cancelled:
      return "Cancelled"
    default:
      return "Unknown"
  }
}

export interface PlanData {
  merchant: string
  amount: bigint
  interval_secs: bigint
  asset: string
  active: boolean
}

export interface SubscriptionData {
  subscriber: string
  plan_id: bigint
  vault_balance: bigint
  next_charge_date: bigint
  status: SubStatusValue
  created_at: bigint
}

/**
 * Minimal shape of `contract.Client` that this app relies on. The real
 * Client attaches these methods dynamically from the on-chain contract spec,
 * so the compiler can't see them on its static type -- callers cast into
 * this interface at the point where the Client is constructed.
 */
export interface SubVaultClient {
  create_plan(args: {
    merchant: string
    amount: bigint
    interval_secs: bigint
    asset: string
  }): Promise<{ signAndSend(): Promise<{ result: bigint }> }>

  subscribe(args: {
    subscriber: string
    plan_id: bigint
    initial_funding: bigint
  }): Promise<{ signAndSend(): Promise<{ result: bigint }> }>

  charge(args: { subscription_id: bigint; caller: string }): Promise<{
    signAndSend(): Promise<{ result: undefined }>
  }>

  cancel_subscription(args: { subscription_id: bigint; caller: string }): Promise<{
    signAndSend(): Promise<{ result: undefined }>
  }>

  top_up(args: { subscription_id: bigint; subscriber: string; amount: bigint }): Promise<{
    signAndSend(): Promise<{ result: undefined }>
  }>

  withdraw_remaining(args: { subscription_id: bigint; caller: string }): Promise<{
    signAndSend(): Promise<{ result: bigint }>
  }>

  get_subscription(args: { subscription_id: bigint }): Promise<{ result: SubscriptionData }>

  get_plan(args: { plan_id: bigint }): Promise<{ result: PlanData }>

  get_due_subscriptions(): Promise<{ result: bigint[] }>
}
