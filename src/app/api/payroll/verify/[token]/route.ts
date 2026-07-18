import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { enterprises, payrollRuns, zkProofs } from '@/lib/db/schema';
import { sha256Hex } from '@/lib/zk/payroll-batch';
import { getPayrollRecordFromChain } from '@/lib/zetapay/contracts/payroll';

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    const tokenHash = sha256Hex(token);

    const [row] = await db
      .select({
        payrollRunId: payrollRuns.id,
        contractBatchId: payrollRuns.contractBatchId,
        txHash: payrollRuns.txHash,
        status: payrollRuns.status,
        employerWallet: enterprises.walletAddress,
      })
      .from(payrollRuns)
      .innerJoin(enterprises, eq(payrollRuns.enterpriseId, enterprises.id))
      .where(eq(payrollRuns.publicVerificationTokenHash, tokenHash))
      .limit(1)
      .execute();

    if (!row || !row.contractBatchId || !row.employerWallet) {
      return NextResponse.json({ error: 'Payroll proof record not found' }, { status: 404 });
    }

    const chainRecord = await getPayrollRecordFromChain({
      employer: row.employerWallet,
      batchId: row.contractBatchId,
    });

    const [proof] = await db
      .select()
      .from(zkProofs)
      .where(eq(zkProofs.payrollRunId, row.payrollRunId))
      .limit(1)
      .execute();

    return NextResponse.json({
      verified: Boolean(
        chainRecord.batch.commitmentRoot && chainRecord.batch.proofHash && proof?.isValid
      ),
      payrollRun: {
        id: row.payrollRunId,
        status: row.status,
        txHash: row.txHash,
        batchRoot: chainRecord.batch.commitmentRoot,
        proofHash: chainRecord.batch.proofHash,
        payrollRunHash: chainRecord.batch.payrollRunHash,
        batchCount: chainRecord.batch.batch_count,
        paymentCount: chainRecord.batch.payment_count,
        encryptedPayrollRecords: true,
        source: 'soroban_contract',
      },
      proof: proof
        ? {
            proofHash: proof.proofHash,
            isValid: proof.isValid,
            generatedAt: proof.generatedAt,
          }
        : null,
    });
  } catch (error) {
    console.error('Error verifying public payroll:', error);

    return NextResponse.json(
      {
        error: 'Failed to verify payroll',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
