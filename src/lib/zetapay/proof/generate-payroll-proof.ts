import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import type { PayrollBatchCurrency } from '@/lib/zk/payroll-batch';

const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

const PAYROLL_HASH_MODULUS = BigInt('18446744073709551615');
const BATCH_SIZE = 128;

type PayeeType = 'employee' | 'contractor' | 'freelancer' | 'vendor' | 'consultant' | 'contributor';

export type PayrollProofPayee = {
  personId: string;
  employeeId: number;
  walletAddress: string;
  amount: string;
  currency: PayrollBatchCurrency;
  type?: string | null;
};

export type GeneratedPayrollProof = {
  proof: {
    a: string;
    b: string;
    c: string;
  };
  publicInputs: string[];
  proofJson: unknown;
  publicJson: string[];
  inputJson: Record<string, unknown>;
  batchRoot: string;
  batchRootHex: string;
  payrollRunHashHex: string;
  payrollRunHashField: string;
  periodId: string;
  batchIndex: number;
  batchCount: number;
  commitments: string[];
  totals: {
    totalAmount: string;
    totalXlm: string;
    totalUsdc: string;
    totalGrossDisplay: number;
    totalXlmDisplay: number;
    totalUsdcDisplay: number;
  };
};

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashToField(...values: string[]) {
  const hash = sha256Hex(values.join(':'));
  return (BigInt(`0x${hash}`) % FIELD_MODULUS).toString();
}

function toHex32(value: string | bigint | number) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function g1ToHex(point: string[]) {
  return `${toHex32(point[0])}${toHex32(point[1])}`;
}

function g2ToHex(point: string[][]) {
  return `${toHex32(point[0][1])}${toHex32(point[0][0])}${toHex32(point[1][1])}${toHex32(
    point[1][0]
  )}`;
}

function toMinorUnits(amount: string) {
  return Math.round(Number(amount) * 10_000_000);
}

function padArray<T>(values: T[], padValue: T) {
  if (values.length > BATCH_SIZE) {
    throw new Error(`Batch has ${values.length} payees, but max is ${BATCH_SIZE}`);
  }

  return [...values, ...Array.from({ length: BATCH_SIZE - values.length }, () => padValue)];
}

function tokenType(currency: PayrollBatchCurrency) {
  return currency === 'XLM' ? 0 : 1;
}

function payeeType(type?: string | null) {
  const normalized = (type || 'employee').toLowerCase() as PayeeType;

  const map: Record<PayeeType, number> = {
    employee: 0,
    contractor: 1,
    freelancer: 2,
    vendor: 3,
    consultant: 4,
    contributor: 5,
  };

  return map[normalized] ?? 0;
}

function contractPayeeType(type?: string | null) {
  const normalized = (type || 'employee').toLowerCase();

  if (normalized === 'contractor') return 'Contractor';
  if (normalized === 'freelancer') return 'Freelancer';
  if (normalized === 'vendor') return 'Vendor';
  if (normalized === 'consultant') return 'Consultant';
  if (normalized === 'contributor') return 'Contributor';

  return 'Employee';
}

function normalizedPayeeType(type?: string | null): PayeeType {
  const normalized = (type || 'employee').toLowerCase();

  if (
    normalized === 'contractor' ||
    normalized === 'freelancer' ||
    normalized === 'vendor' ||
    normalized === 'consultant' ||
    normalized === 'contributor'
  ) {
    return normalized;
  }

  return 'employee';
}

function periodIdFromDate(periodStart: string) {
  const date = new Date(periodStart);

  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid payroll period start date');
  }

  return `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function buildPayrollRunHashes({
  enterpriseId,
  periodStart,
  periodEnd,
  auditKey,
}: {
  enterpriseId: number;
  periodStart: string;
  periodEnd: string;
  auditKey: string;
}) {
  const seed = `${enterpriseId}:${periodStart}:${periodEnd}:${auditKey}`;
  const payrollRunHashHex = sha256Hex(seed);
  const payrollRunHashField = (BigInt(`0x${payrollRunHashHex}`) % PAYROLL_HASH_MODULUS).toString();

  return {
    payrollRunHashHex,
    payrollRunHashField,
  };
}

async function loadMerkleHelpers() {
  const modulePath = path.join(process.cwd(), 'circuits/payroll/scripts/merkle.js');
  const moduleUrl = pathToFileURL(modulePath).href;

  const dynamicImport = new Function('moduleUrl', 'return import(moduleUrl);') as (
    moduleUrl: string
  ) => Promise<{
    poseidonHash: (values: bigint[]) => Promise<bigint>;
    buildMerkleTree: (values: string[]) => Promise<{ root: bigint }>;
  }>;

  return dynamicImport(moduleUrl);
}

export async function generatePayrollProof({
  enterpriseId,
  periodStart,
  periodEnd,
  auditKey,
  payees,
}: {
  enterpriseId: number;
  periodStart: string;
  periodEnd: string;
  auditKey: string;
  payees: PayrollProofPayee[];
}): Promise<GeneratedPayrollProof> {
  if (payees.length === 0) {
    throw new Error('At least one payee is required');
  }

  if (payees.length > BATCH_SIZE) {
    throw new Error(`This endpoint currently supports ${BATCH_SIZE} payees`);
  }

  const { poseidonHash, buildMerkleTree } = await loadMerkleHelpers();

  const periodId = periodIdFromDate(periodStart);
  const batchIndex = '0';
  const batchCount = '1';

  const { payrollRunHashHex, payrollRunHashField } = buildPayrollRunHashes({
    enterpriseId,
    periodStart,
    periodEnd,
    auditKey,
  });

  const activeRows = payees.map((payee) => {
    const amountMinor = toMinorUnits(payee.amount);
    const normalizedType = normalizedPayeeType(payee.type);

    return {
      payeeId: payee.employeeId,
      recipientHash: hashToField(payee.walletAddress),
      amount: amountMinor,
      salt: hashToField(crypto.randomBytes(32).toString('hex'), String(payee.employeeId)),
      payeeType: payeeType(normalizedType),
      tokenType: tokenType(payee.currency),
      token: payee.currency,
      recipient: payee.walletAddress,
      contractPayeeType: contractPayeeType(normalizedType),
      normalizedType,
      displayAmount: Number(payee.amount),
    };
  });

  const payeeIds = padArray(
    activeRows.map((row) => row.payeeId.toString()),
    '0'
  );

  const recipientHashes = padArray(
    activeRows.map((row) => row.recipientHash),
    '0'
  );

  const amounts = padArray(
    activeRows.map((row) => row.amount.toString()),
    '0'
  );

  const salts = padArray(
    activeRows.map((row) => row.salt),
    '0'
  );

  const payeeTypes = padArray(
    activeRows.map((row) => row.payeeType.toString()),
    '0'
  );

  const tokenTypes = padArray(
    activeRows.map((row) => row.tokenType.toString()),
    '0'
  );

  const commitments: string[] = [];

  for (let index = 0; index < BATCH_SIZE; index += 1) {
    if (Number(amounts[index]) === 0) {
      commitments.push('0');
      continue;
    }

    const commitment = await poseidonHash([
      BigInt(payeeIds[index]),
      BigInt(recipientHashes[index]),
      BigInt(amounts[index]),
      BigInt(payeeTypes[index]),
      BigInt(tokenTypes[index]),
      BigInt(periodId),
      BigInt(salts[index]),
    ]);

    commitments.push(commitment.toString());
  }

  const tree = await buildMerkleTree(commitments);
  const batchRoot = tree.root.toString();

  const totalXlm = activeRows
    .filter((row) => row.token === 'XLM')
    .reduce((sum, row) => sum + row.amount, 0);

  const totalUsdc = activeRows
    .filter((row) => row.token === 'USDC')
    .reduce((sum, row) => sum + row.amount, 0);

  const totalAmount = totalXlm + totalUsdc;

  const totalsByType: Record<PayeeType, number> = {
    employee: 0,
    contractor: 0,
    freelancer: 0,
    vendor: 0,
    consultant: 0,
    contributor: 0,
  };

  const countsByType: Record<PayeeType, number> = {
    employee: 0,
    contractor: 0,
    freelancer: 0,
    vendor: 0,
    consultant: 0,
    contributor: 0,
  };

  for (const row of activeRows) {
    totalsByType[row.normalizedType] += row.amount;
    countsByType[row.normalizedType] += 1;
  }

  const inputJson = {
    payee_ids: payeeIds,
    recipient_hashes: recipientHashes,
    amounts,
    salts,
    payee_types: payeeTypes,
    token_types: tokenTypes,
    commitments,

    batch_root_public: batchRoot,
    total_amount: totalAmount.toString(),
    total_xlm: totalXlm.toString(),
    total_usdc: totalUsdc.toString(),

    employee_total: totalsByType.employee.toString(),
    contractor_total: totalsByType.contractor.toString(),
    freelancer_total: totalsByType.freelancer.toString(),
    vendor_total: totalsByType.vendor.toString(),
    consultant_total: totalsByType.consultant.toString(),
    contributor_total: totalsByType.contributor.toString(),

    employee_count: countsByType.employee.toString(),
    contractor_count: countsByType.contractor.toString(),
    freelancer_count: countsByType.freelancer.toString(),
    vendor_count: countsByType.vendor.toString(),
    consultant_count: countsByType.consultant.toString(),
    contributor_count: countsByType.contributor.toString(),

    period_id: periodId,
    payroll_run_hash: payrollRunHashField,
    batch_index: batchIndex,
    batch_count: batchCount,

    period_id_public: periodId,
    payroll_run_hash_public: payrollRunHashField,
    batch_index_public: batchIndex,
    batch_count_public: batchCount,

    payee_count_total: activeRows.length.toString(),
  };

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay-proof-'));
  const inputPath = path.join(tempDir, 'input.json');
  const witnessPath = path.join(tempDir, 'witness.wtns');
  const proofPath = path.join(tempDir, 'proof.json');
  const publicPath = path.join(tempDir, 'public.json');

  fs.writeFileSync(inputPath, JSON.stringify(inputJson, null, 2));

  try {
    execFileSync(
      'node',
      [
        'circuits/payroll/build/payroll_js/generate_witness.js',
        'circuits/payroll/build/payroll_js/payroll.wasm',
        inputPath,
        witnessPath,
      ],
      { cwd: process.cwd(), stdio: 'inherit' }
    );

    execFileSync(
      'npx',
      [
        'snarkjs',
        'groth16',
        'prove',
        'circuits/payroll/build/payroll_final.zkey',
        witnessPath,
        proofPath,
        publicPath,
      ],
      { cwd: process.cwd(), stdio: 'inherit' }
    );

    const proofJson = JSON.parse(fs.readFileSync(proofPath, 'utf8')) as {
      pi_a: string[];
      pi_b: string[][];
      pi_c: string[];
    };

    const publicJson = JSON.parse(fs.readFileSync(publicPath, 'utf8')) as string[];

    return {
      proof: {
        a: g1ToHex(proofJson.pi_a),
        b: g2ToHex(proofJson.pi_b),
        c: g1ToHex(proofJson.pi_c),
      },
      publicInputs: publicJson,
      proofJson,
      publicJson,
      inputJson,
      batchRoot,
      batchRootHex: toHex32(batchRoot),
      payrollRunHashHex,
      payrollRunHashField,
      periodId,
      batchIndex: Number(batchIndex),
      batchCount: Number(batchCount),
      commitments,
      totals: {
        totalAmount: totalAmount.toString(),
        totalXlm: totalXlm.toString(),
        totalUsdc: totalUsdc.toString(),
        totalGrossDisplay: activeRows.reduce((sum, row) => sum + row.displayAmount, 0),
        totalXlmDisplay: activeRows
          .filter((row) => row.token === 'XLM')
          .reduce((sum, row) => sum + row.displayAmount, 0),
        totalUsdcDisplay: activeRows
          .filter((row) => row.token === 'USDC')
          .reduce((sum, row) => sum + row.displayAmount, 0),
      },
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}
