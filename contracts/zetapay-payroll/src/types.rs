use soroban_sdk::{contracttype, crypto::bn254::Bn254Fr, Address, Bytes, BytesN, Vec};

#[derive(Clone)]
#[contracttype]
pub enum Token {
    XLM,
    USDC,
}

#[derive(Clone)]
#[contracttype]
pub enum PayeeType {
    Employee,
    Contractor,
    Freelancer,
    Vendor,
    Consultant,
    Contributor,
}

#[derive(Clone)]
#[contracttype]
pub struct PayrollPayment {
    pub payee_id: u64,
    pub recipient: Address,
    pub amount: i128,
    pub token: Token,
    pub payee_type: PayeeType,
}

#[derive(Clone)]
#[contracttype]
pub struct PayrollBatch {
    pub payroll_run_hash: BytesN<32>,
    pub period_id: u64,
    pub batch_index: u32,
    pub batch_count: u32,
    pub proof_hash: BytesN<32>,
    pub commitment_root: Bn254Fr,
    pub payment_count: u32,
    pub total_amount: i128,
    pub total_xlm: i128,
    pub total_usdc: i128,
    pub encrypted_payroll: Bytes,
    pub encrypted_notes: Vec<Bytes>,
    pub is_executed: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct PayrollRunSummary {
    pub payroll_run_hash: BytesN<32>,
    pub period_id: u64,
    pub batch_count: u32,
    pub submitted_batches: u32,
    pub executed_batches: u32,
    pub total_amount: i128,
    pub total_xlm: i128,
    pub total_usdc: i128,
    pub is_complete: bool,
    pub is_fully_executed: bool,
}

#[derive(Clone)]
#[contracttype]
pub struct PayrollRecord {
    pub batch: PayrollBatch,
}
