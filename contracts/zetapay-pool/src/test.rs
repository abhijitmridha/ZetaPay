#![cfg(test)]

extern crate std;

use crate::{
    contract::{ZetaPayPool, ZetaPayPoolClient},
    fixtures::{
        REAL_COMMITMENT, REAL_PROOF_A, REAL_PROOF_B, REAL_PROOF_C, REAL_SIGNALS, REAL_VK_ALPHA,
        REAL_VK_BETA, REAL_VK_DELTA, REAL_VK_GAMMA, REAL_VK_IC,
    },
    types::DepositNoteInput,
};

use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    testutils::Address as _,
    token, Address, BytesN, Env, Vec,
};

use zetapay_verifier::{Proof, VerificationKey, ZetaPayVerifier};

const REAL_AMOUNT: i128 = 10_000_000;

fn deploy_verifier(env: &Env) -> Address {
    env.register(ZetaPayVerifier, ())
}

fn deploy_pool(env: &Env) -> (Address, ZetaPayPoolClient<'_>) {
    let id = env.register(ZetaPayPool, ());
    let client = ZetaPayPoolClient::new(env, &id);

    (id, client)
}

fn token_contract(env: &Env, admin: &Address) -> Address {
    env.register_stellar_asset_contract_v2(admin.clone())
        .address()
}

fn fr(env: &Env, bytes: &[u8; 32]) -> Bn254Fr {
    Bn254Fr::from_bytes(BytesN::from_array(env, bytes))
}

fn make_vk(env: &Env) -> VerificationKey {
    let mut ic = Vec::new(env);

    for point in REAL_VK_IC.iter() {
        ic.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, point)));
    }

    VerificationKey {
        alpha: Bn254G1Affine::from_bytes(BytesN::from_array(env, &REAL_VK_ALPHA)),
        beta: Bn254G2Affine::from_bytes(BytesN::from_array(env, &REAL_VK_BETA)),
        gamma: Bn254G2Affine::from_bytes(BytesN::from_array(env, &REAL_VK_GAMMA)),
        delta: Bn254G2Affine::from_bytes(BytesN::from_array(env, &REAL_VK_DELTA)),
        ic,
    }
}

fn make_proof(env: &Env) -> Proof {
    Proof {
        a: Bn254G1Affine::from_bytes(BytesN::from_array(env, &REAL_PROOF_A)),
        b: Bn254G2Affine::from_bytes(BytesN::from_array(env, &REAL_PROOF_B)),
        c: Bn254G1Affine::from_bytes(BytesN::from_array(env, &REAL_PROOF_C)),
    }
}

fn make_public_inputs(env: &Env) -> Vec<Bn254Fr> {
    let mut inputs = Vec::new(env);

    for signal in REAL_SIGNALS.iter() {
        inputs.push_back(fr(env, signal));
    }

    inputs
}

fn initialize_pool(env: &Env, pool: &ZetaPayPoolClient<'_>, admin: &Address, verifier: &Address) {
    let result = pool.try_initialize(admin, verifier, &make_vk(env));

    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());
}

fn register_token(pool: &ZetaPayPoolClient<'_>, admin: &Address, token: &Address) {
    let result = pool.try_register_token(admin, token);

    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());
}

fn mint(env: &Env, token_address: &Address, to: &Address, amount: i128) {
    token::StellarAssetClient::new(env, token_address).mint(to, &amount);
}

fn balance(env: &Env, token_address: &Address, owner: &Address) -> i128 {
    token::TokenClient::new(env, token_address).balance(owner)
}

fn make_deposits(
    env: &Env,
    token_address: &Address,
    commitment: &Bn254Fr,
) -> Vec<DepositNoteInput> {
    let mut deposits = Vec::new(env);

    deposits.push_back(DepositNoteInput {
        token: token_address.clone(),
        amount: REAL_AMOUNT,
        commitment: commitment.clone(),
    });

    deposits
}

#[test]
fn withdraw_with_real_groth16_proof_transfers_funds_and_spends_nullifier() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);

    let root = public_inputs.get(0).unwrap();
    let nullifier_hash = public_inputs.get(1).unwrap();
    let recipient_hash = public_inputs.get(2).unwrap();
    let token_hash = public_inputs.get(4).unwrap();
    let withdrawal_hash = public_inputs.get(5).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &depositor, REAL_AMOUNT);

    assert_eq!(balance(&env, &asset, &depositor), REAL_AMOUNT);

    let deposit = pool.try_deposit_note(&depositor, &asset, &REAL_AMOUNT, &commitment);
    assert!(deposit.is_ok());
    assert!(deposit.unwrap().is_ok());

    assert_eq!(balance(&env, &asset, &depositor), 0);
    assert_eq!(balance(&env, &asset, &pool_id), REAL_AMOUNT);

    let post_root = pool.try_post_root(&admin, &root);
    assert!(post_root.is_ok());
    assert!(post_root.unwrap().is_ok());

    let withdraw = pool.try_withdraw_with_proof(
        &recipient,
        &asset,
        &REAL_AMOUNT,
        &commitment,
        &root,
        &nullifier_hash,
        &recipient_hash,
        &token_hash,
        &withdrawal_hash,
        &make_proof(&env),
        &public_inputs,
    );

    assert!(withdraw.is_ok());
    assert!(withdraw.unwrap().is_ok());

    assert_eq!(balance(&env, &asset, &pool_id), 0);
    assert_eq!(balance(&env, &asset, &recipient), REAL_AMOUNT);
    assert!(pool.is_nullifier_spent(&nullifier_hash));

    let note = pool.get_note(&commitment);
    assert!(note.withdrawn);

    let stats = pool.get_stats();
    assert_eq!(stats.deposit_count, 1);
    assert_eq!(stats.withdrawal_count, 1);

    let record = pool.get_withdrawal(&nullifier_hash).unwrap();
    assert_eq!(record.amount, REAL_AMOUNT);
    assert_eq!(record.recipient, recipient);
    assert_eq!(record.commitment, commitment);
    assert_eq!(record.root, root);
    assert_eq!(record.nullifier_hash, nullifier_hash);
}

#[test]
fn fund_payroll_posts_root_and_deposits_note_in_one_call() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);
    let root = public_inputs.get(0).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &admin, REAL_AMOUNT);

    assert_eq!(balance(&env, &asset, &admin), REAL_AMOUNT);
    assert!(!pool.is_root_accepted(&root));

    let deposits = make_deposits(&env, &asset, &commitment);

    let result = pool.try_fund_payroll(&admin, &root, &deposits);

    assert!(result.is_ok());
    assert!(result.unwrap().is_ok());

    assert_eq!(balance(&env, &asset, &admin), 0);
    assert_eq!(balance(&env, &asset, &pool_id), REAL_AMOUNT);
    assert!(pool.is_root_accepted(&root));

    let note = pool.get_note(&commitment);
    assert_eq!(note.amount, REAL_AMOUNT);
    assert_eq!(note.depositor, admin);
    assert_eq!(note.token, asset);
    assert_eq!(note.commitment, commitment);
    assert!(!note.withdrawn);

    let stats = pool.get_stats();
    assert_eq!(stats.deposit_count, 1);
    assert_eq!(stats.withdrawal_count, 0);
}

#[test]
fn fund_payroll_allows_withdrawal_after_single_funding_call() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);

    let root = public_inputs.get(0).unwrap();
    let nullifier_hash = public_inputs.get(1).unwrap();
    let recipient_hash = public_inputs.get(2).unwrap();
    let token_hash = public_inputs.get(4).unwrap();
    let withdrawal_hash = public_inputs.get(5).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &admin, REAL_AMOUNT);

    let deposits = make_deposits(&env, &asset, &commitment);

    assert!(pool
        .try_fund_payroll(&admin, &root, &deposits)
        .unwrap()
        .is_ok());

    assert_eq!(balance(&env, &asset, &admin), 0);
    assert_eq!(balance(&env, &asset, &pool_id), REAL_AMOUNT);

    let withdraw = pool.try_withdraw_with_proof(
        &recipient,
        &asset,
        &REAL_AMOUNT,
        &commitment,
        &root,
        &nullifier_hash,
        &recipient_hash,
        &token_hash,
        &withdrawal_hash,
        &make_proof(&env),
        &public_inputs,
    );

    assert!(withdraw.is_ok());
    assert!(withdraw.unwrap().is_ok());

    assert_eq!(balance(&env, &asset, &pool_id), 0);
    assert_eq!(balance(&env, &asset, &recipient), REAL_AMOUNT);

    let stats = pool.get_stats();
    assert_eq!(stats.deposit_count, 1);
    assert_eq!(stats.withdrawal_count, 1);
}

#[test]
fn fund_payroll_rejects_duplicate_commitment() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (_pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);
    let root = public_inputs.get(0).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &admin, REAL_AMOUNT * 2);

    let deposits = make_deposits(&env, &asset, &commitment);

    assert!(pool
        .try_fund_payroll(&admin, &root, &deposits)
        .unwrap()
        .is_ok());

    let duplicate = pool.try_fund_payroll(&admin, &root, &deposits);

    assert!(duplicate.is_err());
}

#[test]
fn withdraw_rejects_double_spend_with_real_nullifier() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (_pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);

    let root = public_inputs.get(0).unwrap();
    let nullifier_hash = public_inputs.get(1).unwrap();
    let recipient_hash = public_inputs.get(2).unwrap();
    let token_hash = public_inputs.get(4).unwrap();
    let withdrawal_hash = public_inputs.get(5).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &depositor, REAL_AMOUNT);

    assert!(pool
        .try_deposit_note(&depositor, &asset, &REAL_AMOUNT, &commitment)
        .unwrap()
        .is_ok());

    assert!(pool.try_post_root(&admin, &root).unwrap().is_ok());

    assert!(pool
        .try_withdraw_with_proof(
            &recipient,
            &asset,
            &REAL_AMOUNT,
            &commitment,
            &root,
            &nullifier_hash,
            &recipient_hash,
            &token_hash,
            &withdrawal_hash,
            &make_proof(&env),
            &public_inputs,
        )
        .unwrap()
        .is_ok());

    let second = pool.try_withdraw_with_proof(
        &recipient,
        &asset,
        &REAL_AMOUNT,
        &commitment,
        &root,
        &nullifier_hash,
        &recipient_hash,
        &token_hash,
        &withdrawal_hash,
        &make_proof(&env),
        &public_inputs,
    );

    assert!(second.is_err());
}

#[test]
fn withdraw_rejects_unknown_root_before_verifier() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let recipient = Address::generate(&env);
    let token_admin = Address::generate(&env);

    let verifier = deploy_verifier(&env);
    let (_pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);

    let commitment = fr(&env, &REAL_COMMITMENT);
    let public_inputs = make_public_inputs(&env);

    let root = public_inputs.get(0).unwrap();
    let nullifier_hash = public_inputs.get(1).unwrap();
    let recipient_hash = public_inputs.get(2).unwrap();
    let token_hash = public_inputs.get(4).unwrap();
    let withdrawal_hash = public_inputs.get(5).unwrap();

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &depositor, REAL_AMOUNT);

    assert!(pool
        .try_deposit_note(&depositor, &asset, &REAL_AMOUNT, &commitment)
        .unwrap()
        .is_ok());

    let result = pool.try_withdraw_with_proof(
        &recipient,
        &asset,
        &REAL_AMOUNT,
        &commitment,
        &root,
        &nullifier_hash,
        &recipient_hash,
        &token_hash,
        &withdrawal_hash,
        &make_proof(&env),
        &public_inputs,
    );

    assert!(result.is_err());
}

#[test]
fn deposit_note_rejects_duplicate_commitment() {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let depositor = Address::generate(&env);
    let token_admin = Address::generate(&env);
    let verifier = deploy_verifier(&env);
    let (_pool_id, pool) = deploy_pool(&env);
    let asset = token_contract(&env, &token_admin);
    let commitment = fr(&env, &REAL_COMMITMENT);

    initialize_pool(&env, &pool, &admin, &verifier);
    register_token(&pool, &admin, &asset);
    mint(&env, &asset, &depositor, REAL_AMOUNT * 2);

    assert!(pool
        .try_deposit_note(&depositor, &asset, &REAL_AMOUNT, &commitment)
        .unwrap()
        .is_ok());

    let second = pool.try_deposit_note(&depositor, &asset, &REAL_AMOUNT, &commitment);
    assert!(second.is_err());
}
