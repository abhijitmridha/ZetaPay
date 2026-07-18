import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, desc, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, payrollEmployees, payrollRuns } from '@/lib/db/schema';

type PayrollMode = 'confidential_payroll' | 'shielded_pool';

type PayrollMetadata = {
  settlementMode?: PayrollMode;
  soroban?: {
    lastTxHash?: string | null;
  };
};

type RecentPayroll = {
  payrollRunId: number;
  periodStart: string;
  periodEnd: string;
  amount: string;
  currency: string;
  mode: PayrollMode;
  status: 'completed' | 'deposited_in_pool';
  txHash: string | null;
  noteCount: number;
  createdAt: string;
};

function asMetadata(value: unknown): PayrollMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as PayrollMetadata;
}

function addAmount(
  left: string | number | null | undefined,
  right: string | number | null | undefined
) {
  return String(Number(left || 0) + Number(right || 0));
}

function getPayrollMode(metadata: PayrollMetadata): PayrollMode {
  return metadata.settlementMode === 'shielded_pool' ? 'shielded_pool' : 'confidential_payroll';
}

function getDashboardStatus(mode: PayrollMode) {
  return mode === 'shielded_pool' ? 'deposited_in_pool' : 'completed';
}

export async function GET() {
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
          email: employee.email,
          walletAddress: employee.walletAddress,
          title: employee.title,
          type: employee.type,
          preferredCurrency: employee.preferredCurrency,
        },
        summary: {
          totalAvailableXlm: '0',
          totalAvailableUsdc: '0',
          totalReceivedXlm: '0',
          totalReceivedUsdc: '0',
          availableNoteCount: 0,
          payrollCount: 0,
        },
        recentPayrolls: [],
      });
    }

    const runIds = Array.from(new Set(payrollRows.map((row) => row.payrollRunId)));

    const runs = await db
      .select()
      .from(payrollRuns)
      .where(inArray(payrollRuns.id, runIds))
      .execute();

    const runsById = new Map(runs.map((run) => [run.id, run]));
    const grouped = new Map<number, typeof payrollRows>();

    for (const row of payrollRows) {
      const current = grouped.get(row.payrollRunId) || [];
      current.push(row);
      grouped.set(row.payrollRunId, current);
    }

    let totalAvailableXlm = '0';
    let totalAvailableUsdc = '0';
    let totalReceivedXlm = '0';
    let totalReceivedUsdc = '0';
    let availableNoteCount = 0;

    const recentPayrolls: RecentPayroll[] = [];

    for (const [payrollRunId, rows] of grouped.entries()) {
      const run = runsById.get(payrollRunId);

      if (!run) continue;

      const metadata = asMetadata(run.metadata);
      const mode = getPayrollMode(metadata);
      const currencyTotals: Record<string, string> = {};

      for (const row of rows) {
        const currency = row.payoutCurrency || employee.preferredCurrency || 'USDC';

        currencyTotals[currency] = addAmount(currencyTotals[currency], row.netSalary);

        if (currency === 'XLM') {
          totalReceivedXlm = addAmount(totalReceivedXlm, row.netSalary);
        }

        if (currency === 'USDC') {
          totalReceivedUsdc = addAmount(totalReceivedUsdc, row.netSalary);
        }

        if (mode === 'shielded_pool') {
          availableNoteCount += 1;

          if (currency === 'XLM') {
            totalAvailableXlm = addAmount(totalAvailableXlm, row.netSalary);
          }

          if (currency === 'USDC') {
            totalAvailableUsdc = addAmount(totalAvailableUsdc, row.netSalary);
          }
        }
      }

      const amountParts = Object.entries(currencyTotals);
      const primaryCurrency = amountParts[0]?.[0] || employee.preferredCurrency || 'USDC';
      const primaryAmount = amountParts[0]?.[1] || '0';

      recentPayrolls.push({
        payrollRunId: run.id,
        periodStart: run.periodStart.toISOString(),
        periodEnd: run.periodEnd.toISOString(),
        amount: primaryAmount,
        currency: primaryCurrency,
        mode,
        status: getDashboardStatus(mode),
        txHash: run.txHash || metadata.soroban?.lastTxHash || null,
        noteCount: rows.length,
        createdAt: run.createdAt.toISOString(),
      });
    }

    recentPayrolls.sort(
      (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );

    return NextResponse.json({
      employee: {
        id: employee.id,
        fullName: employee.fullName,
        email: employee.email,
        walletAddress: employee.walletAddress,
        title: employee.title,
        type: employee.type,
        preferredCurrency: employee.preferredCurrency,
      },
      summary: {
        totalAvailableXlm,
        totalAvailableUsdc,
        totalReceivedXlm,
        totalReceivedUsdc,
        availableNoteCount,
        payrollCount: recentPayrolls.length,
      },
      recentPayrolls: recentPayrolls.slice(0, 8),
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);

    return NextResponse.json(
      {
        error: 'Failed to load employee dashboard',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
