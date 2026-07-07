use soroban_sdk::contracterror;

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    PlanNotFound = 1,
    SubscriptionNotFound = 2,
    NotActive = 3,
    NotYetDue = 4,
    NotSubscriber = 5,
    StillActive = 6,
    InsufficientVaultBalance = 7,
    PlanInactive = 8,
    InvalidAmount = 9,
    InvalidInterval = 10,
}
