use soroban_sdk::{
    contract, contractimpl, crypto::bn254::Bn254Fr, symbol_short, token, Address, Bytes, BytesN,
    Env, Vec,
};

use crate::{
    error::PayrollError,
    storage::Storage,
    types::{PayeeType, PayrollBatch, PayrollPayment, PayrollRecord, PayrollRunSummary, Token},
};

use zetapay_verifier::{Proof, ZetaPayVerifierClient};

#[contract]
pub struct ZetaPayPayroll;

#[contractimpl]
impl ZetaPayPayroll {
    pub fn initialize(
        env: Env,
        employer: Address,
        verifier: Address,
        xlm_token: Address,
        usdc_token: Address,
        vk: zetapay_verifier::VerificationKey,
    ) -> Result<(), PayrollError> {
        employer.require_auth();

        if Storage::has_employer(&env, &employer) {
            return Err(PayrollError::AlreadyInitialized);
        }

        Storage::set_employer(&env, &employer);
        Storage::set_verifier(&env, &employer, &verifier);
        Storage::set_xlm_token(&env, &employer, &xlm_token);
        Storage::set_usdc_token(&env, &employer, &usdc_token);
        Storage::set_verification_key(&env, &employer, &vk);
        Storage::set_batch_counter(&env, &employer, &0);

        Self::emit_initialized(&env, &employer, &verifier, &xlm_token, &usdc_token);

        Ok(())
    }

    pub fn submit_batch(
        env: Env,
        employer: Address,
        payments: Vec<PayrollPayment>,
        proof: Proof,
        public_inputs: Vec<Bn254Fr>,
        payroll_run_hash: BytesN<32>,
        payroll_run_hash_field: u64,
        period_id: u64,
        batch_index: u32,
        batch_count: u32,
        commitment_root: Bn254Fr,
        encrypted_payroll: Bytes,
        encrypted_notes: Vec<Bytes>,
    ) -> Result<u64, PayrollError> {
        employer.require_auth();

        Self::submit_batch_without_auth(
            &env,
            &employer,
            payments,
            proof,
            public_inputs,
            payroll_run_hash,
            payroll_run_hash_field,
            period_id,
            batch_index,
            batch_count,
            commitment_root,
            encrypted_payroll,
            encrypted_notes,
        )
    }

    pub fn execute_batch(
        env: Env,
        employer: Address,
        batch_id: u64,
        payments: Vec<PayrollPayment>,
    ) -> Result<(), PayrollError> {
        employer.require_auth();

        Self::execute_batch_without_auth(&env, &employer, batch_id, payments)
    }

    pub fn submit_and_execute_batch(
        env: Env,
        employer: Address,
        payments: Vec<PayrollPayment>,
        proof: Proof,
        public_inputs: Vec<Bn254Fr>,
        payroll_run_hash: BytesN<32>,
        payroll_run_hash_field: u64,
        period_id: u64,
        batch_index: u32,
        batch_count: u32,
        commitment_root: Bn254Fr,
        encrypted_payroll: Bytes,
        encrypted_notes: Vec<Bytes>,
    ) -> Result<u64, PayrollError> {
        employer.require_auth();

        let batch_id = Self::submit_batch_without_auth(
            &env,
            &employer,
            payments.clone(),
            proof,
            public_inputs,
            payroll_run_hash,
            payroll_run_hash_field,
            period_id,
            batch_index,
            batch_count,
            commitment_root,
            encrypted_payroll,
            encrypted_notes,
        )?;

        Self::execute_batch_without_auth(&env, &employer, batch_id, payments)?;

        Ok(batch_id)
    }

    pub fn get_batch_count(env: Env, employer: Address) -> u64 {
        Storage::get_batch_counter(&env, &employer)
    }

    pub fn get_payroll_record(
        env: Env,
        employer: Address,
        batch_id: u64,
    ) -> Result<PayrollRecord, PayrollError> {
        Storage::get_payroll_record(&env, &employer, batch_id)
    }

    pub fn get_payroll_run_summary(
        env: Env,
        employer: Address,
        payroll_run_hash: BytesN<32>,
    ) -> Option<PayrollRunSummary> {
        Storage::get_payroll_run_summary(&env, &employer, &payroll_run_hash)
    }

    fn submit_batch_without_auth(
        env: &Env,
        employer: &Address,
        payments: Vec<PayrollPayment>,
        proof: Proof,
        public_inputs: Vec<Bn254Fr>,
        payroll_run_hash: BytesN<32>,
        payroll_run_hash_field: u64,
        period_id: u64,
        batch_index: u32,
        batch_count: u32,
        commitment_root: Bn254Fr,
        encrypted_payroll: Bytes,
        encrypted_notes: Vec<Bytes>,
    ) -> Result<u64, PayrollError> {
        if !Storage::has_employer(env, employer) {
            return Err(PayrollError::NotInitialized);
        }

        if payments.is_empty() {
            return Err(PayrollError::InvalidPayeeCount);
        }

        if encrypted_payroll.is_empty() || encrypted_notes.is_empty() {
            return Err(PayrollError::MissingEncryptedPayload);
        }

        let proof_hash = Self::proof_hash(env, &public_inputs, &payroll_run_hash);

        if Storage::is_proof_processed(env, employer, &proof_hash) {
            return Err(PayrollError::InvalidProof);
        }

        let verifier = Storage::get_verifier(env, employer)?;
        let vk = Storage::get_verification_key(env, employer)?;
        let verifier_client = ZetaPayVerifierClient::new(env, &verifier);

        let verified = verifier_client
            .try_verify(&vk, &proof, &public_inputs)
            .map_err(|_| PayrollError::VerifierError)?
            .map_err(|_| PayrollError::VerifierError)?;

        if !verified {
            return Err(PayrollError::InvalidProof);
        }

        let totals = Self::parse_public_totals(&public_inputs)?;

        if totals.payee_count_total != payments.len() {
            return Err(PayrollError::InvalidPayeeCount);
        }

        if totals.payee_count_total != encrypted_notes.len() {
            return Err(PayrollError::InvalidPayeeCount);
        }

        Self::verify_payments_against_totals(&payments, &totals)?;

        if totals.period_id != period_id
            || totals.payroll_run_hash != payroll_run_hash_field
            || totals.batch_index != batch_index
            || totals.batch_count != batch_count
        {
            return Err(PayrollError::InvalidTotals);
        }

        if totals.batch_root != commitment_root {
            return Err(PayrollError::InvalidCommitment);
        }

        let batch_id = Storage::get_batch_counter(env, employer) + 1;

        let batch = PayrollBatch {
            payroll_run_hash,
            period_id,
            batch_index,
            batch_count,
            proof_hash: proof_hash.clone(),
            commitment_root,
            payment_count: payments.len(),
            total_amount: totals.total_amount,
            total_xlm: totals.total_xlm,
            total_usdc: totals.total_usdc,
            encrypted_payroll,
            encrypted_notes,
            is_executed: false,
        };

        let record = PayrollRecord { batch };

        Storage::set_payroll_record(env, employer, batch_id, &record);
        Storage::set_batch_counter(env, employer, &batch_id);
        Storage::mark_proof_processed(env, employer, &proof_hash);

        Self::update_run_on_submit(
            env,
            employer,
            &record.batch.payroll_run_hash,
            record.batch.period_id,
            record.batch.batch_count,
            record.batch.total_amount,
            record.batch.total_xlm,
            record.batch.total_usdc,
        );

        Self::emit_batch_submitted(
            env,
            employer,
            batch_id,
            &record.batch.payroll_run_hash,
            record.batch.period_id,
            record.batch.batch_index,
            record.batch.batch_count,
            record.batch.payment_count,
            record.batch.total_amount,
            record.batch.total_xlm,
            record.batch.total_usdc,
        );

        Ok(batch_id)
    }

    fn execute_batch_without_auth(
        env: &Env,
        employer: &Address,
        batch_id: u64,
        payments: Vec<PayrollPayment>,
    ) -> Result<(), PayrollError> {
        if !Storage::has_employer(env, employer) {
            return Err(PayrollError::NotInitialized);
        }

        let mut record = Storage::get_payroll_record(env, employer, batch_id)?;

        if record.batch.is_executed {
            return Err(PayrollError::AlreadyExecuted);
        }

        Self::verify_execution_payments(&payments, &record.batch)?;

        let xlm_token = Storage::get_xlm_token(env, employer)?;
        let usdc_token = Storage::get_usdc_token(env, employer)?;

        for payment in payments.iter() {
            match payment.token {
                Token::XLM => {
                    token::TokenClient::new(env, &xlm_token).transfer(
                        employer,
                        &payment.recipient,
                        &payment.amount,
                    );
                }
                Token::USDC => {
                    token::TokenClient::new(env, &usdc_token).transfer(
                        employer,
                        &payment.recipient,
                        &payment.amount,
                    );
                }
            }
        }

        record.batch.is_executed = true;
        Storage::set_payroll_record(env, employer, batch_id, &record);

        Self::update_run_on_execute(env, employer, &record.batch.payroll_run_hash);

        Self::emit_batch_executed(
            env,
            employer,
            batch_id,
            &record.batch.payroll_run_hash,
            record.batch.payment_count,
            record.batch.total_amount,
            record.batch.total_xlm,
            record.batch.total_usdc,
        );

        Ok(())
    }

    #[allow(deprecated)]
    fn emit_initialized(
        env: &Env,
        employer: &Address,
        verifier: &Address,
        xlm_token: &Address,
        usdc_token: &Address,
    ) {
        env.events().publish(
            (symbol_short!("init"), employer),
            (verifier, xlm_token, usdc_token),
        );
    }

    #[allow(clippy::too_many_arguments, deprecated)]
    fn emit_batch_submitted(
        env: &Env,
        employer: &Address,
        batch_id: u64,
        payroll_run_hash: &BytesN<32>,
        period_id: u64,
        batch_index: u32,
        batch_count: u32,
        payment_count: u32,
        total_amount: i128,
        total_xlm: i128,
        total_usdc: i128,
    ) {
        env.events().publish(
            (symbol_short!("submit"), employer, batch_id),
            (
                payroll_run_hash,
                period_id,
                batch_index,
                batch_count,
                payment_count,
                total_amount,
                total_xlm,
                total_usdc,
            ),
        );
    }

    #[allow(deprecated)]
    fn emit_batch_executed(
        env: &Env,
        employer: &Address,
        batch_id: u64,
        payroll_run_hash: &BytesN<32>,
        payment_count: u32,
        total_amount: i128,
        total_xlm: i128,
        total_usdc: i128,
    ) {
        env.events().publish(
            (symbol_short!("execute"), employer, batch_id),
            (
                payroll_run_hash,
                payment_count,
                total_amount,
                total_xlm,
                total_usdc,
            ),
        );
    }

    fn verify_execution_payments(
        payments: &Vec<PayrollPayment>,
        batch: &PayrollBatch,
    ) -> Result<(), PayrollError> {
        let mut total_amount: i128 = 0;
        let mut total_xlm: i128 = 0;
        let mut total_usdc: i128 = 0;

        if payments.len() != batch.payment_count {
            return Err(PayrollError::InvalidPayeeCount);
        }

        for payment in payments.iter() {
            if payment.amount <= 0 {
                return Err(PayrollError::InvalidTotals);
            }

            total_amount += payment.amount;

            match payment.token {
                Token::XLM => total_xlm += payment.amount,
                Token::USDC => total_usdc += payment.amount,
            }
        }

        if total_amount != batch.total_amount
            || total_xlm != batch.total_xlm
            || total_usdc != batch.total_usdc
        {
            return Err(PayrollError::InvalidTotals);
        }

        Ok(())
    }

    fn proof_hash(
        env: &Env,
        public_inputs: &Vec<Bn254Fr>,
        payroll_run_hash: &BytesN<32>,
    ) -> BytesN<32> {
        let mut bytes = Bytes::new(env);

        for input in public_inputs.iter() {
            let input_bytes = input.to_u256().to_be_bytes();
            bytes.append(&input_bytes);
        }

        bytes.append(&Bytes::from_array(env, &payroll_run_hash.to_array()));

        env.crypto().sha256(&bytes).into()
    }

    fn parse_public_totals(public_inputs: &Vec<Bn254Fr>) -> Result<PublicTotals, PayrollError> {
        Ok(PublicTotals {
            batch_root: Self::parse_fr(public_inputs, 0)?,
            total_amount: Self::parse_i128(public_inputs, 1)?,
            total_xlm: Self::parse_i128(public_inputs, 2)?,
            total_usdc: Self::parse_i128(public_inputs, 3)?,
            employee_total: Self::parse_i128(public_inputs, 4)?,
            contractor_total: Self::parse_i128(public_inputs, 5)?,
            freelancer_total: Self::parse_i128(public_inputs, 6)?,
            vendor_total: Self::parse_i128(public_inputs, 7)?,
            consultant_total: Self::parse_i128(public_inputs, 8)?,
            contributor_total: Self::parse_i128(public_inputs, 9)?,
            employee_count: Self::parse_u32(public_inputs, 10)?,
            contractor_count: Self::parse_u32(public_inputs, 11)?,
            freelancer_count: Self::parse_u32(public_inputs, 12)?,
            vendor_count: Self::parse_u32(public_inputs, 13)?,
            consultant_count: Self::parse_u32(public_inputs, 14)?,
            contributor_count: Self::parse_u32(public_inputs, 15)?,
            period_id: Self::parse_u64(public_inputs, 16)?,
            payroll_run_hash: Self::parse_u64(public_inputs, 17)?,
            batch_index: Self::parse_u32(public_inputs, 18)?,
            batch_count: Self::parse_u32(public_inputs, 19)?,
            payee_count_total: Self::parse_u32(public_inputs, 20)?,
        })
    }

    fn update_run_on_submit(
        env: &Env,
        employer: &Address,
        payroll_run_hash: &BytesN<32>,
        period_id: u64,
        batch_count: u32,
        total_amount: i128,
        total_xlm: i128,
        total_usdc: i128,
    ) {
        let mut summary = Storage::get_payroll_run_summary(env, employer, payroll_run_hash)
            .unwrap_or(PayrollRunSummary {
                payroll_run_hash: payroll_run_hash.clone(),
                period_id,
                batch_count,
                submitted_batches: 0,
                executed_batches: 0,
                total_amount: 0,
                total_xlm: 0,
                total_usdc: 0,
                is_complete: false,
                is_fully_executed: false,
            });

        summary.submitted_batches += 1;
        summary.total_amount += total_amount;
        summary.total_xlm += total_xlm;
        summary.total_usdc += total_usdc;
        summary.is_complete = summary.submitted_batches == summary.batch_count;
        summary.is_fully_executed =
            summary.is_complete && summary.executed_batches == summary.batch_count;

        Storage::set_payroll_run_summary(env, employer, payroll_run_hash, &summary);
    }

    fn update_run_on_execute(env: &Env, employer: &Address, payroll_run_hash: &BytesN<32>) {
        if let Some(mut summary) = Storage::get_payroll_run_summary(env, employer, payroll_run_hash)
        {
            summary.executed_batches += 1;
            summary.is_fully_executed =
                summary.is_complete && summary.executed_batches == summary.batch_count;

            Storage::set_payroll_run_summary(env, employer, payroll_run_hash, &summary);
        }
    }

    fn verify_payments_against_totals(
        payments: &Vec<PayrollPayment>,
        totals: &PublicTotals,
    ) -> Result<(), PayrollError> {
        let mut total_amount: i128 = 0;
        let mut total_xlm: i128 = 0;
        let mut total_usdc: i128 = 0;

        let mut employee_total: i128 = 0;
        let mut contractor_total: i128 = 0;
        let mut freelancer_total: i128 = 0;
        let mut vendor_total: i128 = 0;
        let mut consultant_total: i128 = 0;
        let mut contributor_total: i128 = 0;

        let mut employee_count: u32 = 0;
        let mut contractor_count: u32 = 0;
        let mut freelancer_count: u32 = 0;
        let mut vendor_count: u32 = 0;
        let mut consultant_count: u32 = 0;
        let mut contributor_count: u32 = 0;

        for payment in payments.iter() {
            if payment.amount <= 0 {
                return Err(PayrollError::InvalidTotals);
            }

            total_amount += payment.amount;

            match payment.token {
                Token::XLM => total_xlm += payment.amount,
                Token::USDC => total_usdc += payment.amount,
            }

            match payment.payee_type {
                PayeeType::Employee => {
                    employee_total += payment.amount;
                    employee_count += 1;
                }
                PayeeType::Contractor => {
                    contractor_total += payment.amount;
                    contractor_count += 1;
                }
                PayeeType::Freelancer => {
                    freelancer_total += payment.amount;
                    freelancer_count += 1;
                }
                PayeeType::Vendor => {
                    vendor_total += payment.amount;
                    vendor_count += 1;
                }
                PayeeType::Consultant => {
                    consultant_total += payment.amount;
                    consultant_count += 1;
                }
                PayeeType::Contributor => {
                    contributor_total += payment.amount;
                    contributor_count += 1;
                }
            }
        }

        if total_amount != totals.total_amount
            || total_xlm != totals.total_xlm
            || total_usdc != totals.total_usdc
            || employee_total != totals.employee_total
            || contractor_total != totals.contractor_total
            || freelancer_total != totals.freelancer_total
            || vendor_total != totals.vendor_total
            || consultant_total != totals.consultant_total
            || contributor_total != totals.contributor_total
            || employee_count != totals.employee_count
            || contractor_count != totals.contractor_count
            || freelancer_count != totals.freelancer_count
            || vendor_count != totals.vendor_count
            || consultant_count != totals.consultant_count
            || contributor_count != totals.contributor_count
        {
            return Err(PayrollError::InvalidTotals);
        }

        Ok(())
    }

    fn parse_fr(inputs: &Vec<Bn254Fr>, idx: u32) -> Result<Bn254Fr, PayrollError> {
        inputs.get(idx).ok_or(PayrollError::InvalidTotals)
    }

    fn parse_i128(inputs: &Vec<Bn254Fr>, idx: u32) -> Result<i128, PayrollError> {
        let value = inputs
            .get(idx)
            .ok_or(PayrollError::InvalidTotals)?
            .to_u256()
            .to_u128()
            .ok_or(PayrollError::InvalidTotals)?;

        value.try_into().map_err(|_| PayrollError::InvalidTotals)
    }

    fn parse_u32(inputs: &Vec<Bn254Fr>, idx: u32) -> Result<u32, PayrollError> {
        let value = inputs
            .get(idx)
            .ok_or(PayrollError::InvalidTotals)?
            .to_u256()
            .to_u128()
            .ok_or(PayrollError::InvalidTotals)?;

        value.try_into().map_err(|_| PayrollError::InvalidTotals)
    }

    fn parse_u64(inputs: &Vec<Bn254Fr>, idx: u32) -> Result<u64, PayrollError> {
        let value = inputs
            .get(idx)
            .ok_or(PayrollError::InvalidTotals)?
            .to_u256()
            .to_u128()
            .ok_or(PayrollError::InvalidTotals)?;

        value.try_into().map_err(|_| PayrollError::InvalidTotals)
    }
}

struct PublicTotals {
    batch_root: Bn254Fr,
    total_amount: i128,
    total_xlm: i128,
    total_usdc: i128,
    employee_total: i128,
    contractor_total: i128,
    freelancer_total: i128,
    vendor_total: i128,
    consultant_total: i128,
    contributor_total: i128,
    employee_count: u32,
    contractor_count: u32,
    freelancer_count: u32,
    vendor_count: u32,
    consultant_count: u32,
    contributor_count: u32,
    period_id: u64,
    payroll_run_hash: u64,
    batch_index: u32,
    batch_count: u32,
    payee_count_total: u32,
}
