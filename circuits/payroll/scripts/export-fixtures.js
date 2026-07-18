import fs from 'fs';
import path from 'path';

const root = process.cwd();
const buildDir = path.join(root, 'circuits/payroll/build');

const proof = JSON.parse(fs.readFileSync(path.join(buildDir, 'proof.json'), 'utf8'));
const publicSignals = JSON.parse(fs.readFileSync(path.join(buildDir, 'public.json'), 'utf8'));
const vk = JSON.parse(fs.readFileSync(path.join(buildDir, 'verification_key.json'), 'utf8'));

function fieldBytes(value) {
  const hex = BigInt(value).toString(16).padStart(64, '0');
  return Array.from({ length: 32 }, (_, i) => parseInt(hex.slice(i * 2, i * 2 + 2), 16));
}

function g1(point) {
  return [...fieldBytes(point[0]), ...fieldBytes(point[1])];
}

function g2(point) {
  return [
    ...fieldBytes(point[0][1]),
    ...fieldBytes(point[0][0]),
    ...fieldBytes(point[1][1]),
    ...fieldBytes(point[1][0]),
  ];
}

function rustArray(bytes, perLine = 16) {
  const lines = [];

  for (let i = 0; i < bytes.length; i += perLine) {
    const chunk = bytes.slice(i, i + perLine);
    lines.push('    ' + chunk.map((b) => `0x${b.toString(16).padStart(2, '0')}`).join(', '));
  }

  return lines.join(',\n');
}

function rustMatrix(name, values, size) {
  return `pub const ${name}: [[u8; ${size}]; ${values.length}] = [
${values.map((value) => `    [\n${rustArray(value)}\n    ]`).join(',\n')}
];`;
}

const proofA = g1(proof.pi_a);
const proofB = g2(proof.pi_b);
const proofC = g1(proof.pi_c);

const signals = publicSignals.map(fieldBytes);

const vkAlpha = g1(vk.vk_alpha_1);
const vkBeta = g2(vk.vk_beta_2);
const vkGamma = g2(vk.vk_gamma_2);
const vkDelta = g2(vk.vk_delta_2);
const vkIc = vk.IC.map(g1);

const verifierFixtures = `// AUTO GENERATED from payroll Groth16 artifacts
// Run yarn circuits:fixtures to regenerate
#![allow(dead_code)]
#![allow(clippy::all)]

pub const PROOF_A: [u8; 64] = [
${rustArray(proofA)}
];

pub const PROOF_B: [u8; 128] = [
${rustArray(proofB)}
];

pub const PROOF_C: [u8; 64] = [
${rustArray(proofC)}
];

${rustMatrix('SIGNALS', signals, 32)}

pub const VK_ALPHA: [u8; 64] = [
${rustArray(vkAlpha)}
];

pub const VK_BETA: [u8; 128] = [
${rustArray(vkBeta)}
];

pub const VK_GAMMA: [u8; 128] = [
${rustArray(vkGamma)}
];

pub const VK_DELTA: [u8; 128] = [
${rustArray(vkDelta)}
];

${rustMatrix('VK_IC', vkIc, 64)}
`;

const payrollFixtures = verifierFixtures
  .replaceAll('PROOF_A', 'REAL_PROOF_A')
  .replaceAll('PROOF_B', 'REAL_PROOF_B')
  .replaceAll('PROOF_C', 'REAL_PROOF_C')
  .replaceAll('SIGNALS', 'REAL_SIGNALS')
  .replaceAll('VK_ALPHA', 'REAL_VK_ALPHA')
  .replaceAll('VK_BETA', 'REAL_VK_BETA')
  .replaceAll('VK_GAMMA', 'REAL_VK_GAMMA')
  .replaceAll('VK_DELTA', 'REAL_VK_DELTA')
  .replaceAll('VK_IC', 'REAL_VK_IC');

const verifierFixturesPath = path.join(root, 'contracts/zetapay-verifier/src/fixtures.rs');
const payrollFixturesPath = path.join(root, 'contracts/zetapay-payroll/src/fixtures.rs');

fs.mkdirSync(path.dirname(verifierFixturesPath), { recursive: true });
fs.mkdirSync(path.dirname(payrollFixturesPath), { recursive: true });

fs.writeFileSync(verifierFixturesPath, verifierFixtures);
fs.writeFileSync(payrollFixturesPath, payrollFixtures);

console.log('');
console.log('Exported Rust fixtures');
console.log('Verifier:', verifierFixturesPath);
console.log('Payroll:', payrollFixturesPath);
console.log('Public signals:', signals.length);
console.log('VK IC:', vkIc.length);
console.log('');
