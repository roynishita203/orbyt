use soroban_sdk::{contracttype, Address};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct PlanData {
    pub merchant: Address,
    pub amount: i128,
    pub interval_secs: u64,
    pub asset: Address,
    pub active: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
#[contracttype]
pub enum SubStatus {
    Active,
    PastDue,
    Cancelled,
}

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct SubscriptionData {
    pub subscriber: Address,
    pub plan_id: u64,
    pub vault_balance: i128,
    pub next_charge_date: u64,
    pub status: SubStatus,
    pub created_at: u64,
}

/// Storage keys. Plans and subscriptions live in persistent storage since
/// they must survive across the whole lifetime of a subscription, which can
/// span months. `AllSubs` is a flat index of every subscription id ever
/// created, kept only so `get_due_subscriptions` has something to scan; it is
/// a v1 simplification that does not scale to huge subscriber counts.
#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub enum DataKey {
    PlanCounter,
    SubCounter,
    Plan(u64),
    Subscription(u64),
    AllSubs,
}
