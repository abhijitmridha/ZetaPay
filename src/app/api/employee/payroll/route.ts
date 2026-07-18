import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, payrollEmployees, payrollRuns } from '@/lib/db/schema';

type PayrollMetadata = {
  settlementMode?: 'confidential_payroll' | 'shielded_pool';
  soroban?: {
    lastTxHash?: string | null;
  };
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

function paymentVerifyUrl(request: Request, proofHash?: string | null) {
  if (!proofHash) return null;

  const url = new URL(request.url);
  return `${url.origin}/verify/payment/${proofHash}`;
}

export async function GET(request: Request) {
  try {
    const cookieStore = await cookies();
    const employeeIdValue = cookieStore.get('employeeId')?.value;
    const walletAddress = cookieStore.get('zetaWallet')?.value;

    if (!employeeIdValue || !walletAddress) {
      return NextResponse.json({ error: 'Employee session not found' }, { status: 401 });
    }

    const employeeId = Number.parseInt(employeeIdValue, 10);

    if (Number.isNaN(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee session' }, { status: 401 });
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

    const payrollRows = await db
      .select()
      .from(payrollEmployees)
      .where(eq(payrollEmployees.employeeId, employee.id))
      .orderBy(desc(payrollEmployees.createdAt))
      .execute();

    if (payrollRows.length === 0) {
      return NextResponse.json({
        employee: {
          id: employee.id,
          fullName: employee.fullName,
          walletAddress: employee.walletAddress,
          preferredCurrency: employee.preferredCurrency,
        },
        payrolls: [],
      });
    }

    const runIds = Array.from(new Set(payrollRows.map((row) => row.payrollRunId)));

    const runs = await db
      .select()
      .from(payrollRuns)
      .where(inArray(payrollRuns.id, runIds))
      .execute();

    const runsById = new Map(runs.map((run) => [run.id, run]));
    const groupedRows = new Map<number, typeof payrollRows>();

    for (const row of payrollRows) {
      const current = groupedRows.get(row.payrollRunId) || [];
      current.push(row);
      groupedRows.set(row.payrollRunId, current);
    }

    const payrolls = Array.from(groupedRows.entries())
      .map(([payrollRunId, rows]) => {
        const run = runsById.get(payrollRunId);

        if (!run) return null;

        const metadata = asMetadata(run.metadata);
        const mode =
          metadata.settlementMode === 'shielded_pool' ? 'shielded_pool' : 'confidential_payroll';

        const totals: Record<string, string> = {};

        for (const row of rows) {
          const currency = row.payoutCurrency || employee.preferredCurrency || 'USDC';
          totals[currency] = addAmount(totals[currency], row.netSalary);
        }

        const txHash = run.txHash || metadata.soroban?.lastTxHash || null;
        const primary = Object.entries(totals)[0];

        return {
          payrollRunId: run.id,
          periodStart: run.periodStart.toISOString(),
          periodEnd: run.periodEnd.toISOString(),
          createdAt: run.createdAt.toISOString(),
          mode,
          status: mode === 'shielded_pool' ? 'deposited_in_pool' : run.status || 'completed',
          totals,
          amount: primary?.[1] || '0',
          currency: primary?.[0] || employee.preferredCurrency || 'USDC',
          noteCount: rows.length,
          txHash,
          stellarUrl: stellarTxUrl(txHash),
          proofHash: run.proofHash,
          paymentVerificationUrl:
            mode === 'confidential_payroll' ? paymentVerifyUrl(request, run.proofHash) : null,
        };
      })
      .filter(Boolean)
      .sort(
        (left, right) => new Date(right!.createdAt).getTime() - new Date(left!.createdAt).getTime()
      );

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        walletAddress: employee.walletAddress,
        preferredCurrency: employee.preferredCurrency,
      },
      payrolls,
    });
  } catch (error) {
    console.error('Employee payroll list error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load employee payrolls',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
