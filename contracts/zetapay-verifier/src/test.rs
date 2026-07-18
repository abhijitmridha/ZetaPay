#![cfg(test)]

extern crate std;

use crate::{
    fixtures::{PROOF_A, PROOF_B, PROOF_C, SIGNALS, VK_ALPHA, VK_BETA, VK_DELTA, VK_GAMMA, VK_IC},
    Proof, VerificationKey, ZetaPayVerifier, ZetaPayVerifierClient,
};

use soroban_sdk::{
    crypto::bn254::{Bn254Fr, Bn254G1Affine, Bn254G2Affine},
    BytesN, Env, Vec,
};

fn deploy(env: &Env) -> ZetaPayVerifierClient<'_> {
    let id = env.register(ZetaPayVerifier, ());
    ZetaPayVerifierClient::new(env, &id)
}

fn make_proof(env: &Env) -> Proof {
    Proof {
        a: Bn254G1Affine::from_bytes(BytesN::from_array(env, &PROOF_A)),
        b: Bn254G2Affine::from_bytes(BytesN::from_array(env, &PROOF_B)),
        c: Bn254G1Affine::from_bytes(BytesN::from_array(env, &PROOF_C)),
    }
}

fn make_public_inputs(env: &Env) -> Vec<Bn254Fr> {
    let mut inputs = Vec::new(env);

    for signal in SIGNALS.iter() {
        inputs.push_back(Bn254Fr::from_bytes(BytesN::from_array(env, signal)));
    }

    inputs
}

fn make_vk(env: &Env) -> VerificationKey {
    let alpha = Bn254G1Affine::from_bytes(BytesN::from_array(env, &VK_ALPHA));
    let beta = Bn254G2Affine::from_bytes(BytesN::from_array(env, &VK_BETA));
    let gamma = Bn254G2Affine::from_bytes(BytesN::from_array(env, &VK_GAMMA));
    let delta = Bn254G2Affine::from_bytes(BytesN::from_array(env, &VK_DELTA));

    let mut ic = Vec::new(env);

    for point in VK_IC.iter() {
        ic.push_back(Bn254G1Affine::from_bytes(BytesN::from_array(env, point)));
    }

    VerificationKey {
        alpha,
        beta,
        gamma,
        delta,
        ic,
    }
}

#[test]
fn verifies_real_groth16_payroll_proof() {
    let env = Env::default();

    let client = deploy(&env);
    let vk = make_vk(&env);
    let proof = make_proof(&env);
    let public_inputs = make_public_inputs(&env);

    let result = client.try_verify(&vk, &proof, &public_inputs);

    assert!(result.is_ok());

    let inner = result.unwrap();
    assert!(inner.is_ok());

    let verified = inner.unwrap();
    assert!(verified);
}
