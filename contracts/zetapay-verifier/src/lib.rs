#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype,
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    vec, Env, Vec,
};

#[derive(Clone)]
#[contracttype]
pub struct VerificationKey {
    pub alpha: Bn254G1Affine,
    pub beta: Bn254G2Affine,
    pub gamma: Bn254G2Affine,
    pub delta: Bn254G2Affine,
    pub ic: Vec<Bn254G1Affine>,
}

#[derive(Clone)]
#[contracttype]
pub struct Proof {
    pub a: Bn254G1Affine,
    pub b: Bn254G2Affine,
    pub c: Bn254G1Affine,
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum VerifierError {
    InvalidVerificationKey = 1,
}

#[contract]
pub struct ZetaPayVerifier;

#[contractimpl]
impl ZetaPayVerifier {
    pub fn verify(
        env: Env,
        vk: VerificationKey,
        proof: Proof,
        public_inputs: Vec<Bn254Fr>,
    ) -> Result<bool, VerifierError> {
        if vk.ic.len() != public_inputs.len() + 1 {
            return Err(VerifierError::InvalidVerificationKey);
        }

        let bn = env.crypto().bn254();

        let mut vk_x = vk.ic.get(0).unwrap();

        for (input, ic) in public_inputs.iter().zip(vk.ic.iter().skip(1)) {
            let term = bn.g1_mul(&ic, &input);
            vk_x = bn.g1_add(&vk_x, &term);
        }

        let neg_a = -proof.a;

        Ok(bn.pairing_check(
            vec![&env, neg_a, vk.alpha, vk_x, proof.c],
            vec![&env, proof.b, vk.beta, vk.gamma, vk.delta],
        ))
    }
}

mod fixtures;

#[cfg(test)]
mod test;
