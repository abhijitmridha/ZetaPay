import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, enterprises, payrollEmployees, payrollRuns } from '@/lib/db/schema';
import { BATCH_SIZE } from '@/lib/zk/payroll-batch';
import { encryptPayload } from '@/lib/security/tokenVault';
import {
  buildFundPayrollXdr,
  buildInitializeShieldedPoolXdr,
  buildRegisterTokenXdr,
  getNote,
  isPoolContractInitialized,
  isTokenRegistered,
  sendSignedPoolXdr,
} from '@/lib/zetapay/contracts/pool';
import { zetapayConfig } from '@/lib/zetapay/contracts/config';

export const runtime = 'nodejs';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type PayrollCurrency = 'XLM' | 'USDC';

type PoolPayrollRequest = {
  action?: 'prepare' | 'submitSigned';
  walletAddress?: string;
  periodStart?: string;
  periodEnd?: string;
  payrollMode?: 'shielded_pool';
  items?: {
    personId: string;
    amount: string;
    currency: PayrollCurrency;
  }[];
  payrollRunId?: number;
  signedXdr?: string;
};

type PoolNotePayload = {
  employeeId: number;
  personId: string;
  walletAddress: string;
  amount: string;
  employeeTotalAmount: string;
  atomicAmount: string;
  currency: PayrollCurrency;
  token: string;
  tokenHash: string;
  secret: string;
  nullifier: string;
  nullifierHash: string;
  salt: string;
  commitment: string;
  recipientHash: string;
  withdrawalHash: string;
  payeeIndex: number;
  employeeNoteIndex: number;
  denomination: string;
  proof: JsonValue;
  publicInputs: JsonValue[];
};

type PoolNoteDraft = Omit<PoolNotePayload, 'proof' | 'publicInputs'> & {
  proof?: JsonValue;
  publicInputs?: JsonValue[];
};

type StoredPoolPayload = {
  root: string;
  notes: PoolNotePayload[];
  encryptedPayroll: string;
  encryptedNotes: string[];
  totals: {
    xlm: number;
    usdc: number;
    gross: number;
  };
  denominationPolicy: {
    enabled: true;
    atomicScale: number;
    xlm: string[];
    usdc: string[];
  };
};

const FIELD_MODULUS = BigInt(
  '21888242871839275222246405745257275088548364400416034343698204186575808495617'
);

const ATOMIC_SCALE = BigInt(10_000_000);

const FIXED_DENOMINATIONS: Record<PayrollCurrency, string[]> = {
  XLM: ['1000', '500', '100', '50', '20', '10', '5', '1', '0.5', '0.1', '0.01'],
  USDC: ['1000', '500', '100', '50', '20', '10', '5', '1', '0.5', '0.1', '0.01'],
};

function generateAuditKey() {
  const hex = crypto.randomBytes(10).toString('hex').toUpperCase();

  return [
    'AUD',
    hex.slice(0, 4),
    hex.slice(4, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
  ].join('-');
}

function sha256Hex(value: string) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function hashToField(...values: string[]) {
  const hash = sha256Hex(values.join(':'));
  return (BigInt(`0x${hash}`) % FIELD_MODULUS).toString();
}

function randomField() {
  return hashToField(crypto.randomBytes(32).toString('hex'));
}

function decimalToAtomic(amount: string) {
  const normalized = amount.trim();

  if (!/^\d+(\.\d{1,7})?$/.test(normalized)) {
    throw new Error('Amount must use at most 7 decimal places.');
  }

  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = BigInt(wholePart || '0');
  const fraction = BigInt(fractionPart.padEnd(7, '0'));

  return whole * ATOMIC_SCALE + fraction;
}

function atomicToDisplay(atomic: bigint) {
  const whole = atomic / ATOMIC_SCALE;
  const fraction = atomic % ATOMIC_SCALE;

  if (fraction === BigInt(0)) return whole.toString();

  const fractionText = fraction.toString().padStart(7, '0').replace(/0+$/, '');

  return `${whole.toString()}.${fractionText}`;
}

function tokenForCurrency(currency: PayrollCurrency) {
  return currency === 'XLM' ? zetapayConfig.xlmTokenContract : zetapayConfig.usdcTokenContract;
}

function tokenHashForCurrency(currency: PayrollCurrency) {
  return currency === 'XLM' ? '0' : '1';
}

function denominationAtoms(currency: PayrollCurrency) {
  return FIXED_DENOMINATIONS[currency]
    .map((amount) => decimalToAtomic(amount))
    .filter((amount) => amount > BigInt(0))
    .sort((a, b) => {
      if (a > b) return -1;
      if (a < b) return 1;
      return 0;
    });
}

function splitIntoFixedDenominations(currency: PayrollCurrency, amount: string) {
  let remaining = decimalToAtomic(amount);
  const chunks: bigint[] = [];

  if (remaining <= BigInt(0)) {
    throw new Error('Amount must be greater than zero.');
  }

  for (const denomination of denominationAtoms(currency)) {
    while (remaining >= denomination) {
      chunks.push(denomination);
      remaining -= denomination;
    }
  }

  if (remaining > BigInt(0)) {
    chunks.push(remaining);
  }

  return chunks;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeMetadata(current: unknown, next: Record<string, unknown>) {
  const base = isRecord(current) ? current : {};
  const currentSoroban = isRecord(base.soroban) ? base.soroban : {};
  const nextSoroban = isRecord(next.soroban) ? next.soroban : {};

  return {
    ...base,
    ...next,
    soroban: {
      ...currentSoroban,
      ...nextSoroban,
    },
  };
}

function getStoredPoolPayload(metadata: unknown): StoredPoolPayload {
  if (!isRecord(metadata)) throw new Error('Missing pool payload');

  const soroban = metadata.soroban;
  if (!isRecord(soroban)) throw new Error('Missing pool payload');

  const payload = soroban.poolPayload;
  if (!isRecord(payload)) throw new Error('Missing pool payload');

  return payload as StoredPoolPayload;
}

async function getSessionEnterprise() {
  const cookieStore = await cookies();
  const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

  if (!enterpriseIdStr) return null;

  const enterpriseId = Number.parseInt(enterpriseIdStr, 10);
  if (Number.isNaN(enterpriseId)) return null;

  const [enterprise] = await db
    .select()
    .from(enterprises)
    .where(eq(enterprises.id, enterpriseId))
    .limit(1)
    .execute();

  if (!enterprise || !enterprise.isActive) return null;

  return enterprise;
}

function assertWalletMatchesEnterprise(
  walletAddress: string | undefined,
  enterpriseWallet: string
) {
  if (!walletAddress) throw new Error('Connected wallet address is required');

  if (walletAddress !== enterpriseWallet) {
    throw new Error('Connected Freighter wallet does not match this enterprise wallet.');
  }
}

async function loadMerkleHelpers() {
  const modulePath = path.join(process.cwd(), 'circuits/payroll/scripts/merkle.js');
  const moduleUrl = pathToFileURL(modulePath).href;

  const dynamicImport = new Function('moduleUrl', 'return import(moduleUrl);') as (
    moduleUrl: string
  ) => Promise<{
    poseidonHash: (values: bigint[]) => Promise<bigint>;
  }>;

  return dynamicImport(moduleUrl);
}

async function loadSnarkJs() {
  const dynamicImport = new Function('moduleName', 'return import(moduleName);') as (
    moduleName: string
  ) => Promise<{
    groth16: {
      fullProve: (
        input: Record<string, unknown>,
        wasmPath: string,
        zkeyPath: string
      ) => Promise<{
        proof: JsonValue;
        publicSignals: string[];
      }>;
    };
  }>;

  return dynamicImport('snarkjs');
}

async function buildPoseidonMerkleTree(
  values: string[],
  poseidonHash: (values: bigint[]) => Promise<bigint>
) {
  let current = values.map((value) => BigInt(value || '0'));
  const levels = [current];

  while (current.length > 1) {
    const next: bigint[] = [];

    for (let index = 0; index < current.length; index += 2) {
      next.push(await poseidonHash([current[index], current[index + 1]]));
    }

    current = next;
    levels.push(current);
  }

  return {
    root: current[0],
    levels,
  };
}

function buildMerkleProof(levels: bigint[][], index: number) {
  let currentIndex = index;
  const pathElements: string[] = [];
  const pathIndices: number[] = [];

  for (let level = 0; level < levels.length - 1; level += 1) {
    const siblingIndex = currentIndex % 2 === 0 ? currentIndex + 1 : currentIndex - 1;

    pathElements.push(levels[level][siblingIndex].toString());
    pathIndices.push(currentIndex % 2);

    currentIndex = Math.floor(currentIndex / 2);
  }

  return {
    pathElements,
    pathIndices,
  };
}

async function generateWithdrawProof(input: {
  note: PoolNoteDraft;
  root: string;
  pathElements: string[];
  pathIndices: number[];
}) {
  const snarkjs = await loadSnarkJs();

  const wasmPath = path.join(process.cwd(), 'circuits/pool/build/withdraw_js/withdraw.wasm');
  const zkeyPath = path.join(process.cwd(), 'circuits/pool/build/withdraw_final.zkey');

  const circuitInput = {
    secret: input.note.secret,
    nullifier: input.note.nullifier,
    amount_private: input.note.atomicAmount,
    token_hash_private: input.note.tokenHash,
    salt: input.note.salt,
    path_elements: input.pathElements,
    path_indices: input.pathIndices,
    root_public: input.root,
    nullifier_hash_public: input.note.nullifierHash,
    recipient_hash_public: input.note.recipientHash,
    amount_public: input.note.atomicAmount,
    token_hash_public: input.note.tokenHash,
    withdrawal_hash_public: input.note.withdrawalHash,
  };

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInput,
    wasmPath,
    zkeyPath
  );

  return {
    proof,
    publicInputs: publicSignals,
  };
}

async function isPoolInitialized(source: string) {
  return await isPoolContractInitialized({ source });
}

async function noteExists(source: string, commitment: string) {
  try {
    await getNote({ source, commitment });
    return true;
  } catch {
    return false;
  }
}

async function buildPoolPayload({
  enterprise,
  periodStart,
  periodEnd,
  orderedItems,
  auditKey,
}: {
  enterprise: typeof enterprises.$inferSelect;
  periodStart: string;
  periodEnd: string;
  orderedItems: {
    item: {
      personId: string;
      amount: string;
      currency: PayrollCurrency;
    };
    employee: typeof employees.$inferSelect;
  }[];
  auditKey: string;
}): Promise<StoredPoolPayload> {
  const { poseidonHash } = await loadMerkleHelpers();

  const notes: PoolNoteDraft[] = [];
  let globalNoteIndex = 0;

  for (const { item, employee } of orderedItems) {
    const chunks = splitIntoFixedDenominations(item.currency, item.amount);

    for (const [employeeNoteIndex, atomicChunk] of chunks.entries()) {
      const atomicAmount = atomicChunk.toString();
      const displayAmount = atomicToDisplay(atomicChunk);
      const tokenHash = tokenHashForCurrency(item.currency);
      const secret = randomField();
      const nullifier = randomField();
      const salt = randomField();
      const recipientHash = hashToField(employee.walletAddress);
      const nullifierHash = (await poseidonHash([BigInt(nullifier)])).toString();

      const commitment = (
        await poseidonHash([
          BigInt(secret),
          BigInt(nullifier),
          BigInt(atomicAmount),
          BigInt(tokenHash),
          BigInt(salt),
        ])
      ).toString();

      const withdrawalHash = (
        await poseidonHash([
          BigInt(nullifierHash),
          BigInt(recipientHash),
          BigInt(atomicAmount),
          BigInt(tokenHash),
        ])
      ).toString();

      notes.push({
        employeeId: employee.id,
        personId: item.personId,
        walletAddress: employee.walletAddress,
        amount: displayAmount,
        employeeTotalAmount: item.amount,
        atomicAmount,
        currency: item.currency,
        token: tokenForCurrency(item.currency),
        tokenHash,
        secret,
        nullifier,
        nullifierHash,
        salt,
        commitment,
        recipientHash,
        withdrawalHash,
        payeeIndex: globalNoteIndex,
        employeeNoteIndex,
        denomination: displayAmount,
      });

      globalNoteIndex += 1;
    }
  }

  if (notes.length > BATCH_SIZE) {
    throw new Error(
      `Fixed denomination split created ${notes.length} notes. This endpoint currently supports ${BATCH_SIZE} notes.`
    );
  }

  const paddedCommitments = [
    ...notes.map((note) => note.commitment),
    ...Array.from({ length: BATCH_SIZE - notes.length }, () => '0'),
  ];

  const tree = await buildPoseidonMerkleTree(paddedCommitments, poseidonHash);
  const root = tree.root.toString();

  for (const note of notes) {
    const proofPath = buildMerkleProof(tree.levels, note.payeeIndex);

    const withdrawalProof = await generateWithdrawProof({
      note,
      root,
      pathElements: proofPath.pathElements,
      pathIndices: proofPath.pathIndices,
    });

    note.proof = withdrawalProof.proof;
    note.publicInputs = withdrawalProof.publicInputs;
  }

  const completeNotes = notes.map((note) => {
    if (!note.proof || !note.publicInputs) {
      throw new Error(`Withdraw proof generation failed for note ${note.payeeIndex}`);
    }

    return note as PoolNotePayload;
  });

  const encryptedNotes = completeNotes.map((note) =>
    encryptPayload({
      scope: 'shieldedPoolWithdrawalNote',
      enterpriseId: enterprise.id,
      auditKey,
      periodStart,
      periodEnd,
      root,
      fixedDenomination: true,
      ...note,
      createdAt: new Date().toISOString(),
    })
  );

  const totals = {
    xlm: orderedItems
      .filter(({ item }) => item.currency === 'XLM')
      .reduce((sum, { item }) => sum + Number(item.amount), 0),
    usdc: orderedItems
      .filter(({ item }) => item.currency === 'USDC')
      .reduce((sum, { item }) => sum + Number(item.amount), 0),
    gross: orderedItems.reduce((sum, { item }) => sum + Number(item.amount), 0),
  };

  const encryptedPayroll = encryptPayload({
    scope: 'shieldedPoolPayrollAudit',
    enterpriseId: enterprise.id,
    enterpriseWallet: enterprise.walletAddress,
    auditKey,
    periodStart,
    periodEnd,
    root,
    totals,
    fixedDenomination: true,
    noteCount: completeNotes.length,
    employeeCount: orderedItems.length,
    notes: completeNotes,
    denominationPolicy: {
      enabled: true,
      atomicScale: Number(ATOMIC_SCALE),
      xlm: FIXED_DENOMINATIONS.XLM,
      usdc: FIXED_DENOMINATIONS.USDC,
    },
    createdAt: new Date().toISOString(),
  });

  return {
    root,
    notes: completeNotes,
    encryptedPayroll,
    encryptedNotes,
    totals,
    denominationPolicy: {
      enabled: true,
      atomicScale: Number(ATOMIC_SCALE),
      xlm: FIXED_DENOMINATIONS.XLM,
      usdc: FIXED_DENOMINATIONS.USDC,
    },
  };
}

async function buildNextPoolXdr({
  source,
  payload,
}: {
  source: string;
  payload: StoredPoolPayload;
}) {
  const initialized = await isPoolInitialized(source);

  if (!initialized) {
    return await buildInitializeShieldedPoolXdr({ admin: source });
  }

  const tokens = Array.from(new Set(payload.notes.map((note) => note.token)));

  for (const token of tokens) {
    const registered = await isTokenRegistered({ source, token });

    if (!registered) {
      return await buildRegisterTokenXdr({
        admin: source,
        token,
      });
    }
  }

  const missingNotes = [];

  for (const note of payload.notes) {
    const exists = await noteExists(source, note.commitment);

    if (!exists) {
      missingNotes.push(note);
    }
  }

  if (missingNotes.length > 0) {
    return await buildFundPayrollXdr({
      admin: source,
      root: payload.root,
      deposits: missingNotes.map((note) => ({
        token: note.token,
        amount: note.atomicAmount,
        commitment: note.commitment,
      })),
    });
  }

  return null;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as PoolPayrollRequest;
    const action = body.action || 'prepare';

    const enterprise = await getSessionEnterprise();

    if (!enterprise) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    assertWalletMatchesEnterprise(body.walletAddress, enterprise.walletAddress);

    if (action === 'prepare') {
      return await preparePoolPayroll(body, enterprise);
    }

    if (action === 'submitSigned') {
      return await submitSignedPoolPayroll(body, enterprise);
    }

    return NextResponse.json({ error: 'Unsupported pool payroll action' }, { status: 400 });
  } catch (error) {
    console.error('Error processing shielded pool payroll:', error);

    return NextResponse.json(
      {
        error: 'Failed to process shielded pool payroll',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function preparePoolPayroll(
  body: PoolPayrollRequest,
  enterprise: typeof enterprises.$inferSelect
) {
  const periodStart = body.periodStart;
  const periodEnd = body.periodEnd;

  if (!periodStart || !periodEnd) {
    return NextResponse.json({ error: 'Payroll period is required' }, { status: 400 });
  }

  if (!Array.isArray(body.items) || body.items.length === 0) {
    return NextResponse.json({ error: 'At least one payee is required' }, { status: 400 });
  }

  const employeeIds = body.items.map((item) => Number.parseInt(item.personId, 10));

  if (employeeIds.some((id) => Number.isNaN(id))) {
    return NextResponse.json({ error: 'Invalid payee id' }, { status: 400 });
  }

  const employeeRows = await db
    .select()
    .from(employees)
    .where(and(inArray(employees.id, employeeIds), eq(employees.enterpriseId, enterprise.id)))
    .execute();

  if (employeeRows.length !== employeeIds.length) {
    return NextResponse.json(
      { error: 'One or more payees do not belong to this enterprise' },
      { status: 400 }
    );
  }

  const employeeById = new Map(employeeRows.map((employee) => [employee.id, employee]));

  const orderedItems = body.items.map((item) => {
    const employee = employeeById.get(Number.parseInt(item.personId, 10));

    if (!employee) {
      throw new Error(`Employee ${item.personId} not found`);
    }

    return { item, employee };
  });

  const auditKey = generateAuditKey();

  const payload = await buildPoolPayload({
    enterprise,
    periodStart,
    periodEnd,
    orderedItems,
    auditKey,
  });

  const nextXdr = await buildNextPoolXdr({
    source: enterprise.walletAddress,
    payload,
  });

  if (!nextXdr) {
    throw new Error('No pool transaction was prepared.');
  }

  const [payrollRun] = await db
    .insert(payrollRuns)
    .values({
      enterpriseId: enterprise.id,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      totalGross: payload.totals.gross.toString(),
      totalNet: payload.totals.gross.toString(),
      totalTaxWithheld: '0',
      totalDeductions: '0',
      totalXlm: payload.totals.xlm.toString(),
      totalUsdc: payload.totals.usdc.toString(),
      payeeCount: orderedItems.length,
      batchSize: BATCH_SIZE,
      batchCount: 1,
      batchRoot: payload.root,
      payrollRunHash: payload.root,
      auditKey,
      proofHash: sha256Hex(payload.root),
      proofPublicInputs: {
        root: payload.root,
        commitments: payload.notes.map((note) => note.commitment),
        fixedDenomination: true,
        noteCount: payload.notes.length,
      },
      status: 'pending',
      processedBy: enterprise.walletAddress,
      runDate: new Date(),
      metadata: {
        generatedBy: 'payroll-review',
        settlementMode: 'shielded_pool',
        sourceOfTruth: 'soroban',
        encryptedPayroll: payload.encryptedPayroll,
        encryptedNotes: payload.encryptedNotes,
        fixedDenomination: true,
        noteCount: payload.notes.length,
        denominationPolicy: payload.denominationPolicy,
        soroban: {
          stage: 'prepared',
          poolContractId: zetapayConfig.poolContractId,
          verifierContractId: zetapayConfig.verifierContractId,
          poolPayload: payload,
          txHashes: [],
        },
      },
    })
    .returning()
    .execute();

  for (const note of payload.notes) {
    await db
      .insert(payrollEmployees)
      .values({
        payrollRunId: payrollRun.id,
        employeeId: note.employeeId,
        payoutCurrency: note.currency,
        grossSalary: note.amount,
        netSalary: note.amount,
        taxWithheld: '0',
        federalTax: '0',
        stateTax: '0',
        localTax: '0',
        socialSecurity: '0',
        medicare: '0',
        deductions: '0',
        bonuses: '0',
        commissions: '0',
        reimbursements: '0',
        batchIndex: 0,
        payeeIndex: note.payeeIndex,
        salt: note.salt,
        commitment: note.commitment,
        merklePath: [],
        pathIndices: [],
        encryptedMetadata: payload.encryptedNotes[note.payeeIndex],
        status: 'pending',
      })
      .execute();
  }

  return NextResponse.json(
    {
      success: true,
      step: 'prepared',
      payrollRunId: payrollRun.id,
      employer: enterprise.walletAddress,
      initializeXdr: null,
      submitXdr: nextXdr,
      batchRoot: payload.root,
      payrollRunHash: payload.root,
      proofHash: payrollRun.proofHash,
      totals: {
        xlm: payload.totals.xlm,
        usdc: payload.totals.usdc,
        payeeCount: orderedItems.length,
        batchCount: 1,
      },
      fixedDenomination: true,
      noteCount: payload.notes.length,
    },
    { status: 201 }
  );
}

async function submitSignedPoolPayroll(
  body: PoolPayrollRequest,
  enterprise: typeof enterprises.$inferSelect
) {
  if (!body.payrollRunId) {
    return NextResponse.json({ error: 'Payroll run id is required' }, { status: 400 });
  }

  if (!body.signedXdr) {
    return NextResponse.json({ error: 'Signed pool XDR is required' }, { status: 400 });
  }

  const [payrollRun] = await db
    .select()
    .from(payrollRuns)
    .where(and(eq(payrollRuns.id, body.payrollRunId), eq(payrollRuns.enterpriseId, enterprise.id)))
    .limit(1)
    .execute();

  if (!payrollRun) {
    return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
  }

  const payload = getStoredPoolPayload(payrollRun.metadata);
  const submitResult = await sendSignedPoolXdr(body.signedXdr);

  const currentHashes =
    isRecord(payrollRun.metadata) &&
    isRecord(payrollRun.metadata.soroban) &&
    Array.isArray(payrollRun.metadata.soroban.txHashes)
      ? payrollRun.metadata.soroban.txHashes
      : [];

  const txHashes = [...currentHashes, submitResult.txHash];

  const nextXdr = await buildNextPoolXdr({
    source: enterprise.walletAddress,
    payload,
  });

  if (nextXdr) {
    await db
      .update(payrollRuns)
      .set({
        metadata: mergeMetadata(payrollRun.metadata, {
          soroban: {
            stage: 'pool_transaction_submitted',
            lastTxHash: submitResult.txHash,
            txHashes,
          },
        }),
        updatedAt: new Date(),
      })
      .where(eq(payrollRuns.id, payrollRun.id))
      .execute();

    return NextResponse.json({
      success: true,
      step: 'prepared',
      payrollRunId: payrollRun.id,
      employer: enterprise.walletAddress,
      submitTxHash: submitResult.txHash,
      submitXdr: nextXdr,
      batchRoot: payrollRun.batchRoot,
      payrollRunHash: payrollRun.payrollRunHash,
      proofHash: payrollRun.proofHash,
      status: payrollRun.status,
      totals: {
        xlm: Number(payrollRun.totalXlm),
        usdc: Number(payrollRun.totalUsdc),
        payeeCount: payrollRun.payeeCount || 0,
        batchCount: payrollRun.batchCount || 1,
      },
    });
  }

  const [updatedPayrollRun] = await db
    .update(payrollRuns)
    .set({
      txHash: submitResult.txHash,
      status: 'completed',
      processedBy: enterprise.walletAddress,
      processedAt: new Date(),
      metadata: mergeMetadata(payrollRun.metadata, {
        soroban: {
          stage: 'pool_funded',
          lastTxHash: submitResult.txHash,
          txHashes,
        },
      }),
      updatedAt: new Date(),
    })
    .where(eq(payrollRuns.id, payrollRun.id))
    .returning()
    .execute();

  await db
    .update(payrollEmployees)
    .set({
      status: 'completed',
      processedAt: new Date(),
      paymentVerifiedAt: new Date(),
      txHash: submitResult.txHash,
      updatedAt: new Date(),
    })
    .where(eq(payrollEmployees.payrollRunId, payrollRun.id))
    .execute();

  return NextResponse.json({
    success: true,
    step: 'executed',
    payrollRunId: updatedPayrollRun.id,
    status: updatedPayrollRun.status,
    batchRoot: updatedPayrollRun.batchRoot,
    payrollRunHash: updatedPayrollRun.payrollRunHash,
    proofHash: updatedPayrollRun.proofHash,
    txHash: submitResult.txHash,
    submitTxHash: submitResult.txHash,
    executeTxHash: submitResult.txHash,
    employerPayrollUrl: `/dashboard/employer/payroll/${updatedPayrollRun.id}`,
    fixedDenomination: true,
    noteCount: payload.notes.length,
    totals: {
      xlm: Number(updatedPayrollRun.totalXlm),
      usdc: Number(updatedPayrollRun.totalUsdc),
      payeeCount: updatedPayrollRun.payeeCount || 0,
      batchCount: updatedPayrollRun.batchCount || 1,
    },
  });
}
