import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, payrollEmployees, payrollRuns } from '@/lib/db/schema';
import { getNote, isRootAccepted } from '@/lib/zetapay/contracts/pool';

type PayrollMetadata = {
  settlementMode?: 'confidential_payroll' | 'shielded_pool';
  fixedDenomination?: boolean;
  noteCount?: number;
  soroban?: {
    poolContractId?: string;
    lastTxHash?: string | null;
    poolPayload?: {
      root?: string;
    };
  };
};

type ChainNoteState = {
  commitment: string;
  withdrawn: boolean;
};

function asMetadata(value: unknown): PayrollMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as PayrollMetadata;
}

function addAmount(left?: string | number | null, right?: string | number | null) {
  return String(Number(left || 0) + Number(right || 0));
}

function stellarTxUrl(txHash?: string | null) {
  return txHash ? `https://stellar.expert/explorer/testnet/tx/${txHash}` : null;
}

async function getPoolChainNotes(input: { source: string; commitments: string[] }) {
  const chainNotes: ChainNoteState[] = [];

  for (const commitment of input.commitments) {
    const chainNote = await getNote({
      source: input.source,
      commitment,
    });

    chainNotes.push({
      commitment,
      withdrawn: Boolean(chainNote.withdrawn),
    });
  }

  return chainNotes;
}

function chainStatusForCommitment(commitment: string | null, chainNotes: ChainNoteState[]) {
  if (!commitment) return 'deposited_in_pool';

  const chainNote = chainNotes.find((note) => note.commitment === commitment);

  if (!chainNote) return 'deposited_in_pool';

  return chainNote.withdrawn ? 'withdrawn' : 'deposited_in_pool';
}

function poolStatus(chainNotes: ChainNoteState[]) {
  if (chainNotes.length === 0) return 'deposited_in_pool';

  if (chainNotes.every((note) => note.withdrawn)) return 'withdrawn';

  if (chainNotes.some((note) => note.withdrawn)) return 'partially_withdrawn';

  return 'deposited_in_pool';
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    const employeeIdValue = cookieStore.get('employeeId')?.value;
    const walletAddress = cookieStore.get('zetaWallet')?.value;

    if (!employeeIdValue || !walletAddress) {
      return NextResponse.json({ error: 'Employee session not found' }, { status: 401 });
    }

    const employeeId = Number.parseInt(employeeIdValue, 10);
    const payrollRunId = Number.parseInt(id, 10);

    if (Number.isNaN(employeeId) || Number.isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid payroll request' }, { status: 400 });
    }

    const [employee] = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.walletAddress, walletAddress)))
      .limit(1)
      .execute();

    if (!employee) {
      return NextResponse.json({ error: 'Employee wallet is not registered' }, { status: 403 });
    }

    const [run] = await db
      .select()
      .from(payrollRuns)
      .where(eq(payrollRuns.id, payrollRunId))
      .limit(1)
      .execute();

    if (!run) {
      return NextResponse.json({ error: 'Payroll not found' }, { status: 404 });
    }

    const rows = await db
      .select()
      .from(payrollEmployees)
      .where(
        and(
          eq(payrollEmployees.payrollRunId, payrollRunId),
          eq(payrollEmployees.employeeId, employee.id)
        )
      )
      .execute();

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Payroll does not belong to this employee' },
        { status: 403 }
      );
    }

    const metadata = asMetadata(run.metadata);

    const mode =
      metadata.settlementMode === 'shielded_pool' ? 'shielded_pool' : 'confidential_payroll';

    const totals: Record<string, string> = {};

    for (const row of rows) {
      const currency = row.payoutCurrency || employee.preferredCurrency || 'USDC';
      totals[currency] = addAmount(totals[currency], row.netSalary);
    }

    const primary = Object.entries(totals)[0];
    const currency = primary?.[0] || employee.preferredCurrency || 'USDC';
    const amount = primary?.[1] || '0';
    const depositTxHash = run.txHash || metadata.soroban?.lastTxHash || null;

    if (mode === 'shielded_pool') {
      const root = metadata.soroban?.poolPayload?.root || run.batchRoot;

      if (!root) {
        return NextResponse.json(
          { error: 'Shielded pool root is missing for this payroll' },
          { status: 500 }
        );
      }

      const commitments = rows
        .map((row) => row.commitment)
        .filter((commitment): commitment is string => Boolean(commitment));

      const rootAccepted = await isRootAccepted({
        source: employee.walletAddress,
        root,
      });

      const chainNotes = await getPoolChainNotes({
        source: employee.walletAddress,
        commitments,
      });

      const status = poolStatus(chainNotes);

      const withdrawnNoteCount = chainNotes.filter((note) => note.withdrawn).length;
      const availableNoteCount = chainNotes.filter((note) => !note.withdrawn).length;

      const notes = rows.map((row) => {
        const noteCurrency = row.payoutCurrency || employee.preferredCurrency || 'USDC';
        const noteStatus = chainStatusForCommitment(row.commitment, chainNotes);
        const withdrawalTxHash = noteStatus === 'withdrawn' ? row.txHash : null;

        return {
          id: row.id,
          commitment: row.commitment,
          amount: String(row.netSalary || '0'),
          currency: noteCurrency,
          status: noteStatus,
          createdAt: row.createdAt.toISOString(),
          depositTxHash,
          depositStellarUrl: stellarTxUrl(depositTxHash),
          withdrawalTxHash,
          withdrawalStellarUrl: stellarTxUrl(withdrawalTxHash),
        };
      });

      return NextResponse.json({
        payroll: {
          payrollRunId: run.id,
          periodStart: run.periodStart.toISOString(),
          periodEnd: run.periodEnd.toISOString(),
          createdAt: run.createdAt.toISOString(),
          mode,
          status,
          totals,
          amount,
          currency,
          noteCount: rows.length,
          availableNoteCount,
          withdrawnNoteCount,
          txHash: depositTxHash,
          stellarUrl: stellarTxUrl(depositTxHash),
          depositTxHash,
          depositStellarUrl: stellarTxUrl(depositTxHash),
          proofHash: run.proofHash,
          batchRoot: root,
          poolContractId: metadata.soroban?.poolContractId || null,
          rootAccepted,
          canWithdraw: rootAccepted && availableNoteCount > 0,
          notes,
        },
      });
    }

    return NextResponse.json({
      payroll: {
        payrollRunId: run.id,
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        createdAt: run.createdAt.toISOString(),
        mode,
        status: run.status || 'completed',
        totals,
        amount,
        currency,
        noteCount: rows.length,
        availableNoteCount: 0,
        withdrawnNoteCount: 0,
        txHash: depositTxHash,
        stellarUrl: stellarTxUrl(depositTxHash),
        depositTxHash,
        depositStellarUrl: stellarTxUrl(depositTxHash),
        proofHash: run.proofHash,
        batchRoot: run.batchRoot,
        poolContractId: null,
        rootAccepted: null,
        canWithdraw: false,
        notes: [],
      },
    });
  } catch (error) {
    console.error('Employee payroll detail error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load employee payroll detail',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
