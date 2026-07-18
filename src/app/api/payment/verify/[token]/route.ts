import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  enterprises,
  payrollEmployees,
  payrollRuns,
  payrollVerificationLinks,
} from '@/lib/db/schema';
import { decryptPayload } from '@/lib/security/tokenVault';
import { BATCH_SIZE, sha256Hex } from '@/lib/zk/payroll-batch';
import { buildMerkleTree } from '@/lib/zk/merkle';
import { getPayrollRecordFromChain } from '@/lib/zetapay/contracts/payroll';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type LinkPayload = {
  token?: string;
  employeeId?: number;
  payrollRunId?: number;
  payrollEmployeeId?: number;
};

type EncryptedEmployeeNote = {
  scope?: string;
  enterpriseId?: number;
  employeeId?: number;
  payrollEmployeeIndex?: number;
  personId?: string;
  walletAddress?: string;
  amount?: string;
  atomicAmount?: string;
  currency?: string;
  type?: string;
  periodStart?: string;
  periodEnd?: string;
  payrollRunHash?: string;
  payrollRunHashField?: string;
  batchRoot?: string;
  commitment?: string;
  salt?: string;
  payeeIndex?: number;
  createdAt?: string;
};

type EncryptedPayrollAudit = {
  scope?: string;
  commitments?: string[];
};

function decryptSafe<TPayload extends Record<string, JsonValue>>(encryptedPayload: string) {
  try {
    return decryptPayload<TPayload>(encryptedPayload);
  } catch {
    return null;
  }
}

function normalizeCommitments(commitments: string[]) {
  const padded = commitments.map((item) => BigInt(item || '0'));

  while (padded.length < BATCH_SIZE) {
    padded.push(BigInt(0));
  }

  return padded.slice(0, BATCH_SIZE);
}

async function verifyNote(input: {
  note: EncryptedEmployeeNote;
  encryptedPayroll: string;
  chainRoot: string;
}) {
  const payroll = decryptSafe<EncryptedPayrollAudit>(input.encryptedPayroll);

  if (!payroll?.commitments || !Array.isArray(payroll.commitments)) {
    return {
      verified: false,
      reason: 'Encrypted payroll commitment list missing',
      merkleRoot: null,
    };
  }

  if (!input.note.commitment || input.note.payeeIndex === undefined) {
    return {
      verified: false,
      reason: 'Encrypted employee note is missing commitment data',
      merkleRoot: null,
    };
  }

  const leaves = normalizeCommitments(payroll.commitments);
  const expectedCommitment = leaves[input.note.payeeIndex]?.toString();

  if (expectedCommitment !== String(input.note.commitment)) {
    return {
      verified: false,
      reason: 'Employee commitment does not match encrypted payroll commitment list',
      merkleRoot: null,
    };
  }

  const tree = await buildMerkleTree(leaves);
  const merkleRoot = tree.root.toString();

  if (merkleRoot !== String(input.chainRoot)) {
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

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);

    const [record] = await db
      .select({
        linkId: payrollVerificationLinks.id,
        encryptedPayload: payrollVerificationLinks.encryptedPayload,
        expiresAt: payrollVerificationLinks.expiresAt,
        usedAt: payrollVerificationLinks.usedAt,
        revokedAt: payrollVerificationLinks.revokedAt,
        payrollRunId: payrollRuns.id,
        contractBatchId: payrollRuns.contractBatchId,
        payrollStatus: payrollRuns.status,
        companyName: enterprises.companyName,
        employerWallet: enterprises.walletAddress,
        payrollEmployeeId: payrollEmployees.id,
        payeeIndex: payrollEmployees.payeeIndex,
        paymentStatus: payrollEmployees.status,
        txHash: payrollEmployees.txHash,
        paymentVerifiedAt: payrollEmployees.paymentVerifiedAt,
      })
      .from(payrollVerificationLinks)
      .innerJoin(enterprises, eq(payrollVerificationLinks.enterpriseId, enterprises.id))
      .innerJoin(payrollRuns, eq(payrollVerificationLinks.payrollRunId, payrollRuns.id))
      .innerJoin(
        payrollEmployees,
        eq(payrollVerificationLinks.payrollEmployeeId, payrollEmployees.id)
      )
      .where(
        and(
          eq(payrollVerificationLinks.tokenHash, tokenHash),
          eq(payrollVerificationLinks.linkType, 'employee'),
          isNull(payrollVerificationLinks.revokedAt)
        )
      )
      .limit(1)
      .execute();

    if (!record || !record.contractBatchId || !record.employerWallet) {
      return NextResponse.json({ error: 'Payment verification record not found' }, { status: 404 });
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
    }

    const linkPayload = decryptSafe<LinkPayload>(record.encryptedPayload);

    if (!linkPayload?.payrollEmployeeId) {
      return NextResponse.json({ error: 'Invalid encrypted verification link' }, { status: 400 });
    }

    const chainRecord = await getPayrollRecordFromChain({
      employer: record.employerWallet,
      batchId: record.contractBatchId,
    });

    const decryptedNotes = chainRecord.batch.encryptedNotes
      .map((payload) => decryptSafe<EncryptedEmployeeNote>(payload))
      .filter((payload): payload is EncryptedEmployeeNote => Boolean(payload));

    const note =
      decryptedNotes.find((payload) => payload.payeeIndex === record.payeeIndex) ||
      decryptedNotes.find((payload) => payload.employeeId === linkPayload.employeeId);

    if (!note) {
      return NextResponse.json(
        { error: 'Encrypted employee note not found on chain' },
        { status: 404 }
      );
    }

    const verification = await verifyNote({
      note,
      encryptedPayroll: chainRecord.batch.encryptedPayroll,
      chainRoot: chainRecord.batch.commitmentRoot,
    });

    return NextResponse.json({
      verified:
        verification.verified &&
        Boolean(chainRecord.batch.commitmentRoot && chainRecord.batch.proofHash),
      verification,
      payment: {
        companyName: record.companyName || 'Private company',
        payrollRunId: record.payrollRunId,
        periodStart: note.periodStart,
        periodEnd: note.periodEnd,
        batchRoot: chainRecord.batch.commitmentRoot,
        payrollRunHash: chainRecord.batch.payrollRunHash,
        proofHash: chainRecord.batch.proofHash,
        payrollStatus: record.payrollStatus,
        payrollEmployeeId: record.payrollEmployeeId,
        amount: note.amount,
        atomicAmount: note.atomicAmount,
        currency: note.currency,
        employeeType: note.type,
        walletAddress: note.walletAddress,
        paymentStatus: record.paymentStatus,
        commitment: note.commitment,
        merkleRoot: verification.merkleRoot,
        txHash: record.txHash,
        expiresAt: record.expiresAt,
        usedAt: record.usedAt,
        paymentVerifiedAt: record.paymentVerifiedAt,
        source: 'soroban_encrypted_employee_note',
      },
    });
  } catch (error) {
    console.error('Error verifying payment:', error);

    return NextResponse.json(
      {
        error: 'Failed to verify payment',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);

    const [record] = await db
      .select({
        linkId: payrollVerificationLinks.id,
        payrollEmployeeId: payrollVerificationLinks.payrollEmployeeId,
        expiresAt: payrollVerificationLinks.expiresAt,
        revokedAt: payrollVerificationLinks.revokedAt,
      })
      .from(payrollVerificationLinks)
      .where(
        and(
          eq(payrollVerificationLinks.tokenHash, tokenHash),
          eq(payrollVerificationLinks.linkType, 'employee')
        )
      )
      .limit(1)
      .execute();

    if (!record || record.revokedAt) {
      return NextResponse.json({ error: 'Payment verification record not found' }, { status: 404 });
    }

    if (record.expiresAt && new Date(record.expiresAt).getTime() < Date.now()) {
      return NextResponse.json({ error: 'Verification link has expired' }, { status: 410 });
    }

    const verifiedAt = new Date();

    await db
      .update(payrollVerificationLinks)
      .set({
        usedAt: verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(eq(payrollVerificationLinks.id, record.linkId))
      .execute();

    await db
      .update(payrollEmployees)
      .set({
        paymentVerifiedAt: verifiedAt,
        updatedAt: verifiedAt,
      })
      .where(eq(payrollEmployees.id, record.payrollEmployeeId))
      .execute();

    return NextResponse.json({ success: true, verifiedAt });
  } catch (error) {
    console.error('Error confirming payment verification:', error);

    return NextResponse.json(
      {
        error: 'Failed to confirm verification',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
