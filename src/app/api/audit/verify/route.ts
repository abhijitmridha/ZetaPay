import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { auditLogs, enterprises, payrollRuns, users, zkProofs } from '@/lib/db/schema';
import { decryptPayload } from '@/lib/security/tokenVault';
import { BATCH_SIZE } from '@/lib/zk/payroll-batch';
import { buildMerkleTree } from '@/lib/zk/merkle';
import { getPayrollRecordFromChain } from '@/lib/zetapay/contracts/payroll';
import { getNote, isRootAccepted } from '@/lib/zetapay/contracts/pool';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type AuditVerifyRequest = {
  auditKey?: string;
};

type AuditPayee = {
  employeeId?: number;
  personId?: string;
  walletAddress?: string;
  amount?: string;
  atomicAmount?: string;
  currency?: string;
  type?: string;
  commitment?: string;
  salt?: string;
  payeeIndex?: number;
};

type AuditNote = {
  employeeId?: number;
  personId?: string;
  walletAddress?: string;
  amount?: string;
  employeeTotalAmount?: string;
  atomicAmount?: string;
  currency?: string;
  token?: string;
  tokenHash?: string;
  secret?: string;
  nullifier?: string;
  nullifierHash?: string;
  salt?: string;
  commitment?: string;
  recipientHash?: string;
  withdrawalHash?: string;
  payeeIndex?: number;
  employeeNoteIndex?: number;
  denomination?: string;
};

type EncryptedPayrollAudit = Record<string, JsonValue> & {
  scope?: string;
  enterpriseId?: number;
  enterpriseWallet?: string;
  periodStart?: string;
  periodEnd?: string;
  auditKey?: string;
  payrollRunHash?: string;
  batchRoot?: string;
  proofHash?: string;
  batchIndex?: number;
  batchCount?: number;
  totals?: {
    totalGross?: string | number;
    totalXlm?: string | number;
    totalUsdc?: string | number;
    payeeCount?: string | number;
    xlm?: string | number;
    usdc?: string | number;
    gross?: string | number;
  };
  payees?: AuditPayee[];
  notes?: AuditNote[];
  commitments?: string[];
  publicSignals?: string[];
  createdAt?: string;
};

type PayrollMetadata = Record<string, JsonValue> & {
  settlementMode?: 'confidential_payroll' | 'shielded_pool';
  encryptedPayroll?: string;
  fixedDenomination?: boolean;
  noteCount?: number;
  soroban?: {
    stage?: string;
    poolContractId?: string;
    verifierContractId?: string;
    lastTxHash?: string | null;
    txHashes?: string[];
    poolPayload?: {
      root?: string;
      notes?: AuditNote[];
      totals?: {
        xlm?: number;
        usdc?: number;
        gross?: number;
      };
    };
  };
};

type ChainNoteState = {
  commitment: string;
  withdrawn: boolean;
};

function getAuditorEmail(cookieValue?: string) {
  if (!cookieValue) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    return typeof parsed.email === 'string' ? parsed.email : null;
  } catch {
    try {
      const parsed = JSON.parse(cookieValue);
      return typeof parsed.email === 'string' ? parsed.email : null;
    } catch {
      return null;
    }
  }
}

function getClientIp(request: Request) {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function normalizeAuditKey(value: string) {
  return value.trim().toUpperCase().replace(/-/g, '');
}

function auditKeyVariants(value: string) {
  const normalized = normalizeAuditKey(value);

  if (!normalized.startsWith('AUD') || normalized.length !== 23) {
    return [value.trim().toUpperCase()];
  }

  const body = normalized.slice(3);
  const dashed = [
    'AUD',
    body.slice(0, 4),
    body.slice(4, 8),
    body.slice(8, 12),
    body.slice(12, 16),
    body.slice(16, 20),
  ].join('-');

  return Array.from(new Set([normalized, dashed]));
}

function decryptSafe<TPayload extends Record<string, JsonValue>>(
  encryptedPayload?: string | null
): TPayload | null {
  if (!encryptedPayload) return null;

  try {
    return decryptPayload<TPayload>(encryptedPayload);
  } catch {
    return null;
  }
}

function asPayrollMetadata(value: unknown): PayrollMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as PayrollMetadata;
}

function normalizeCommitments(commitments: string[]) {
  const padded = commitments.map((item) => BigInt(item || '0'));

  while (padded.length < BATCH_SIZE) {
    padded.push(BigInt(0));
  }

  return padded.slice(0, BATCH_SIZE);
}

function getAuditCommitments(audit: EncryptedPayrollAudit) {
  if (Array.isArray(audit.commitments) && audit.commitments.length > 0) {
    return audit.commitments;
  }

  if (Array.isArray(audit.notes) && audit.notes.length > 0) {
    return audit.notes
      .map((note) => note.commitment)
      .filter((commitment): commitment is string => Boolean(commitment));
  }

  if (Array.isArray(audit.payees) && audit.payees.length > 0) {
    return audit.payees
      .map((payee) => payee.commitment)
      .filter((commitment): commitment is string => Boolean(commitment));
  }

  return [];
}

async function verifyMerkleRoot(input: { audit: EncryptedPayrollAudit; expectedRoot: string }) {
  const commitments = getAuditCommitments(input.audit);

  if (commitments.length === 0) {
    return {
      verified: false,
      reason: 'Encrypted payroll commitment list is missing',
      merkleRoot: null,
    };
  }

  const leaves = normalizeCommitments(commitments);
  const tree = await buildMerkleTree(leaves);
  const merkleRoot = tree.root.toString();

  if (merkleRoot !== String(input.expectedRoot)) {
    return {
      verified: false,
      reason: 'Merkle root does not match Soroban commitment root',
      merkleRoot,
    };
  }

  return {
    verified: true,
    reason: null,
    merkleRoot,
  };
}

async function verifyConfidentialPayroll(input: { encryptedPayroll: string; chainRoot: string }) {
  const audit = decryptSafe<EncryptedPayrollAudit>(input.encryptedPayroll);

  if (!audit) {
    return {
      verified: false,
      reason: 'Encrypted payroll audit payload could not be decrypted',
      audit: null,
      merkleRoot: null,
    };
  }

  const merkle = await verifyMerkleRoot({
    audit,
    expectedRoot: input.chainRoot,
  });

  return {
    verified: merkle.verified,
    reason: merkle.reason,
    audit,
    merkleRoot: merkle.merkleRoot,
  };
}

async function verifyShieldedPool(input: {
  source: string;
  root: string;
  encryptedPayroll?: string | null;
  metadata: PayrollMetadata;
}) {
  const audit = decryptSafe<EncryptedPayrollAudit>(input.encryptedPayroll);

  if (!audit) {
    return {
      verified: false,
      reason: 'Encrypted shielded pool audit payload could not be decrypted',
      audit: null,
      merkleRoot: null,
      rootAccepted: false,
      notesVerified: false,
      chainNotes: [] as ChainNoteState[],
    };
  }

  const rootAccepted = await isRootAccepted({
    source: input.source,
    root: input.root,
  });

  const merkle = await verifyMerkleRoot({
    audit,
    expectedRoot: input.root,
  });

  const notes = audit.notes || input.metadata.soroban?.poolPayload?.notes || [];
  let notesVerified = true;
  const chainNotes: ChainNoteState[] = [];

  for (const note of notes) {
    if (!note.commitment) {
      notesVerified = false;
      break;
    }

    try {
      const chainNote = await getNote({
        source: input.source,
        commitment: note.commitment,
      });

      chainNotes.push({
        commitment: note.commitment,
        withdrawn: Boolean(chainNote.withdrawn),
      });

      if (note.atomicAmount && String(chainNote.amount) !== String(note.atomicAmount)) {
        notesVerified = false;
        break;
      }

      if (note.token && chainNote.token !== note.token) {
        notesVerified = false;
        break;
      }
    } catch {
      notesVerified = false;
      break;
    }
  }

  const verified = rootAccepted && merkle.verified && notesVerified;

  return {
    verified,
    reason: verified
      ? null
      : !rootAccepted
        ? 'Shielded pool root is not accepted on Soroban'
        : !merkle.verified
          ? merkle.reason
          : 'One or more shielded notes could not be verified on Soroban',
    audit,
    merkleRoot: merkle.merkleRoot,
    rootAccepted,
    notesVerified,
    chainNotes,
  };
}

function addDecimalStrings(left: string | undefined, right: string | undefined) {
  return String(Number(left || 0) + Number(right || 0));
}

function addBigIntStrings(left: string | undefined, right: string | undefined) {
  return String(BigInt(left || '0') + BigInt(right || '0'));
}

function poolPayeeKey(note: AuditNote, index: number) {
  if (note.employeeId !== undefined) return `employee:${note.employeeId}`;
  if (note.personId) return `person:${note.personId}`;
  if (note.payeeIndex !== undefined) return `payee:${note.payeeIndex}`;

  return `note:${index}`;
}

function statusForPoolGroup(commitments: string[], chainNotes: ChainNoteState[]) {
  const states = commitments.map((commitment) =>
    chainNotes.find((note) => note.commitment === commitment)
  );

  if (states.length === 0 || states.some((state) => !state)) {
    return 'pool_deposit_verified';
  }

  if (states.every((state) => state?.withdrawn)) {
    return 'withdrawn';
  }

  if (states.some((state) => state?.withdrawn)) {
    return 'partially_withdrawn';
  }

  return 'deposited_in_pool';
}

function groupPoolNotes(notes: AuditNote[], chainNotes: ChainNoteState[], batchIndex: number) {
  const groups = new Map<
    string,
    {
      id: number;
      employeeId?: number;
      personId?: string;
      employeeName: string;
      amount: string;
      employeeTotalAmount: string;
      atomicAmount: string;
      currency?: string;
      token?: string;
      commitment?: string | null;
      commitments: string[];
      nullifierHashes: string[];
      withdrawalHashes: string[];
      denominationSummary: Record<string, number>;
      noteCount: number;
      batchIndex: number;
      payeeIndex?: number;
      source: string;
    }
  >();

  notes.forEach((note, index) => {
    const key = poolPayeeKey(note, index);
    const existing = groups.get(key);

    if (!existing) {
      groups.set(key, {
        id: note.payeeIndex ?? index,
        employeeId: note.employeeId,
        personId: note.personId,
        employeeName: note.personId
          ? `Payee ${note.personId}`
          : `Payee ${note.payeeIndex ?? index}`,
        amount: String(note.employeeTotalAmount || note.amount || '0'),
        employeeTotalAmount: String(note.employeeTotalAmount || note.amount || '0'),
        atomicAmount: String(note.atomicAmount || '0'),
        currency: note.currency,
        token: note.token,
        commitment: note.commitment || null,
        commitments: note.commitment ? [note.commitment] : [],
        nullifierHashes: note.nullifierHash ? [note.nullifierHash] : [],
        withdrawalHashes: note.withdrawalHash ? [note.withdrawalHash] : [],
        denominationSummary: note.denomination ? { [note.denomination]: 1 } : {},
        noteCount: 1,
        batchIndex,
        payeeIndex: note.payeeIndex,
        source: 'decrypted_shielded_pool_payload_grouped',
      });

      return;
    }

    existing.noteCount += 1;
    existing.atomicAmount = addBigIntStrings(existing.atomicAmount, note.atomicAmount);

    if (!note.employeeTotalAmount) {
      existing.amount = addDecimalStrings(existing.amount, note.amount);
      existing.employeeTotalAmount = existing.amount;
    }

    if (note.commitment) {
      existing.commitments.push(note.commitment);
    }

    if (note.nullifierHash) {
      existing.nullifierHashes.push(note.nullifierHash);
    }

    if (note.withdrawalHash) {
      existing.withdrawalHashes.push(note.withdrawalHash);
    }

    if (note.denomination) {
      existing.denominationSummary[note.denomination] =
        (existing.denominationSummary[note.denomination] || 0) + 1;
    }

    if (!existing.commitment && note.commitment) {
      existing.commitment = note.commitment;
    }
  });

  return Array.from(groups.values()).map((payee) => ({
    ...payee,
    amount: payee.employeeTotalAmount || payee.amount,
    status: statusForPoolGroup(payee.commitments, chainNotes),
    employeeEmail: null,
    employeeWallet: null,
  }));
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const role = cookieStore.get('zetaRole')?.value;
    const auditorSession = cookieStore.get('auditorSession')?.value;
    const auditorEmail = getAuditorEmail(auditorSession);

    if (role !== 'auditor' || !auditorEmail) {
      return NextResponse.json({ error: 'Unauthorized auditor session' }, { status: 401 });
    }

    const body = (await request.json()) as AuditVerifyRequest;
    const cleanAuditKey = body.auditKey?.trim().toUpperCase();

    if (!cleanAuditKey) {
      return NextResponse.json({ error: 'Audit key is required' }, { status: 400 });
    }

    const [row] = await db
      .select({
        payrollRunId: payrollRuns.id,
        enterpriseId: payrollRuns.enterpriseId,
        contractBatchId: payrollRuns.contractBatchId,
        dbStatus: payrollRuns.status,
        dbTxHash: payrollRuns.txHash,
        auditKey: payrollRuns.auditKey,
        batchRoot: payrollRuns.batchRoot,
        payrollRunHash: payrollRuns.payrollRunHash,
        proofHash: payrollRuns.proofHash,
        metadata: payrollRuns.metadata,
        employerWallet: enterprises.walletAddress,
        companyName: enterprises.companyName,
      })
      .from(payrollRuns)
      .innerJoin(enterprises, eq(enterprises.id, payrollRuns.enterpriseId))
      .where(inArray(payrollRuns.auditKey, auditKeyVariants(cleanAuditKey)))
      .limit(1)
      .execute();

    if (!row || !row.employerWallet) {
      return NextResponse.json({ error: 'Invalid audit key' }, { status: 403 });
    }

    const metadata = asPayrollMetadata(row.metadata);
    const isShieldedPool = metadata.settlementMode === 'shielded_pool';

    const [proof] = await db
      .select()
      .from(zkProofs)
      .where(eq(zkProofs.payrollRunId, row.payrollRunId))
      .limit(1)
      .execute();

    const [auditorUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, auditorEmail))
      .limit(1)
      .execute();

    const now = new Date();

    if (isShieldedPool) {
      const root = metadata.soroban?.poolPayload?.root || row.batchRoot;

      if (!root) {
        return NextResponse.json(
          { error: 'Shielded pool root is missing for this payroll' },
          { status: 500 }
        );
      }

      const verification = await verifyShieldedPool({
        source: row.employerWallet,
        root,
        encryptedPayroll: metadata.encryptedPayroll,
        metadata,
      });

      if (!verification.audit) {
        return NextResponse.json(
          {
            error: 'Could not decrypt shielded pool audit payload',
            message: verification.reason || 'Unknown audit decryption error',
          },
          { status: 500 }
        );
      }

      if (
        verification.audit.auditKey &&
        normalizeAuditKey(verification.audit.auditKey) !== normalizeAuditKey(row.auditKey)
      ) {
        return NextResponse.json(
          { error: 'Audit key does not match shielded pool payload' },
          { status: 403 }
        );
      }

      await db.insert(auditLogs).values({
        userId: auditorUser?.id || null,
        auditKey: row.auditKey,
        payrollRunId: row.payrollRunId,
        enterpriseId: row.enterpriseId,
        action: 'view_payroll',
        status: verification.verified ? 'verified' : 'failed',
        ipAddress: getClientIp(request),
        userAgent: request.headers.get('user-agent'),
        metadata: {
          auditorEmail,
          companyName: row.companyName,
          payrollRunId: row.payrollRunId,
          source: 'soroban shielded pool audit',
          chainSource: true,
          settlementMode: 'shielded_pool',
          rootAccepted: verification.rootAccepted,
          notesVerified: verification.notesVerified,
          merkleVerified: verification.verified,
          merkleFailureReason: verification.reason,
        },
      });

      const audit = verification.audit;
      const notes = audit.notes || metadata.soroban?.poolPayload?.notes || [];
      const groupedPayees = groupPoolNotes(notes, verification.chainNotes, audit.batchIndex ?? 0);

      const allWithdrawn =
        verification.chainNotes.length > 0 &&
        verification.chainNotes.every((note) => note.withdrawn);

      const someWithdrawn = verification.chainNotes.some((note) => note.withdrawn);

      const poolStatus = allWithdrawn
        ? 'withdrawn'
        : someWithdrawn
          ? 'partially_withdrawn'
          : 'deposited_in_pool';

      return NextResponse.json({
        success: true,
        payrollRunId: row.payrollRunId,
        report: {
          payrollRunId: row.payrollRunId,
          companyName: row.companyName,
          periodStart: audit.periodStart,
          periodEnd: audit.periodEnd,
          totalXlm:
            audit.totals?.xlm ??
            audit.totals?.totalXlm ??
            metadata.soroban?.poolPayload?.totals?.xlm ??
            null,
          totalUsdc:
            audit.totals?.usdc ??
            audit.totals?.totalUsdc ??
            metadata.soroban?.poolPayload?.totals?.usdc ??
            null,
          totalGross:
            audit.totals?.gross ??
            audit.totals?.totalGross ??
            metadata.soroban?.poolPayload?.totals?.gross ??
            null,
          totalNet:
            audit.totals?.gross ??
            audit.totals?.totalGross ??
            metadata.soroban?.poolPayload?.totals?.gross ??
            null,
          payeeCount: audit.totals?.payeeCount ?? groupedPayees.length,
          batchCount: audit.batchCount ?? 1,
          batchRoot: root,
          payrollRunHash: row.payrollRunHash || root,
          proofHash: row.proofHash,
          status: poolStatus,
          txHash: row.dbTxHash || metadata.soroban?.lastTxHash || null,
          verifiedAt: now.toISOString(),
          source: 'soroban_contract_shielded_pool',
          settlementMode: 'shielded_pool',
          pool: {
            poolContractId: metadata.soroban?.poolContractId || null,
            verifierContractId: metadata.soroban?.verifierContractId || null,
            stage: metadata.soroban?.stage || null,
            fixedDenomination: Boolean(metadata.fixedDenomination),
            noteCount: metadata.noteCount || notes.length,
            txHashes: metadata.soroban?.txHashes || [],
          },
          merkleVerification: {
            verified: verification.verified,
            reason: verification.reason,
            merkleRoot: verification.merkleRoot,
            chainRoot: root,
            rootAccepted: verification.rootAccepted,
            notesVerified: verification.notesVerified,
          },
          proof: proof
            ? {
                proofHash: proof.proofHash,
                isValid: proof.isValid,
                generatedAt: proof.generatedAt,
                publicInputs: proof.publicInputs,
              }
            : null,
          payees: groupedPayees,
        },
      });
    }

    if (!row.contractBatchId) {
      return NextResponse.json({ error: 'Invalid audit key' }, { status: 403 });
    }

    const chainRecord = await getPayrollRecordFromChain({
      employer: row.employerWallet,
      batchId: row.contractBatchId,
    });

    const verification = await verifyConfidentialPayroll({
      encryptedPayroll: chainRecord.batch.encryptedPayroll,
      chainRoot: chainRecord.batch.commitmentRoot,
    });

    if (!verification.audit) {
      return NextResponse.json(
        {
          error: 'Could not decrypt chain payroll audit payload',
          message: verification.reason || 'Unknown audit decryption error',
        },
        { status: 500 }
      );
    }

    if (
      verification.audit.auditKey &&
      normalizeAuditKey(verification.audit.auditKey) !== normalizeAuditKey(row.auditKey)
    ) {
      return NextResponse.json(
        { error: 'Audit key does not match chain payload' },
        { status: 403 }
      );
    }

    await db.insert(auditLogs).values({
      userId: auditorUser?.id || null,
      auditKey: row.auditKey,
      payrollRunId: row.payrollRunId,
      enterpriseId: row.enterpriseId,
      action: 'view_payroll',
      status: verification.verified ? 'verified' : 'failed',
      ipAddress: getClientIp(request),
      userAgent: request.headers.get('user-agent'),
      metadata: {
        auditorEmail,
        companyName: row.companyName,
        payrollRunId: row.payrollRunId,
        source: 'soroban encrypted payroll audit',
        chainSource: true,
        settlementMode: 'confidential_payroll',
        merkleVerified: verification.verified,
        merkleFailureReason: verification.reason,
      },
    });

    const audit = verification.audit;

    return NextResponse.json({
      success: true,
      payrollRunId: row.payrollRunId,
      report: {
        payrollRunId: row.payrollRunId,
        companyName: row.companyName,
        periodStart: audit.periodStart,
        periodEnd: audit.periodEnd,
        totalXlm: audit.totals?.totalXlm ?? null,
        totalUsdc: audit.totals?.totalUsdc ?? null,
        totalGross: audit.totals?.totalGross ?? null,
        totalNet: audit.totals?.totalGross ?? null,
        payeeCount:
          audit.totals?.payeeCount ?? audit.payees?.length ?? chainRecord.batch.payment_count,
        batchCount: audit.batchCount ?? chainRecord.batch.batch_count,
        batchRoot: chainRecord.batch.commitmentRoot,
        payrollRunHash: chainRecord.batch.payrollRunHash,
        proofHash: chainRecord.batch.proofHash,
        status: row.dbStatus,
        txHash: row.dbTxHash,
        verifiedAt: now.toISOString(),
        source: 'soroban_contract_encrypted_payroll',
        settlementMode: 'confidential_payroll',
        merkleVerification: {
          verified: verification.verified,
          reason: verification.reason,
          merkleRoot: verification.merkleRoot,
          chainRoot: chainRecord.batch.commitmentRoot,
        },
        proof: proof
          ? {
              proofHash: proof.proofHash,
              isValid: proof.isValid,
              generatedAt: proof.generatedAt,
              publicInputs: proof.publicInputs,
            }
          : null,
        payees: (audit.payees || []).map((payee) => ({
          id: payee.payeeIndex,
          employeeId: payee.employeeId,
          personId: payee.personId,
          employeeName: payee.personId ? `Payee ${payee.personId}` : `Payee ${payee.payeeIndex}`,
          employeeEmail: null,
          employeeWallet: payee.walletAddress,
          employeeType: payee.type,
          amount: payee.amount,
          atomicAmount: payee.atomicAmount,
          currency: payee.currency,
          status: row.dbStatus,
          commitment: payee.commitment,
          commitments: payee.commitment ? [payee.commitment] : [],
          salt: payee.salt,
          batchIndex: audit.batchIndex ?? chainRecord.batch.batch_index,
          payeeIndex: payee.payeeIndex,
          source: 'decrypted_chain_payload',
        })),
      },
    });
  } catch (error) {
    console.error('Error verifying audit key:', error);

    return NextResponse.json(
      {
        error: 'Failed to verify audit key',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
