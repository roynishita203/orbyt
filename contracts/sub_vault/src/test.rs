#![cfg(test)]

use crate::{error::Error, types::SubStatus, SubVault, SubVaultClient};
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

struct TestCtx<'a> {
    env: Env,
    client: SubVaultClient<'a>,
    token: TokenClient<'a>,
    token_admin: StellarAssetClient<'a>,
    merchant: Address,
    subscriber: Address,
}

fn setup<'a>() -> TestCtx<'a> {
    let env = Env::default();
    env.mock_all_auths();
    env.ledger().set_timestamp(1_000);

    let contract_id = env.register(SubVault, ());
    let client = SubVaultClient::new(&env, &contract_id);

    let token_admin_addr = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin_addr);
    let token = TokenClient::new(&env, &sac.address());
    let token_admin = StellarAssetClient::new(&env, &sac.address());

    let merchant = Address::generate(&env);
    let subscriber = Address::generate(&env);
    token_admin.mint(&subscriber, &1_000_000_000);

    TestCtx {
        env,
        client,
        token,
        token_admin,
        merchant,
        subscriber,
    }
}

fn advance_time(env: &Env, secs: u64) {
    let now = env.ledger().timestamp();
    env.ledger().set_timestamp(now + secs);
}

#[test]
fn full_lifecycle() {
    let ctx = setup();
    let asset = ctx.token.address.clone();

    let plan_id = ctx
        .client
        .create_plan(&ctx.merchant, &100, &2_592_000, &asset);

    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::Active);
    assert_eq!(sub.vault_balance, 1_000);
    assert_eq!(ctx.token.balance(&ctx.subscriber), 1_000_000_000 - 1_000);

    // First charge is due immediately.
    ctx.client.charge(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.vault_balance, 900);
    assert_eq!(sub.next_charge_date, 1_000 + 2_592_000);
    assert_eq!(ctx.token.balance(&ctx.merchant), 100);

    // Not due yet: a second immediate charge attempt fails.
    let result = ctx.client.try_charge(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::NotYetDue)));

    // Advance to the next cycle and charge again.
    advance_time(&ctx.env, 2_592_000);
    ctx.client.charge(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.vault_balance, 800);
    assert_eq!(ctx.token.balance(&ctx.merchant), 200);

    // Cancel, then confirm charge no longer works.
    ctx.client.cancel_subscription(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::Cancelled);

    advance_time(&ctx.env, 2_592_000);
    let result = ctx.client.try_charge(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::NotActive)));

    // Withdraw the remaining vault balance.
    let withdrawn = ctx.client.withdraw_remaining(&subscription_id, &ctx.subscriber);
    assert_eq!(withdrawn, 800);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.vault_balance, 0);
}

#[test]
fn charge_before_due_date_fails() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    ctx.client.charge(&subscription_id, &ctx.subscriber);
    let result = ctx.client.try_charge(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::NotYetDue)));
}

#[test]
fn insufficient_balance_marks_past_due_without_partial_transfer() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    // Fund with less than one full cycle's payment.
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &50);

    ctx.client.charge(&subscription_id, &ctx.subscriber);

    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::PastDue);
    assert_eq!(sub.vault_balance, 50);
    assert_eq!(ctx.token.balance(&ctx.merchant), 0);

    // A charge on a PastDue subscription now fails as NotActive, not silently retried.
    let result = ctx.client.try_charge(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::NotActive)));
}

#[test]
fn top_up_recovers_past_due_subscription() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &50);

    ctx.client.charge(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::PastDue);

    ctx.client.top_up(&subscription_id, &ctx.subscriber, &100);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::Active);
    assert_eq!(sub.vault_balance, 150);

    // Note: next_charge_date was never advanced by the failed attempt, so
    // this charge is immediately due again.
    ctx.client.charge(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::Active);
    assert_eq!(sub.vault_balance, 50);
    assert_eq!(ctx.token.balance(&ctx.merchant), 100);
}

#[test]
fn cancel_stops_future_charges() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    ctx.client.cancel_subscription(&subscription_id, &ctx.subscriber);

    let result = ctx.client.try_charge(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::NotActive)));
}

#[test]
fn double_cancel_is_a_no_op_error_free() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    ctx.client.cancel_subscription(&subscription_id, &ctx.subscriber);
    // Cancelling an already-cancelled subscription is allowed (idempotent);
    // it simply re-asserts the Cancelled status.
    ctx.client.cancel_subscription(&subscription_id, &ctx.subscriber);
    let sub = ctx.client.get_subscription(&subscription_id);
    assert_eq!(sub.status, SubStatus::Cancelled);
}

#[test]
fn withdraw_before_cancel_fails() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    let result = ctx.client.try_withdraw_remaining(&subscription_id, &ctx.subscriber);
    assert_eq!(result, Err(Ok(Error::StillActive)));
}

#[test]
fn unauthorized_cancel_fails() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    let stranger = Address::generate(&ctx.env);
    let result = ctx.client.try_cancel_subscription(&subscription_id, &stranger);
    assert_eq!(result, Err(Ok(Error::NotSubscriber)));
}

#[test]
fn unauthorized_top_up_fails() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &60, &asset);
    let subscription_id = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    let stranger = Address::generate(&ctx.env);
    ctx.token_admin.mint(&stranger, &1_000_000_000);
    let result = ctx.client.try_top_up(&subscription_id, &stranger, &100);
    assert_eq!(result, Err(Ok(Error::NotSubscriber)));
}

#[test]
fn get_due_subscriptions_reports_only_active_and_due() {
    let ctx = setup();
    let asset = ctx.token.address.clone();
    let plan_id = ctx.client.create_plan(&ctx.merchant, &100, &2_592_000, &asset);

    let due_now = ctx.client.subscribe(&ctx.subscriber, &plan_id, &1_000);

    let subscriber2 = Address::generate(&ctx.env);
    ctx.token_admin.mint(&subscriber2, &1_000_000_000);
    let not_due_yet = ctx.client.subscribe(&subscriber2, &plan_id, &1_000);
    // Charge it once so its next_charge_date moves into the future.
    ctx.client.charge(&not_due_yet, &subscriber2);

    let due = ctx.client.get_due_subscriptions();
    assert_eq!(due.len(), 1);
    assert_eq!(due.get(0).unwrap(), due_now);
}

#[test]
fn invalid_plan_params_are_rejected() {
    let ctx = setup();
    let asset = ctx.token.address.clone();

    let result = ctx.client.try_create_plan(&ctx.merchant, &0, &60, &asset);
    assert_eq!(result, Err(Ok(Error::InvalidAmount)));

    let result = ctx.client.try_create_plan(&ctx.merchant, &100, &0, &asset);
    assert_eq!(result, Err(Ok(Error::InvalidInterval)));
}
