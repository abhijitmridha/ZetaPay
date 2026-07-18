import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  Address,
  Contract,
  nativeToScVal,
  Networks,
  scValToNative,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import { Server as StellarRpcServer } from '@stellar/stellar-sdk/rpc';

import { zetapayConfig, validateConfig } from './config';
import { loadSorobanVerificationKey } from './verification-key';

const CONTRACT_FEE = '100000';
const TX_TIMEOUT_SECONDS = 300;

export type SorobanPayrollPayment = {
  payee_id: number;
  recipient: string;
  amount: string;
  token: 'XLM' | 'USDC';
  payee_type: 'Employee' | 'Contractor' | 'Freelancer' | 'Vendor' | 'Consultant' | 'Contributor';
};

export type BuildInitializePayrollInput = {
  employer: string;
  verificationKeyPath?: string;
};

export type SubmitPayrollBatchInput = {
  employer: string;
  payments: SorobanPayrollPayment[];
  proof: {
    a: string;
    b: string;
    c: string;
  };
  publicInputs: string[];
  payrollRunHashHex: string;
  payrollRunHashField: string;
  periodId: string;
  batchIndex: number;
  batchCount: number;
  commitmentRootHex: string;
  encryptedPayroll: string;
  encryptedNotes: string[];
};

export type NormalizedChainPayrollRecord = {
  batch: {
    payrollRunHash: string;
    proofHash: string;
    commitmentRoot: string;
    encryptedPayroll: string;
    encryptedNotes: string[];
    period_id: number | bigint;
    batch_index: number;
    batch_count: number;
    payment_count: number;
    total_amount: number | bigint;
    total_xlm: number | bigint;
    total_usdc: number | bigint;
    is_executed: boolean;
  };
};

function log(label: string, value?: unknown) {
  if (value === undefined) {
    console.log(`[zetapay] ${label}`);
    return;
  }

  console.log(`[zetapay] ${label}`, value);
}

function network() {
  return process.env.NEXT_PUBLIC_STELLAR_NETWORK || 'testnet';
}

function networkPassphrase() {
  return network() === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseTransactionXdr(xdr: string) {
  const parsed = TransactionBuilder.fromXDR(xdr.trim(), networkPassphrase());

  if (!(parsed instanceof Transaction)) {
    throw new Error('Fee bump transaction XDR is not supported in this payroll flow.');
  }

  return parsed;
}

function runStellar(args: string[]) {
  log('stellar command', `stellar ${args.join(' ')}`);

  const result = spawnSync('stellar', args, {
    cwd: process.cwd(),
    encoding: 'utf8',
  });

  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();

  if (result.status !== 0) {
    log('stellar command failed', output);
    throw new Error(output || 'Stellar command failed');
  }

  return output;
}

function extractTransactionXdr(output: string) {
  const lines = output
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const candidates = lines.filter((line) => /^[A-Za-z0-9+/=]+$/.test(line) && line.length > 100);

  for (let index = candidates.length - 1; index >= 0; index -= 1) {
    const candidate = candidates[index];

    try {
      parseTransactionXdr(candidate);
      return candidate;
    } catch {
      continue;
    }
  }

  throw new Error(`Could not find valid transaction XDR in Stellar CLI output:\n${output}`);
}

function addTimeoutToBuiltTransaction(rawXdr: string) {
  const transaction = parseTransactionXdr(rawXdr);
  const maxTime = Math.floor(Date.now() / 1000) + TX_TIMEOUT_SECONDS;

  return TransactionBuilder.cloneFrom(transaction, {
    fee: CONTRACT_FEE,
    networkPassphrase: networkPassphrase(),
    timebounds: {
      minTime: 0,
      maxTime,
    },
  }).build();
}

async function prepareBuiltXdr(rawXdr: string) {
  validateConfig();

  const server = new StellarRpcServer(zetapayConfig.rpcUrl);
  const transactionWithTimeout = addTimeoutToBuiltTransaction(rawXdr);
  const prepared = await server.prepareTransaction(transactionWithTimeout);

  return prepared.toXDR();
}

async function runStellarBuildOnly(args: string[]) {
  const rawXdr = extractTransactionXdr(runStellar(args));
  return await prepareBuiltXdr(rawXdr);
}

function parseCliJson(output: string) {
  const lines = output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    if (line === 'true') return true;
    if (line === 'false') return false;
    if (line === 'None' || line === 'null') return null;

    if (/^\d+$/.test(line)) return Number(line);

    try {
      return JSON.parse(line);
    } catch {
      continue;
    }
  }

  throw new Error(`Could not parse Stellar CLI output:\n${output}`);
}

function runStellarRead(args: string[]) {
  return parseCliJson(
    runStellar([
      'contract',
      'invoke',
      '--id',
      zetapayConfig.payrollContractId,
      '--source-account',
      args[0],
      '--network',
      network(),
      '--',
      ...args.slice(1),
    ])
  );
}

function writeJsonTempFile(tempDir: string, name: string, value: unknown) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

function stringToBytesHex(value: string) {
  return Buffer.from(value, 'utf8').toString('hex');
}

function bytesToUtf8(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('utf8');
  if (Buffer.isBuffer(value)) return value.toString('utf8');

  return Buffer.from(String(value), 'hex').toString('utf8');
}

function bytesToHex(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Uint8Array) return Buffer.from(value).toString('hex');
  if (Buffer.isBuffer(value)) return value.toString('hex');

  return String(value);
}

function normalizeReturnValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function normalizeChainRecord(value: unknown): NormalizedChainPayrollRecord {
  const record = value as {
    batch: {
      payroll_run_hash: unknown;
      period_id: number | bigint;
      batch_index: number;
      batch_count: number;
      proof_hash: unknown;
      commitment_root: number | bigint | string;
      payment_count: number;
      total_amount: number | bigint;
      total_xlm: number | bigint;
      total_usdc: number | bigint;
      encrypted_payroll: unknown;
      encrypted_notes: unknown[];
      is_executed: boolean;
    };
  };

  if (!record?.batch) {
    throw new Error('Invalid Soroban payroll record shape.');
  }

  return {
    batch: {
      period_id: record.batch.period_id,
      batch_index: record.batch.batch_index,
      batch_count: record.batch.batch_count,
      payment_count: record.batch.payment_count,
      total_amount: record.batch.total_amount,
      total_xlm: record.batch.total_xlm,
      total_usdc: record.batch.total_usdc,
      is_executed: record.batch.is_executed,
      payrollRunHash: bytesToHex(record.batch.payroll_run_hash),
      proofHash: bytesToHex(record.batch.proof_hash),
      commitmentRoot: String(record.batch.commitment_root),
      encryptedPayroll: bytesToUtf8(record.batch.encrypted_payroll),
      encryptedNotes: record.batch.encrypted_notes.map(bytesToUtf8),
    },
  };
}

export async function isPayrollContractInitialized(input: { source: string }) {
  try {
    const value = runStellarRead([input.source, 'is_initialized']);
    return Boolean(value);
  } catch {
    return false;
  }
}

export async function buildInitializePayrollXdr(input: BuildInitializePayrollInput) {
  validateConfig();

  const verificationKeyPath =
    input.verificationKeyPath ||
    path.join(process.cwd(), 'circuits/payroll/build/verification_key.json');

  const verificationKey = loadSorobanVerificationKey(verificationKeyPath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay-init-xdr-'));

  try {
    const vkFilePath = writeJsonTempFile(tempDir, 'verification-key.json', verificationKey);

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.payrollContractId,
      '--source-account',
      input.employer,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'initialize',
      '--employer',
      input.employer,
      '--verifier',
      zetapayConfig.verifierContractId,
      '--xlm_token',
      zetapayConfig.xlmTokenContract,
      '--usdc_token',
      zetapayConfig.usdcTokenContract,
      '--vk-file-path',
      vkFilePath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function buildSubmitAndExecutePayrollBatchXdr(input: SubmitPayrollBatchInput) {
  validateConfig();

  if (!input.encryptedPayroll) {
    throw new Error('encryptedPayroll is required');
  }

  if (!Array.isArray(input.encryptedNotes) || input.encryptedNotes.length === 0) {
    throw new Error('encryptedNotes are required');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay-submit-execute-xdr-'));

  try {
    const paymentsPath = writeJsonTempFile(tempDir, 'payments.json', input.payments);
    const proofPath = writeJsonTempFile(tempDir, 'proof.json', input.proof);
    const publicInputsPath = writeJsonTempFile(tempDir, 'public-inputs.json', input.publicInputs);
    const encryptedNotesPath = writeJsonTempFile(
      tempDir,
      'encrypted-notes.json',
      input.encryptedNotes.map(stringToBytesHex)
    );

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.payrollContractId,
      '--source-account',
      input.employer,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'submit_and_execute_batch',
      '--employer',
      input.employer,
      '--payments-file-path',
      paymentsPath,
      '--proof-file-path',
      proofPath,
      '--public_inputs-file-path',
      publicInputsPath,
      '--payroll_run_hash',
      input.payrollRunHashHex,
      '--payroll_run_hash_field',
      input.payrollRunHashField,
      '--period_id',
      input.periodId,
      '--batch_index',
      String(input.batchIndex),
      '--batch_count',
      String(input.batchCount),
      '--commitment_root',
      input.commitmentRootHex,
      '--encrypted_payroll',
      stringToBytesHex(input.encryptedPayroll),
      '--encrypted_notes-file-path',
      encryptedNotesPath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function getPayrollRecordFromChain(input: { employer: string; batchId: number }) {
  validateConfig();

  const server = new StellarRpcServer(zetapayConfig.rpcUrl);
  const account = await server.getAccount(input.employer);
  const contract = new Contract(zetapayConfig.payrollContractId);

  const operation = contract.call(
    'get_payroll_record',
    new Address(input.employer).toScVal(),
    nativeToScVal(input.batchId, { type: 'u64' })
  );

  const transaction = new TransactionBuilder(account, {
    fee: CONTRACT_FEE,
    networkPassphrase: networkPassphrase(),
  })
    .addOperation(operation)
    .setTimeout(TX_TIMEOUT_SECONDS)
    .build();

  const simulated = await server.simulateTransaction(transaction);

  if (!('result' in simulated) || !simulated.result?.retval) {
    throw new Error('Could not read payroll record from Soroban.');
  }

  return normalizeChainRecord(scValToNative(simulated.result.retval));
}

export async function sendSignedXdr(signedXdr: string) {
  validateConfig();

  const cleanSignedXdr = signedXdr.trim();
  const transaction = parseTransactionXdr(cleanSignedXdr);
  const server = new StellarRpcServer(zetapayConfig.rpcUrl);

  const sendResponse = await server.sendTransaction(transaction);

  if (sendResponse.status === 'ERROR') {
    throw new Error(JSON.stringify(sendResponse));
  }

  const txHash = sendResponse.hash;

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const result = await server.getTransaction(txHash);

    if (result.status === 'SUCCESS') {
      const nativeReturnValue = result.returnValue ? scValToNative(result.returnValue) : null;

      return {
        txHash,
        rawOutput: JSON.stringify(result),
        returnValue: normalizeReturnValue(nativeReturnValue),
      };
    }

    if (result.status === 'FAILED') {
      throw new Error(JSON.stringify(result));
    }

    await sleep(1000);
  }

  throw new Error(`Transaction was not confirmed: ${txHash}`);
}

export function toSorobanPayrollPayment(input: {
  payeeId: number;
  recipient: string;
  amount: string;
  currency: 'XLM' | 'USDC';
  payeeType?: string | null;
}): SorobanPayrollPayment {
  const normalized = (input.payeeType || 'employee').toLowerCase();

  const payeeType: SorobanPayrollPayment['payee_type'] =
    normalized === 'contractor'
      ? 'Contractor'
      : normalized === 'freelancer'
        ? 'Freelancer'
        : normalized === 'vendor'
          ? 'Vendor'
          : normalized === 'consultant'
            ? 'Consultant'
            : normalized === 'contributor'
              ? 'Contributor'
              : 'Employee';

  return {
    payee_id: input.payeeId,
    recipient: input.recipient,
    amount: input.amount,
    token: input.currency,
    payee_type: payeeType,
  };
}
