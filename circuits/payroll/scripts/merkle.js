import crypto from 'crypto';
import { buildPoseidon } from 'circomlibjs';

let poseidonInstance = null;

export async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = await buildPoseidon();
  }

  return poseidonInstance;
}

export async function poseidonHash(values) {
  const poseidon = await getPoseidon();
  return BigInt(poseidon.F.toString(poseidon(values)));
}

export async function hashLeaf(commitment) {
  return poseidonHash([BigInt(commitment)]);
}

export async function hashPair(left, right) {
  return poseidonHash([BigInt(left), BigInt(right)]);
}

export async function buildMerkleTree(leaves) {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree with zero leaves.');
  }

  let currentLevel = [...leaves];
  const levels = [currentLevel];

  while (currentLevel.length > 1) {
    const nextLevel = [];

    for (let i = 0; i < currentLevel.length; i += 2) {
      nextLevel.push(await hashPair(currentLevel[i], currentLevel[i + 1]));
    }

    currentLevel = nextLevel;
    levels.push(currentLevel);
  }

  return {
    root: currentLevel[0],
    levels,
  };
}

export async function generateMerkleProof(leaves, index) {
  const { root, levels } = await buildMerkleTree(leaves);

  let currentIndex = index;

  const siblings = [];
  const pathIndices = [];

  for (let level = 0; level < levels.length - 1; level++) {
    const nodes = levels[level];

    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    siblings.push(nodes[siblingIndex]);

    pathIndices.push(currentIndex % 2);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    root,
    siblings,
    pathIndices,
  };
}

export async function verifyMerkleProof(leaf, siblings, pathIndices, expectedRoot) {
  let current = BigInt(leaf);

  for (let i = 0; i < siblings.length; i++) {
    if (pathIndices[i] === 0) {
      current = await hashPair(current, siblings[i]);
    } else {
      current = await hashPair(siblings[i], current);
    }
  }

  return current === BigInt(expectedRoot);
}

export function sha256Hex(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
