use soroban_sdk::{contracttype, crypto::bn254::Bn254Fr, Address, Env};

use crate::{
    error::PoolError,
    types::{PoolConfig, PoolStats, ShieldedNote, WithdrawalRecord},
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Config,
    RegisteredToken(Address),
    Note(Bn254Fr),
    AcceptedRoot(Bn254Fr),
    Nullifier(Bn254Fr),
    Withdrawal(Bn254Fr),
    DepositCount,
    WithdrawalCount,
}

pub struct Storage;

impl Storage {
    pub fn has_config(env: &Env) -> bool {
        env.storage().instance().has(&DataKey::Config)
    }

    pub fn set_config(env: &Env, config: &PoolConfig) {
        env.storage().instance().set(&DataKey::Config, config);
    }

    pub fn get_config(env: &Env) -> Result<PoolConfig, PoolError> {
        env.storage()
            .instance()
            .get(&DataKey::Config)
            .ok_or(PoolError::NotInitialized)
    }

    pub fn set_registered_token(env: &Env, token: &Address) {
        env.storage()
            .persistent()
            .set(&DataKey::RegisteredToken(token.clone()), &true);
    }

    pub fn is_registered_token(env: &Env, token: &Address) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::RegisteredToken(token.clone()))
    }

    pub fn has_note(env: &Env, commitment: &Bn254Fr) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Note(commitment.clone()))
    }

    pub fn set_note(env: &Env, commitment: &Bn254Fr, note: &ShieldedNote) {
        env.storage()
            .persistent()
            .set(&DataKey::Note(commitment.clone()), note);
    }

    pub fn get_note(env: &Env, commitment: &Bn254Fr) -> Result<ShieldedNote, PoolError> {
        env.storage()
            .persistent()
            .get(&DataKey::Note(commitment.clone()))
            .ok_or(PoolError::CommitmentNotFound)
    }

    pub fn is_root_accepted(env: &Env, root: &Bn254Fr) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::AcceptedRoot(root.clone()))
    }

    pub fn accept_root(env: &Env, root: &Bn254Fr) {
        env.storage()
            .persistent()
            .set(&DataKey::AcceptedRoot(root.clone()), &true);
    }

    pub fn is_nullifier_spent(env: &Env, nullifier_hash: &Bn254Fr) -> bool {
        env.storage()
            .persistent()
            .has(&DataKey::Nullifier(nullifier_hash.clone()))
    }

    pub fn mark_nullifier_spent(env: &Env, nullifier_hash: &Bn254Fr) {
        env.storage()
            .persistent()
            .set(&DataKey::Nullifier(nullifier_hash.clone()), &true);
    }

    pub fn set_withdrawal(env: &Env, nullifier_hash: &Bn254Fr, record: &WithdrawalRecord) {
        env.storage()
            .persistent()
            .set(&DataKey::Withdrawal(nullifier_hash.clone()), record);
    }

    pub fn get_withdrawal(env: &Env, nullifier_hash: &Bn254Fr) -> Option<WithdrawalRecord> {
        env.storage()
            .persistent()
            .get(&DataKey::Withdrawal(nullifier_hash.clone()))
    }

    pub fn get_deposit_count(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::DepositCount)
            .unwrap_or(0)
    }

    pub fn set_deposit_count(env: &Env, value: &u64) {
        env.storage().instance().set(&DataKey::DepositCount, value);
    }

    pub fn get_withdrawal_count(env: &Env) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::WithdrawalCount)
            .unwrap_or(0)
    }

    pub fn set_withdrawal_count(env: &Env, value: &u64) {
        env.storage()
            .instance()
            .set(&DataKey::WithdrawalCount, value);
    }

    pub fn get_stats(env: &Env) -> PoolStats {
        PoolStats {
            deposit_count: Self::get_deposit_count(env),
            withdrawal_count: Self::get_withdrawal_count(env),
        }
    }
}
