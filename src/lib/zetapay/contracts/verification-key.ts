import fs from 'node:fs';

type SnarkJsVerificationKey = {
  protocol: string;
  curve: string;
  nPublic: number;
  vk_alpha_1: string[];
  vk_beta_2: string[][];
  vk_gamma_2: string[][];
  vk_delta_2: string[][];
  IC: string[][];
};

export type SorobanVerificationKey = {
  alpha: string;
  beta: string;
  gamma: string;
  delta: string;
  ic: string[];
};

function toHex32(value: string) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function g1ToHex(point: string[]) {
  return `${toHex32(point[0])}${toHex32(point[1])}`;
}

function g2ToHex(point: string[][]) {
  return `${toHex32(point[0][1])}${toHex32(point[0][0])}${toHex32(point[1][1])}${toHex32(point[1][0])}`;
}

export function loadSorobanVerificationKey(filePath: string): SorobanVerificationKey {
  const raw = fs.readFileSync(filePath, 'utf8');
  const key = JSON.parse(raw) as SnarkJsVerificationKey;

  if (key.protocol !== 'groth16') {
    throw new Error(`Unsupported protocol: ${key.protocol}`);
  }

  if (key.curve !== 'bn128') {
    throw new Error(`Unsupported curve: ${key.curve}`);
  }

  if (!Array.isArray(key.IC) || key.IC.length !== key.nPublic + 1) {
    throw new Error('Invalid verification key IC length');
  }

  return {
    alpha: g1ToHex(key.vk_alpha_1),
    beta: g2ToHex(key.vk_beta_2),
    gamma: g2ToHex(key.vk_gamma_2),
    delta: g2ToHex(key.vk_delta_2),
    ic: key.IC.map((point) => g1ToHex(point)),
  };
}
