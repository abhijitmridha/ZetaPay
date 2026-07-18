pragma circom 2.2.0;

include "circomlib/circuits/poseidon.circom";

template IsBoolean() {
    signal input in;
    in * (in - 1) === 0;
}

template WithdrawNote(depth) {
    signal input secret;
    signal input nullifier;
    signal input amount_private;
    signal input token_hash_private;
    signal input salt;

    signal input path_elements[depth];
    signal input path_indices[depth];

    signal input root_public;
    signal input nullifier_hash_public;
    signal input recipient_hash_public;
    signal input amount_public;
    signal input token_hash_public;
    signal input withdrawal_hash_public;

    signal commitment;

    component note_hash = Poseidon(5);
    note_hash.inputs[0] <== secret;
    note_hash.inputs[1] <== nullifier;
    note_hash.inputs[2] <== amount_private;
    note_hash.inputs[3] <== token_hash_private;
    note_hash.inputs[4] <== salt;

    commitment <== note_hash.out;

    amount_private === amount_public;
    token_hash_private === token_hash_public;

    component nullifier_hash = Poseidon(1);
    nullifier_hash.inputs[0] <== nullifier;
    nullifier_hash.out === nullifier_hash_public;

    component withdrawal_hash = Poseidon(4);
    withdrawal_hash.inputs[0] <== nullifier_hash_public;
    withdrawal_hash.inputs[1] <== recipient_hash_public;
    withdrawal_hash.inputs[2] <== amount_public;
    withdrawal_hash.inputs[3] <== token_hash_public;
    withdrawal_hash.out === withdrawal_hash_public;

    signal current[depth + 1];
    current[0] <== commitment;

    component is_bool[depth];
    component hashers[depth];

    signal diff[depth];
    signal selected_left[depth];
    signal selected_right[depth];

    for (var i = 0; i < depth; i++) {
        is_bool[i] = IsBoolean();
        is_bool[i].in <== path_indices[i];

        diff[i] <== path_elements[i] - current[i];

        selected_left[i] <== current[i] + path_indices[i] * diff[i];
        selected_right[i] <== path_elements[i] - path_indices[i] * diff[i];

        hashers[i] = Poseidon(2);
        hashers[i].inputs[0] <== selected_left[i];
        hashers[i].inputs[1] <== selected_right[i];

        current[i + 1] <== hashers[i].out;
    }

    current[depth] === root_public;
}

component main { public [
    root_public,
    nullifier_hash_public,
    recipient_hash_public,
    amount_public,
    token_hash_public,
    withdrawal_hash_public
] } = WithdrawNote(7);