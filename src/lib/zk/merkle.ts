import { buildPoseidon } from 'circomlibjs';

type Poseidon = {
  F: {
    toString(value: unknown): string;
  };
  (inputs: bigint[]): unknown;
};

let poseidonInstance: Poseidon | null = null;

export type MerkleProof = {
  root: bigint;
  siblings: bigint[];
  pathIndices: number[];
};

export async function getPoseidon() {
  if (!poseidonInstance) {
    poseidonInstance = (await buildPoseidon()) as Poseidon;
  }

  return poseidonInstance;
}

export async function poseidonHash(values: bigint[]): Promise<bigint> {
  const poseidon = await getPoseidon();

  return BigInt(poseidon.F.toString(poseidon(values)));
}

export async function hashPair(left: bigint, right: bigint): Promise<bigint> {
  return poseidonHash([left, right]);
}

export async function buildMerkleTree(leaves: bigint[]) {
  if (leaves.length === 0) {
    throw new Error('Cannot build Merkle tree with zero leaves.');
  }

  let currentLevel = [...leaves];
  const levels: bigint[][] = [currentLevel];

  while (currentLevel.length > 1) {
    if (currentLevel.length % 2 !== 0) {
      throw new Error('Merkle tree level must have an even number of nodes.');
    }

    const nextLevel: bigint[] = [];

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

export async function generateMerkleProof(leaves: bigint[], index: number): Promise<MerkleProof> {
  if (index < 0 || index >= leaves.length) {
    throw new Error('Merkle proof index is out of range.');
  }

  const { root, levels } = await buildMerkleTree(leaves);

  let currentIndex = index;

  const siblings: bigint[] = [];
  const pathIndices: number[] = [];

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

export async function verifyMerkleProof({
  leaf,
  siblings,
  pathIndices,
  expectedRoot,
}: {
  leaf: bigint;
  siblings: bigint[];
  pathIndices: number[];
  expectedRoot: bigint;
}) {
  if (siblings.length !== pathIndices.length) {
    return false;
  }

  let current = leaf;

  for (let i = 0; i < siblings.length; i++) {
    if (pathIndices[i] === 0) {
      current = await hashPair(current, siblings[i]);
    } else {
      current = await hashPair(siblings[i], current);
    }
  }

  return current === expectedRoot;
}
