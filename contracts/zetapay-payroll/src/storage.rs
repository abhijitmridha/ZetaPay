use soroban_sdk::{contracttype, Address, BytesN, Env};

use crate::{
    error::PayrollError,
    types::{PayrollRecord, PayrollRunSummary},
};

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    EmployerConfig(Address),
    Verifier(Address),
    VerificationKey(Address),
    XlmToken(Address),
    UsdcToken(Address),
    BatchCounter(Address),
    PayrollBatch(Address, u64),
    ProcessedProof(Address, BytesN<32>),
    PayrollRun(Address, BytesN<32>),
}

pub struct Storage;

impl Storage {
    pub fn has_employer(env: &Env, employer: &Address) -> bool {
        env.storage()
            .instance()
            .has(&DataKey::EmployerConfig(employer.clone()))
    }

    pub fn set_employer(env: &Env, employer: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::EmployerConfig(employer.clone()), &true);
    }

    pub fn get_verifier(env: &Env, employer: &Address) -> Result<Address, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::Verifier(employer.clone()))
            .ok_or(PayrollError::NotInitialized)
    }

    pub fn set_verifier(env: &Env, employer: &Address, verifier: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::Verifier(employer.clone()), verifier);
    }

    pub fn set_verification_key(
        env: &Env,
        employer: &Address,
        vk: &zetapay_verifier::VerificationKey,
    ) {
        env.storage()
            .instance()
            .set(&DataKey::VerificationKey(employer.clone()), vk);
    }

    pub fn get_verification_key(
        env: &Env,
        employer: &Address,
    ) -> Result<zetapay_verifier::VerificationKey, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::VerificationKey(employer.clone()))
            .ok_or(PayrollError::NotInitialized)
    }

    pub fn set_xlm_token(env: &Env, employer: &Address, token: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::XlmToken(employer.clone()), token);
    }

    pub fn get_xlm_token(env: &Env, employer: &Address) -> Result<Address, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::XlmToken(employer.clone()))
            .ok_or(PayrollError::TokenNotRegistered)
    }

    pub fn set_usdc_token(env: &Env, employer: &Address, token: &Address) {
        env.storage()
            .instance()
            .set(&DataKey::UsdcToken(employer.clone()), token);
    }

    pub fn get_usdc_token(env: &Env, employer: &Address) -> Result<Address, PayrollError> {
        env.storage()
            .instance()
            .get(&DataKey::UsdcToken(employer.clone()))
            .ok_or(PayrollError::TokenNotRegistered)
    }

    pub fn get_batch_counter(env: &Env, employer: &Address) -> u64 {
        env.storage()
            .instance()
            .get(&DataKey::BatchCounter(employer.clone()))
            .unwrap_or(0)
    }

    pub fn set_batch_counter(env: &Env, employer: &Address, value: &u64) {
        env.storage()
            .instance()
            .set(&DataKey::BatchCounter(employer.clone()), value);
    }

    pub fn set_payroll_record(env: &Env, employer: &Address, id: u64, record: &PayrollRecord) {
        env.storage()
            .persistent()
            .set(&DataKey::PayrollBatch(employer.clone(), id), record);
    }

    pub fn get_payroll_record(
        env: &Env,
        employer: &Address,
        id: u64,
    ) -> Result<PayrollRecord, PayrollError> {
        env.storage()
            .persistent()
            .get(&DataKey::PayrollBatch(employer.clone(), id))
            .ok_or(PayrollError::NotInitialized)
    }

    pub fn is_proof_processed(env: &Env, employer: &Address, proof_hash: &BytesN<32>) -> bool {
        env.storage().persistent().has(&DataKey::ProcessedProof(
            employer.clone(),
            proof_hash.clone(),
        ))
    }

    pub fn mark_proof_processed(env: &Env, employer: &Address, proof_hash: &BytesN<32>) {
        env.storage().persistent().set(
            &DataKey::ProcessedProof(employer.clone(), proof_hash.clone()),
            &true,
        );
    }

    pub fn set_payroll_run_summary(
        env: &Env,
        employer: &Address,
        payroll_run_hash: &BytesN<32>,
        summary: &PayrollRunSummary,
    ) {
        env.storage().persistent().set(
            &DataKey::PayrollRun(employer.clone(), payroll_run_hash.clone()),
            summary,
        );
    }

    pub fn get_payroll_run_summary(
        env: &Env,
        employer: &Address,
        payroll_run_hash: &BytesN<32>,
    ) -> Option<PayrollRunSummary> {
        env.storage().persistent().get(&DataKey::PayrollRun(
            employer.clone(),
            payroll_run_hash.clone(),
        ))
    }
}
