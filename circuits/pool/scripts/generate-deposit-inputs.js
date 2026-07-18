import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';

const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

const notePath = process.argv[2];
const outputPath = process.argv[3] || path.join(process.cwd(), 'circuits/pool/inputs/deposit.json');

if (!notePath) {
  throw new Error(
    'Usage: node circuits/pool/scripts/generate-deposit-inputs.js <note.json> [output.json]'
  );
}

const poseidon = await buildPoseidon();

function poseidonHash(values) {
  return BigInt(poseidon.F.toString(poseidon(values.map(BigInt))));
}

function hashToField(value) {
  return BigInt(`0x${crypto.createHash('sha256').update(value).digest('hex')}`) % FIELD_MODULUS;
}

function requireValue(record, key) {
  const value = record[key];

  if (value === undefined || value === null || value === '') {
    throw new Error(`Missing ${key} in note file`);
  }

  return value;
}

const note = JSON.parse(fs.readFileSync(notePath, 'utf8'));

const secret = requireValue(note, 'secret');
const nullifier = requireValue(note, 'nullifier');
const amount = requireValue(note, 'amount');
const salt = requireValue(note, 'salt');

const tokenHash =
  note.token_hash ||
  hashToField(
    JSON.stringify({
      token: requireValue(note, 'token'),
      network: note.network || 'stellar testnet',
    })
  ).toString();

const commitment = poseidonHash([secret, nullifier, amount, tokenHash, salt]);

const finalInput = {
  secret: String(secret),
  nullifier: String(nullifier),
  amount: String(amount),
  token_hash: String(tokenHash),
  salt: String(salt),
  commitment_public: commitment.toString(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(finalInput, null, 2));

console.log('Generated deposit witness input');
console.log('Commitment:', commitment.toString());
console.log('Output:', outputPath);
