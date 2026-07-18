pragma circom 2.2.0;

include "circomlib/circuits/poseidon.circom";

template DepositNote() {
    signal input secret;
    signal input nullifier;
    signal input amount;
    signal input token_type;
    signal input salt;

    signal input commitment_public;

    signal output commitment;

    component poseidon = Poseidon(5);
    poseidon.inputs[0] <== secret;
    poseidon.inputs[1] <== nullifier;
    poseidon.inputs[2] <== amount;
    poseidon.inputs[3] <== token_type;
    poseidon.inputs[4] <== salt;

    commitment <== poseidon.out;
    commitment === commitment_public;
}

component main { public [commitment_public] } = DepositNote();