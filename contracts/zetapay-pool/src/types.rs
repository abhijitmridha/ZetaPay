use soroban_sdk::{contracttype, crypto::bn254::Bn254Fr, Address};

#[derive(Clone)]
#[contracttype]
pub struct PoolConfig {
    pub admin: Address,
    pub verifier: Address,
    pub verification_key: zetapay_verifier::VerificationKey,
}

#[derive(Clone)]
#[contracttype]
pub struct DepositNoteInput {
    pub token: Address,
    pub amount: i128,
    pub commitment: Bn254Fr,
}

#[derive(Clone)]
#[contracttype]
pub struct ShieldedNote {
    pub depositor: Address,
    pub token: Address,
    pub amount: i128,
    pub commitment: Bn254Fr,
    pub created_at_ledger: u32,
    pub withdrawn: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct WithdrawalRecord {
    pub token: Address,
    pub amount: i128,
    pub recipient: Address,
    pub commitment: Bn254Fr,
    pub root: Bn254Fr,
    pub nullifier_hash: Bn254Fr,
    pub withdrawal_hash: Bn254Fr,
    pub withdrawn_at_ledger: u32,
}

#[derive(Clone)]
#[contracttype]
pub struct PoolStats {
    pub deposit_count: u64,
    pub withdrawal_count: u64,
}
