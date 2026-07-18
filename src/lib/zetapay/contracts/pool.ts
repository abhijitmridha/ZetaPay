import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { Networks, scValToNative, Transaction, TransactionBuilder } from '@stellar/stellar-sdk';
import { Server as StellarRpcServer } from '@stellar/stellar-sdk/rpc';

import { zetapayConfig, validateConfig } from './config';
import { loadSorobanVerificationKey, SorobanVerificationKey } from './verification-key';
import {
  BuildInitializeShieldedPoolInput,
  DepositNoteInput,
  DepositNotesInput,
  FundPayrollInput,
  PostRootInput,
  RegisterTokenInput,
  ShieldedNote,
  ShieldedPoolStats,
  ShieldedWithdrawal,
  WithdrawWithProofInput,
} from './types';

const CONTRACT_FEE = '100000';
const TX_TIMEOUT_SECONDS = 300;

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

function parseTransactionXdr(xdrString: string) {
  const parsed = TransactionBuilder.fromXDR(xdrString.trim(), networkPassphrase());

  if (!(parsed instanceof Transaction)) {
    throw new Error('Fee bump transaction XDR is not supported in this pool flow.');
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

function writeJsonTempFile(tempDir: string, name: string, value: unknown) {
  const filePath = path.join(tempDir, name);
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2));
  return filePath;
}

function parseSorobanStruct(value: string) {
  const record: Record<string, unknown> = {};
  const body = value.trim().replace(/^\{/, '').replace(/\}$/, '');

  for (const part of body.split(',')) {
    const separatorIndex = part.indexOf(':');
    if (separatorIndex < 0) continue;

    const rawKey = part.slice(0, separatorIndex).trim();
    const rawValue = part.slice(separatorIndex + 1).trim();

    const key = rawKey.replace(/^"|"$/g, '');
    const cleanValue = rawValue.replace(/^"|"$/g, '');

    record[key] = /^\d+$/.test(cleanValue) ? Number(cleanValue) : cleanValue;
  }

  return record;
}

function unwrapOkValue(value: string) {
  const trimmed = value.trim();

  if (trimmed.startsWith('Ok(') && trimmed.endsWith(')')) {
    return trimmed.slice(3, -1).trim();
  }

  return trimmed;
}

function parseCliJson(output: string) {
  const lines = output
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  for (const line of lines) {
    const trimmed = unwrapOkValue(line);

    if (trimmed === 'true') return true;
    if (trimmed === 'false') return false;
    if (trimmed === 'None') return null;
    if (trimmed === 'null') return null;

    if (/^\d+$/.test(trimmed)) return Number(trimmed);

    try {
      return JSON.parse(trimmed);
    } catch {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        return parseSorobanStruct(trimmed);
      }
    }
  }

  const full = output.trim();
  const jsonStart = full.indexOf('{');
  const jsonEnd = full.indexOf('\n', jsonStart);

  if (jsonStart >= 0) {
    const candidate = full.slice(jsonStart, jsonEnd > jsonStart ? jsonEnd : undefined).trim();

    try {
      return JSON.parse(candidate);
    } catch {
      return parseSorobanStruct(candidate);
    }
  }

  throw new Error(`Could not parse Stellar CLI JSON output:\n${output}`);
}

function runStellarRead(args: string[]) {
  return parseCliJson(
    runStellar([
      'contract',
      'invoke',
      '--id',
      zetapayConfig.poolContractId,
      '--source-account',
      args[0],
      '--network',
      network(),
      '--',
      ...args.slice(1),
    ])
  );
}

function normalizeReturnValue(value: unknown) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'bigint') return Number(value);
  if (typeof value === 'number') return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function normalizeScalar(value: unknown) {
  if (value === null || value === undefined) return '';

  if (typeof value === 'object' && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;

    if ('value' in record) return String(record.value);
    if ('lo' in record) return String(record.lo);
  }

  return String(value);
}

function normalizeNote(value: unknown): ShieldedNote {
  const record = value as {
    depositor: string;
    token: string;
    amount: number | bigint;
    commitment: unknown;
    created_at_ledger: number | bigint;
    withdrawn: boolean;
  };

  if (!record) {
    throw new Error('Invalid shielded note shape.');
  }

  return {
    depositor: record.depositor,
    token: record.token,
    amount: record.amount,
    commitment: normalizeScalar(record.commitment),
    createdAtLedger: record.created_at_ledger,
    withdrawn: record.withdrawn,
  };
}

function normalizeWithdrawal(value: unknown): ShieldedWithdrawal {
  const record = value as {
    token: string;
    amount: number | bigint;
    recipient: string;
    commitment: unknown;
    root: unknown;
    nullifier_hash: unknown;
    withdrawal_hash: unknown;
    withdrawn_at_ledger: number | bigint;
  };

  if (!record) {
    throw new Error('Invalid withdrawal shape.');
  }

  return {
    token: record.token,
    amount: record.amount,
    recipient: record.recipient,
    commitment: normalizeScalar(record.commitment),
    root: normalizeScalar(record.root),
    nullifierHash: normalizeScalar(record.nullifier_hash),
    withdrawalHash: normalizeScalar(record.withdrawal_hash),
    withdrawnAtLedger: record.withdrawn_at_ledger,
  };
}

function normalizeStats(value: unknown): ShieldedPoolStats {
  const stats = value as {
    deposit_count?: number | bigint;
    withdrawal_count?: number | bigint;
    depositCount?: number | bigint;
    withdrawalCount?: number | bigint;
  };

  if (!stats) {
    throw new Error('Invalid pool stats shape.');
  }

  const depositCount = stats.deposit_count ?? stats.depositCount;
  const withdrawalCount = stats.withdrawal_count ?? stats.withdrawalCount;

  if (depositCount === undefined || withdrawalCount === undefined) {
    throw new Error('Invalid pool stats shape.');
  }

  return {
    depositCount,
    withdrawalCount,
  };
}

export async function buildInitializeShieldedPoolXdr(input: BuildInitializeShieldedPoolInput) {
  validateConfig();

  const verificationKeyPath =
    input.verificationKeyPath ||
    path.join(process.cwd(), 'circuits/pool/build/withdraw_verification_key.json');

  const verificationKey: SorobanVerificationKey = loadSorobanVerificationKey(verificationKeyPath);
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay_pool_init_xdr_'));

  try {
    const verificationKeyFilePath = writeJsonTempFile(
      tempDir,
      'verification_key.json',
      verificationKey
    );

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.poolContractId,
      '--source-account',
      input.admin,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'initialize',
      '--admin',
      input.admin,
      '--verifier',
      zetapayConfig.verifierContractId,
      '--verification_key-file-path',
      verificationKeyFilePath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function buildRegisterTokenXdr(input: RegisterTokenInput) {
  validateConfig();

  return await runStellarBuildOnly([
    'contract',
    'invoke',
    '--build-only',
    '--id',
    zetapayConfig.poolContractId,
    '--source-account',
    input.admin,
    '--network',
    network(),
    '--fee',
    CONTRACT_FEE,
    '--',
    'register_token',
    '--admin',
    input.admin,
    '--token',
    input.token,
  ]);
}

export async function buildPostRootXdr(input: PostRootInput) {
  validateConfig();

  return await runStellarBuildOnly([
    'contract',
    'invoke',
    '--build-only',
    '--id',
    zetapayConfig.poolContractId,
    '--source-account',
    input.admin,
    '--network',
    network(),
    '--fee',
    CONTRACT_FEE,
    '--',
    'post_root',
    '--admin',
    input.admin,
    '--root',
    input.root,
  ]);
}

export async function buildDepositNoteXdr(input: DepositNoteInput) {
  validateConfig();

  return await runStellarBuildOnly([
    'contract',
    'invoke',
    '--build-only',
    '--id',
    zetapayConfig.poolContractId,
    '--source-account',
    input.depositor,
    '--network',
    network(),
    '--fee',
    CONTRACT_FEE,
    '--',
    'deposit_note',
    '--depositor',
    input.depositor,
    '--token',
    input.token,
    '--amount',
    input.amount,
    '--commitment',
    input.commitment,
  ]);
}

export async function buildDepositNotesXdr(input: DepositNotesInput) {
  validateConfig();

  if (!input.deposits.length) {
    throw new Error('At least one pool deposit note is required.');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay_pool_deposit_notes_xdr_'));

  try {
    const depositsFilePath = writeJsonTempFile(
      tempDir,
      'deposits.json',
      input.deposits.map((deposit) => ({
        token: deposit.token,
        amount: deposit.amount,
        commitment: deposit.commitment,
      }))
    );

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.poolContractId,
      '--source-account',
      input.depositor,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'deposit_notes',
      '--depositor',
      input.depositor,
      '--deposits-file-path',
      depositsFilePath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function buildFundPayrollXdr(input: FundPayrollInput) {
  validateConfig();

  if (!input.deposits.length) {
    throw new Error('At least one pool deposit note is required.');
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay_pool_fund_payroll_xdr_'));

  try {
    const depositsFilePath = writeJsonTempFile(
      tempDir,
      'deposits.json',
      input.deposits.map((deposit) => ({
        token: deposit.token,
        amount: deposit.amount,
        commitment: deposit.commitment,
      }))
    );

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.poolContractId,
      '--source-account',
      input.admin,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'fund_payroll',
      '--admin',
      input.admin,
      '--root',
      input.root,
      '--deposits-file-path',
      depositsFilePath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

function fieldToBytes32Hex(value: string) {
  return BigInt(value).toString(16).padStart(64, '0');
}

function normalizeBytesHex(value: string) {
  return value.startsWith('0x') ? value.slice(2) : value;
}

function normalizeGroth16ProofForSoroban(proof: unknown) {
  const value = proof as {
    pi_a?: string[];
    pi_b?: string[][];
    pi_c?: string[];
    a?: string;
    b?: string;
    c?: string;
  };

  if (value.a && value.b && value.c) {
    return {
      a: normalizeBytesHex(value.a),
      b: normalizeBytesHex(value.b),
      c: normalizeBytesHex(value.c),
    };
  }

  if (!value.pi_a || !value.pi_b || !value.pi_c) {
    throw new Error('Invalid Groth16 proof format.');
  }

  return {
    a: normalizeBytesHex(fieldToBytes32Hex(value.pi_a[0]) + fieldToBytes32Hex(value.pi_a[1])),
    b: normalizeBytesHex(
      fieldToBytes32Hex(value.pi_b[0][1]) +
        fieldToBytes32Hex(value.pi_b[0][0]) +
        fieldToBytes32Hex(value.pi_b[1][1]) +
        fieldToBytes32Hex(value.pi_b[1][0])
    ),
    c: normalizeBytesHex(fieldToBytes32Hex(value.pi_c[0]) + fieldToBytes32Hex(value.pi_c[1])),
  };
}

export async function buildWithdrawWithProofXdr(input: WithdrawWithProofInput) {
  validateConfig();

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zetapay_pool_withdraw_xdr_'));

  try {
    const proofPath = writeJsonTempFile(
      tempDir,
      'proof.json',
      normalizeGroth16ProofForSoroban(input.proof)
    );
    const publicInputsPath = writeJsonTempFile(tempDir, 'public_inputs.json', input.publicInputs);

    return await runStellarBuildOnly([
      'contract',
      'invoke',
      '--build-only',
      '--id',
      zetapayConfig.poolContractId,
      '--source-account',
      input.recipient,
      '--network',
      network(),
      '--fee',
      CONTRACT_FEE,
      '--',
      'withdraw_with_proof',
      '--recipient',
      input.recipient,
      '--token',
      input.token,
      '--amount',
      input.amount,
      '--commitment',
      input.commitment,
      '--root',
      input.root,
      '--nullifier_hash',
      input.nullifierHash,
      '--recipient_hash',
      input.recipientHash,
      '--token_hash',
      input.tokenHash,
      '--withdrawal_hash',
      input.withdrawalHash,
      '--proof-file-path',
      proofPath,
      '--public_inputs-file-path',
      publicInputsPath,
    ]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

export async function getNote(input: { source: string; commitment: string }) {
  const value = runStellarRead([input.source, 'get_note', '--commitment', input.commitment]);

  return normalizeNote(value);
}

export async function getWithdrawal(input: { source: string; nullifierHash: string }) {
  const value = runStellarRead([
    input.source,
    'get_withdrawal',
    '--nullifier_hash',
    input.nullifierHash,
  ]);

  if (!value) return null;

  return normalizeWithdrawal(value);
}

export async function isNullifierSpent(input: { source: string; nullifierHash: string }) {
  const value = runStellarRead([
    input.source,
    'is_nullifier_spent',
    '--nullifier_hash',
    input.nullifierHash,
  ]);

  return Boolean(value);
}

export async function getStats(input: { source: string }) {
  const value = runStellarRead([input.source, 'get_stats']);

  return normalizeStats(value);
}

export async function isPoolContractInitialized(input: { source: string }) {
  const value = runStellarRead([input.source, 'is_initialized']);

  return Boolean(value);
}

export async function isTokenRegistered(input: { source: string; token: string }) {
  const value = runStellarRead([input.source, 'is_token_registered', '--token', input.token]);

  return Boolean(value);
}

export async function isRootAccepted(input: { source: string; root: string }) {
  const value = runStellarRead([input.source, 'is_root_accepted', '--root', input.root]);

  return Boolean(value);
}

export async function sendSignedPoolXdr(signedXdr: string) {
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
