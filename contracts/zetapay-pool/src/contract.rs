use soroban_sdk::{
    contract, contractimpl, crypto::bn254::Bn254Fr, symbol_short, token, Address, Env, Vec,
};

use crate::{
    error::PoolError,
    storage::Storage,
    types::{DepositNoteInput, PoolConfig, PoolStats, ShieldedNote, WithdrawalRecord},
};

use zetapay_verifier::{Proof, ZetaPayVerifierClient};

#[contract]
pub struct ZetaPayPool;

#[contractimpl]
impl ZetaPayPool {
    pub fn initialize(
        env: Env,
        admin: Address,
        verifier: Address,
        verification_key: zetapay_verifier::VerificationKey,
    ) -> Result<(), PoolError> {
        admin.require_auth();

        if Storage::has_config(&env) {
            return Err(PoolError::AlreadyInitialized);
        }

        Storage::set_config(
            &env,
            &PoolConfig {
                admin: admin.clone(),
                verifier: verifier.clone(),
                verification_key,
            },
        );

        Storage::set_deposit_count(&env, &0);
        Storage::set_withdrawal_count(&env, &0);

        Self::emit_initialized(&env, &admin, &verifier);

        Ok(())
    }

    pub fn register_token(env: Env, admin: Address, token: Address) -> Result<(), PoolError> {
        admin.require_auth();

        let config = Storage::get_config(&env)?;

        if config.admin != admin {
            return Err(PoolError::Unauthorized);
        }

        Storage::set_registered_token(&env, &token);

        Self::emit_token_registered(&env, &admin, &token);

        Ok(())
    }

    pub fn post_root(env: Env, admin: Address, root: Bn254Fr) -> Result<(), PoolError> {
        admin.require_auth();

        let config = Storage::get_config(&env)?;

        if config.admin != admin {
            return Err(PoolError::Unauthorized);
        }

        if Storage::is_root_accepted(&env, &root) {
            return Err(PoolError::RootAlreadyAccepted);
        }

        Storage::accept_root(&env, &root);

        Self::emit_root_accepted(&env, &admin, &root);

        Ok(())
    }

    pub fn fund_payroll(
        env: Env,
        admin: Address,
        root: Bn254Fr,
        deposits: Vec<DepositNoteInput>,
    ) -> Result<(), PoolError> {
        admin.require_auth();

        if deposits.is_empty() {
            return Err(PoolError::InvalidAmount);
        }

        let config = Storage::get_config(&env)?;

        if config.admin != admin {
            return Err(PoolError::Unauthorized);
        }

        if !Storage::is_root_accepted(&env, &root) {
            Storage::accept_root(&env, &root);
            Self::emit_root_accepted(&env, &admin, &root);
        }

        for index in 0..deposits.len() {
            let deposit = deposits.get(index).ok_or(PoolError::InvalidAmount)?;

            Self::deposit_one(
                &env,
                &admin,
                &deposit.token,
                deposit.amount,
                &deposit.commitment,
            )?;
        }

        Ok(())
    }

    pub fn deposit_note(
        env: Env,
        depositor: Address,
        token: Address,
        amount: i128,
        commitment: Bn254Fr,
    ) -> Result<(), PoolError> {
        depositor.require_auth();

        Self::deposit_one(&env, &depositor, &token, amount, &commitment)?;

        Ok(())
    }

    pub fn deposit_notes(
        env: Env,
        depositor: Address,
        deposits: Vec<DepositNoteInput>,
    ) -> Result<(), PoolError> {
        depositor.require_auth();

        if deposits.is_empty() {
            return Err(PoolError::InvalidAmount);
        }

        for index in 0..deposits.len() {
            let deposit = deposits.get(index).ok_or(PoolError::InvalidAmount)?;

            Self::deposit_one(
                &env,
                &depositor,
                &deposit.token,
                deposit.amount,
                &deposit.commitment,
            )?;
        }

        Ok(())
    }

    pub fn withdraw_with_proof(
        env: Env,
        recipient: Address,
        token: Address,
        amount: i128,
        commitment: Bn254Fr,
        root: Bn254Fr,
        nullifier_hash: Bn254Fr,
        recipient_hash: Bn254Fr,
        token_hash: Bn254Fr,
        withdrawal_hash: Bn254Fr,
        proof: Proof,
        public_inputs: Vec<Bn254Fr>,
    ) -> Result<(), PoolError> {
        recipient.require_auth();

        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        if !Storage::is_registered_token(&env, &token) {
            return Err(PoolError::TokenNotRegistered);
        }

        if !Storage::is_root_accepted(&env, &root) {
            return Err(PoolError::UnknownRoot);
        }

        if Storage::is_nullifier_spent(&env, &nullifier_hash) {
            return Err(PoolError::NullifierAlreadySpent);
        }

        let mut note = Storage::get_note(&env, &commitment)?;

        if note.withdrawn {
            return Err(PoolError::NoteAlreadyWithdrawn);
        }

        if note.amount != amount || note.token != token {
            return Err(PoolError::InvalidWithdrawal);
        }

        Self::validate_public_inputs(
            &public_inputs,
            &root,
            &nullifier_hash,
            &recipient_hash,
            amount,
            &token_hash,
            &withdrawal_hash,
        )?;

        let config = Storage::get_config(&env)?;
        let verifier_client = ZetaPayVerifierClient::new(&env, &config.verifier);

        let verified = verifier_client
            .try_verify(&config.verification_key, &proof, &public_inputs)
            .map_err(|_| PoolError::VerifierError)?
            .map_err(|_| PoolError::VerifierError)?;

        if !verified {
            return Err(PoolError::InvalidProof);
        }

        Storage::mark_nullifier_spent(&env, &nullifier_hash);

        note.withdrawn = true;
        Storage::set_note(&env, &commitment, &note);

        let record = WithdrawalRecord {
            token: token.clone(),
            amount,
            recipient: recipient.clone(),
            commitment: commitment.clone(),
            root: root.clone(),
            nullifier_hash: nullifier_hash.clone(),
            withdrawal_hash: withdrawal_hash.clone(),
            withdrawn_at_ledger: env.ledger().sequence(),
        };

        Storage::set_withdrawal(&env, &nullifier_hash, &record);

        let count = Storage::get_withdrawal_count(&env) + 1;
        Storage::set_withdrawal_count(&env, &count);

        token::TokenClient::new(&env, &token).transfer(
            &env.current_contract_address(),
            &recipient,
            &amount,
        );

        Self::emit_note_withdrawn(
            &env,
            &recipient,
            &nullifier_hash,
            &token,
            amount,
            &commitment,
            &root,
            &withdrawal_hash,
        );

        Ok(())
    }

    pub fn get_note(env: Env, commitment: Bn254Fr) -> Result<ShieldedNote, PoolError> {
        Storage::get_note(&env, &commitment)
    }

    pub fn is_initialized(env: Env) -> bool {
        Storage::has_config(&env)
    }

    pub fn is_token_registered(env: Env, token: Address) -> bool {
        Storage::is_registered_token(&env, &token)
    }

    pub fn is_root_accepted(env: Env, root: Bn254Fr) -> bool {
        Storage::is_root_accepted(&env, &root)
    }

    pub fn is_nullifier_spent(env: Env, nullifier_hash: Bn254Fr) -> bool {
        Storage::is_nullifier_spent(&env, &nullifier_hash)
    }

    pub fn get_withdrawal(env: Env, nullifier_hash: Bn254Fr) -> Option<WithdrawalRecord> {
        Storage::get_withdrawal(&env, &nullifier_hash)
    }

    pub fn get_stats(env: Env) -> PoolStats {
        Storage::get_stats(&env)
    }

    fn deposit_one(
        env: &Env,
        depositor: &Address,
        token_address: &Address,
        amount: i128,
        commitment: &Bn254Fr,
    ) -> Result<(), PoolError> {
        if amount <= 0 {
            return Err(PoolError::InvalidAmount);
        }

        if !Storage::is_registered_token(env, token_address) {
            return Err(PoolError::TokenNotRegistered);
        }

        if Storage::has_note(env, commitment) {
            return Err(PoolError::CommitmentAlreadyExists);
        }

        token::TokenClient::new(env, token_address).transfer(
            depositor,
            env.current_contract_address(),
            &amount,
        );

        let note = ShieldedNote {
            depositor: depositor.clone(),
            token: token_address.clone(),
            amount,
            commitment: commitment.clone(),
            created_at_ledger: env.ledger().sequence(),
            withdrawn: false,
        };

        Storage::set_note(env, commitment, &note);

        let count = Storage::get_deposit_count(env) + 1;
        Storage::set_deposit_count(env, &count);

        Self::emit_note_deposited(env, depositor, commitment, token_address, amount, count);

        Ok(())
    }

    #[allow(deprecated)]
    fn emit_initialized(env: &Env, admin: &Address, verifier: &Address) {
        env.events()
            .publish((symbol_short!("init"), admin), verifier);
    }

    #[allow(deprecated)]
    fn emit_token_registered(env: &Env, admin: &Address, token: &Address) {
        env.events().publish((symbol_short!("token"), admin), token);
    }

    #[allow(deprecated)]
    fn emit_root_accepted(env: &Env, admin: &Address, root: &Bn254Fr) {
        env.events().publish((symbol_short!("root"), admin), root);
    }

    #[allow(deprecated)]
    fn emit_note_deposited(
        env: &Env,
        depositor: &Address,
        commitment: &Bn254Fr,
        token_address: &Address,
        amount: i128,
        deposit_count: u64,
    ) {
        env.events().publish(
            (symbol_short!("deposit"), depositor, commitment),
            (token_address, amount, deposit_count),
        );
    }

    #[allow(clippy::too_many_arguments, deprecated)]
    fn emit_note_withdrawn(
        env: &Env,
        recipient: &Address,
        nullifier_hash: &Bn254Fr,
        token: &Address,
        amount: i128,
        commitment: &Bn254Fr,
        root: &Bn254Fr,
        withdrawal_hash: &Bn254Fr,
    ) {
        env.events().publish(
            (symbol_short!("withdraw"), recipient, nullifier_hash),
            (token, amount, commitment, root, withdrawal_hash),
        );
    }

    fn validate_public_inputs(
        public_inputs: &Vec<Bn254Fr>,
        root: &Bn254Fr,
        nullifier_hash: &Bn254Fr,
        recipient_hash: &Bn254Fr,
        amount: i128,
        token_hash: &Bn254Fr,
        withdrawal_hash: &Bn254Fr,
    ) -> Result<(), PoolError> {
        if public_inputs.len() != 6 {
            return Err(PoolError::InvalidPublicInputs);
        }

        if public_inputs.get(0).ok_or(PoolError::InvalidPublicInputs)? != root.clone() {
            return Err(PoolError::InvalidPublicInputs);
        }

        if public_inputs.get(1).ok_or(PoolError::InvalidPublicInputs)? != nullifier_hash.clone() {
            return Err(PoolError::InvalidPublicInputs);
        }

        if public_inputs.get(2).ok_or(PoolError::InvalidPublicInputs)? != recipient_hash.clone() {
            return Err(PoolError::InvalidPublicInputs);
        }

        let amount_fr = public_inputs
            .get(3)
            .ok_or(PoolError::InvalidPublicInputs)?
            .to_u256()
            .to_u128()
            .ok_or(PoolError::InvalidPublicInputs)?;

        let amount_i128: i128 = amount_fr
            .try_into()
            .map_err(|_| PoolError::InvalidPublicInputs)?;

        if amount_i128 != amount {
            return Err(PoolError::InvalidPublicInputs);
        }

        if public_inputs.get(4).ok_or(PoolError::InvalidPublicInputs)? != token_hash.clone() {
            return Err(PoolError::InvalidPublicInputs);
        }

        if public_inputs.get(5).ok_or(PoolError::InvalidPublicInputs)? != withdrawal_hash.clone() {
            return Err(PoolError::InvalidPublicInputs);
        }

        Ok(())
    }
}
