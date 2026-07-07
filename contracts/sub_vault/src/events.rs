use soroban_sdk::{contractevent, Address};

#[contractevent]
pub struct PlanCreated {
    #[topic]
    pub plan_id: u64,
    pub merchant: Address,
    pub amount: i128,
    pub interval_secs: u64,
}

#[contractevent]
pub struct SubscriptionCreated {
    #[topic]
    pub subscription_id: u64,
    pub subscriber: Address,
    pub plan_id: u64,
    pub initial_funding: i128,
}

#[contractevent]
pub struct ChargeSuccess {
    #[topic]
    pub subscription_id: u64,
    pub amount: i128,
    pub next_charge_date: u64,
    pub caller: Address,
}

#[contractevent]
pub struct ChargeFailedInsufficientFunds {
    #[topic]
    pub subscription_id: u64,
    pub caller: Address,
}

#[contractevent]
pub struct SubscriptionCancelled {
    #[topic]
    pub subscription_id: u64,
}

#[contractevent]
pub struct FundsToppedUp {
    #[topic]
    pub subscription_id: u64,
    pub amount: i128,
}

#[contractevent]
pub struct FundsWithdrawn {
    #[topic]
    pub subscription_id: u64,
    pub amount: i128,
}
