import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';

const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

const DEPTH = 7;
const LEAF_COUNT = 2 ** DEPTH;

const notePath = process.argv[2];
const treePath = process.argv[3];
const recipient = process.argv[4];
const outputPath =
  process.argv[5] || path.join(process.cwd(), 'circuits/pool/inputs/withdraw.json');

if (!notePath || !treePath || !recipient) {
  throw new Error(
    'Usage: node circuits/pool/scripts/generate-withdraw-inputs.js <note.json> <tree.json> <recipient> [output.json]'
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
    throw new Error(`Missing ${key}`);
  }

  return value;
}

async function hashPair(left, right) {
  return poseidonHash([left, right]);
}

async function buildMerkleTree(leaves) {
  let current = [...leaves];
  const levels = [current];

  while (current.length > 1) {
    const next = [];

    for (let index = 0; index < current.length; index += 2) {
      next.push(await hashPair(current[index], current[index + 1]));
    }

    current = next;
    levels.push(current);
  }

  return {
    root: current[0],
    levels,
  };
}

function generateProof(levels, index) {
  let currentIndex = index;
  const pathElements = [];
  const pathIndices = [];

  for (let level = 0; level < levels.length - 1; level += 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    pathElements.push(levels[level][siblingIndex].toString());
    pathIndices.push(currentIndex % 2);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return { pathElements, pathIndices };
}

const note = JSON.parse(fs.readFileSync(notePath, 'utf8'));
const treeInput = JSON.parse(fs.readFileSync(treePath, 'utf8'));

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

const commitments = Array.isArray(treeInput.commitments) ? treeInput.commitments : [];

const leaves = commitments.map((value) => BigInt(value || '0'));

while (leaves.length < LEAF_COUNT) {
  leaves.push(BigInt(0));
}

const noteIndex = leaves.findIndex((value) => value === commitment);

if (noteIndex < 0) {
  throw new Error('Commitment from note was not found in tree commitments');
}

const tree = await buildMerkleTree(leaves.slice(0, LEAF_COUNT));
const merkleProof = generateProof(tree.levels, noteIndex);

if (treeInput.root && String(treeInput.root) !== tree.root.toString()) {
  throw new Error('Computed root does not match provided tree root');
}

const nullifierHash = poseidonHash([nullifier]);
const recipientHash = hashToField(recipient);
const withdrawalHash = poseidonHash([nullifierHash, recipientHash, amount, tokenHash]);

const finalInput = {
  secret: String(secret),
  nullifier: String(nullifier),
  amount_private: String(amount),
  token_hash_private: String(tokenHash),
  salt: String(salt),

  path_elements: merkleProof.pathElements,
  path_indices: merkleProof.pathIndices,

  root_public: tree.root.toString(),
  nullifier_hash_public: nullifierHash.toString(),
  recipient_hash_public: recipientHash.toString(),
  amount_public: String(amount),
  token_hash_public: String(tokenHash),
  withdrawal_hash_public: withdrawalHash.toString(),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(finalInput, null, 2));

console.log('Generated withdraw witness input');
console.log('Commitment:', commitment.toString());
console.log('Root:', tree.root.toString());
console.log('Nullifier hash:', nullifierHash.toString());
console.log('Withdrawal hash:', withdrawalHash.toString());
console.log('Output:', outputPath);
