#![no_std]

mod error;
mod events;
mod types;

#[cfg(test)]
mod test;

use error::Error;
use events::{
    ChargeFailedInsufficientFunds, ChargeSuccess, FundsToppedUp, FundsWithdrawn, PlanCreated,
    SubscriptionCancelled, SubscriptionCreated,
};
use soroban_sdk::{contract, contractimpl, token, vec, Address, Env, Vec};
use types::{DataKey, PlanData, SubStatus, SubscriptionData};

// ~5s per ledger on Stellar networks.
const LEDGERS_PER_DAY: u32 = 17280;
const PERSISTENT_BUMP_THRESHOLD: u32 = LEDGERS_PER_DAY * 7;
const PERSISTENT_BUMP_AMOUNT: u32 = LEDGERS_PER_DAY * 30;

fn bump_persistent(env: &Env, key: &DataKey) {
    env.storage()
        .persistent()
        .extend_ttl(key, PERSISTENT_BUMP_THRESHOLD, PERSISTENT_BUMP_AMOUNT);
}

fn next_id(env: &Env, counter_key: DataKey) -> u64 {
    let current: u64 = env.storage().instance().get(&counter_key).unwrap_or(0);
    let next = current + 1;
    env.storage().instance().set(&counter_key, &next);
    next
}

fn read_plan(env: &Env, plan_id: u64) -> Result<PlanData, Error> {
    let key = DataKey::Plan(plan_id);
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(Error::PlanNotFound)
}

fn read_subscription(env: &Env, subscription_id: u64) -> Result<SubscriptionData, Error> {
    let key = DataKey::Subscription(subscription_id);
    env.storage()
        .persistent()
        .get(&key)
        .ok_or(Error::SubscriptionNotFound)
}

fn write_subscription(env: &Env, subscription_id: u64, sub: &SubscriptionData) {
    let key = DataKey::Subscription(subscription_id);
    env.storage().persistent().set(&key, sub);
    bump_persistent(env, &key);
}

#[contract]
pub struct SubVault;

#[contractimpl]
impl SubVault {
    /// Registers a new subscription plan. Only the merchant can create a
    /// plan under their own address.
    pub fn create_plan(
        env: Env,
        merchant: Address,
        amount: i128,
        interval_secs: u64,
        asset: Address,
    ) -> Result<u64, Error> {
        merchant.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        if interval_secs == 0 {
            return Err(Error::InvalidInterval);
        }

        let plan_id = next_id(&env, DataKey::PlanCounter);
        let plan = PlanData {
            merchant: merchant.clone(),
            amount,
            interval_secs,
            asset,
            active: true,
        };
        let key = DataKey::Plan(plan_id);
        env.storage().persistent().set(&key, &plan);
        bump_persistent(&env, &key);

        PlanCreated {
            plan_id,
            merchant,
            amount,
            interval_secs,
        }
        .publish(&env);

        Ok(plan_id)
    }

    /// Creates a subscription against a plan and pulls the initial funding
    /// from the subscriber into vault custody (this contract's balance).
    /// The first charge is due immediately (`next_charge_date = now`), so
    /// the keeper bot will pick it up on its very next poll.
    pub fn subscribe(
        env: Env,
        subscriber: Address,
        plan_id: u64,
        initial_funding: i128,
    ) -> Result<u64, Error> {
        subscriber.require_auth();

        if initial_funding < 0 {
            return Err(Error::InvalidAmount);
        }

        let plan = read_plan(&env, plan_id)?;
        if !plan.active {
            return Err(Error::PlanInactive);
        }

        if initial_funding > 0 {
            let token_client = token::TokenClient::new(&env, &plan.asset);
            token_client.transfer(&subscriber, &env.current_contract_address(), &initial_funding);
        }

        let now = env.ledger().timestamp();
        let subscription_id = next_id(&env, DataKey::SubCounter);
        let sub = SubscriptionData {
            subscriber: subscriber.clone(),
            plan_id,
            vault_balance: initial_funding,
            next_charge_date: now,
            status: SubStatus::Active,
            created_at: now,
        };
        write_subscription(&env, subscription_id, &sub);

        let mut all_subs: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllSubs)
            .unwrap_or(vec![&env]);
        all_subs.push_back(subscription_id);
        env.storage().instance().set(&DataKey::AllSubs, &all_subs);

        SubscriptionCreated {
            subscription_id,
            subscriber,
            plan_id,
            initial_funding,
        }
        .publish(&env);

        Ok(subscription_id)
    }

    /// Executes a charge for a subscription if -- and only if -- it is
    /// actually due. Deliberately permissionless: `caller` is not
    /// authenticated and carries no special privilege. Anyone (typically the
    /// keeper bot) can invoke this; the correctness of the charge is
    /// enforced entirely by the checks inside the function, not by who is
    /// allowed to call it.
    pub fn charge(env: Env, subscription_id: u64, caller: Address) -> Result<(), Error> {
        let mut sub = read_subscription(&env, subscription_id)?;

        if sub.status != SubStatus::Active {
            return Err(Error::NotActive);
        }

        let now = env.ledger().timestamp();
        if now < sub.next_charge_date {
            return Err(Error::NotYetDue);
        }

        let plan = read_plan(&env, sub.plan_id)?;

        if sub.vault_balance >= plan.amount {
            let token_client = token::TokenClient::new(&env, &plan.asset);
            token_client.transfer(
                &env.current_contract_address(),
                &plan.merchant,
                &plan.amount,
            );
            sub.vault_balance -= plan.amount;
            sub.next_charge_date += plan.interval_secs;

            ChargeSuccess {
                subscription_id,
                amount: plan.amount,
                next_charge_date: sub.next_charge_date,
                caller,
            }
            .publish(&env);
        } else {
            sub.status = SubStatus::PastDue;

            ChargeFailedInsufficientFunds {
                subscription_id,
                caller,
            }
            .publish(&env);
        }

        write_subscription(&env, subscription_id, &sub);
        Ok(())
    }

    /// Stops future charges. Does not refund the remaining vault balance --
    /// call `withdraw_remaining` afterwards for that.
    pub fn cancel_subscription(env: Env, subscription_id: u64, caller: Address) -> Result<(), Error> {
        let mut sub = read_subscription(&env, subscription_id)?;

        if caller != sub.subscriber {
            return Err(Error::NotSubscriber);
        }
        caller.require_auth();

        sub.status = SubStatus::Cancelled;
        write_subscription(&env, subscription_id, &sub);

        SubscriptionCancelled { subscription_id }.publish(&env);

        Ok(())
    }

    /// Adds funds to a subscription's vault balance. If the subscription had
    /// gone `PastDue` for lack of funds, this brings it back to `Active` so
    /// the next keeper poll can retry the charge.
    pub fn top_up(
        env: Env,
        subscription_id: u64,
        subscriber: Address,
        amount: i128,
    ) -> Result<(), Error> {
        subscriber.require_auth();

        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }

        let mut sub = read_subscription(&env, subscription_id)?;
        if subscriber != sub.subscriber {
            return Err(Error::NotSubscriber);
        }
        if sub.status == SubStatus::Cancelled {
            return Err(Error::NotActive);
        }

        let plan = read_plan(&env, sub.plan_id)?;
        let token_client = token::TokenClient::new(&env, &plan.asset);
        token_client.transfer(&subscriber, &env.current_contract_address(), &amount);

        sub.vault_balance += amount;
        if sub.status == SubStatus::PastDue {
            sub.status = SubStatus::Active;
        }
        write_subscription(&env, subscription_id, &sub);

        FundsToppedUp {
            subscription_id,
            amount,
        }
        .publish(&env);

        Ok(())
    }

    /// Returns the leftover vault balance to the subscriber. Only allowed
    /// once the subscription has been cancelled.
    pub fn withdraw_remaining(env: Env, subscription_id: u64, caller: Address) -> Result<i128, Error> {
        let mut sub = read_subscription(&env, subscription_id)?;

        if caller != sub.subscriber {
            return Err(Error::NotSubscriber);
        }
        caller.require_auth();

        if sub.status != SubStatus::Cancelled {
            return Err(Error::StillActive);
        }

        let amount = sub.vault_balance;
        if amount > 0 {
            let plan = read_plan(&env, sub.plan_id)?;
            let token_client = token::TokenClient::new(&env, &plan.asset);
            token_client.transfer(&env.current_contract_address(), &caller, &amount);
            sub.vault_balance = 0;
            write_subscription(&env, subscription_id, &sub);
        }

        FundsWithdrawn {
            subscription_id,
            amount,
        }
        .publish(&env);

        Ok(amount)
    }

    pub fn get_subscription(env: Env, subscription_id: u64) -> Result<SubscriptionData, Error> {
        read_subscription(&env, subscription_id)
    }

    pub fn get_plan(env: Env, plan_id: u64) -> Result<PlanData, Error> {
        read_plan(&env, plan_id)
    }

    /// Returns every subscription id that is `Active` and due (
    /// `next_charge_date <= now`). This is the function the keeper bot
    /// polls; it does no on-chain filtering beyond linear scan of the known
    /// subscription ids, which is fine at hackathon/demo scale but is not
    /// intended to be a scalable indexing strategy.
    pub fn get_due_subscriptions(env: Env) -> Vec<u64> {
        let now = env.ledger().timestamp();
        let all_subs: Vec<u64> = env
            .storage()
            .instance()
            .get(&DataKey::AllSubs)
            .unwrap_or(vec![&env]);

        let mut due = vec![&env];
        for id in all_subs.iter() {
            if let Some(sub) = env
                .storage()
                .persistent()
                .get::<DataKey, SubscriptionData>(&DataKey::Subscription(id))
            {
                if sub.status == SubStatus::Active && sub.next_charge_date <= now {
                    due.push_back(id);
                }
            }
        }
        due
    }
}
