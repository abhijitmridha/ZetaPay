import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { payrollRuns, payrollEmployees, employees } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await params;
    const employeeId = parseInt(id);
    const payrollRunId = parseInt(runId);

    if (isNaN(employeeId) || isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid ID provided' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enterpriseId = parseInt(enterpriseIdStr);

    const transaction = await db
      .select({
        payrollRunId: payrollRuns.id,
        runDate: payrollRuns.runDate,
        periodStart: payrollRuns.periodStart,
        periodEnd: payrollRuns.periodEnd,
        payrollStatus: payrollRuns.status,
        txHash: payrollRuns.txHash,
        totalGross: payrollRuns.totalGross,
        totalNet: payrollRuns.totalNet,
        totalTaxWithheld: payrollRuns.totalTaxWithheld,

        transactionId: payrollEmployees.id,
        grossSalary: payrollEmployees.grossSalary,
        netSalary: payrollEmployees.netSalary,
        taxWithheld: payrollEmployees.taxWithheld,
        status: payrollEmployees.status,
        processedAt: payrollEmployees.processedAt,

        employeeId: employees.id,
        employeeName: employees.fullName,
        employeeEmail: employees.email,
        walletAddress: employees.walletAddress,
        type: employees.type,
      })
      .from(payrollEmployees)
      .innerJoin(payrollRuns, eq(payrollEmployees.payrollRunId, payrollRuns.id))
      .innerJoin(employees, eq(payrollEmployees.employeeId, employees.id))
      .where(
        and(
          eq(payrollEmployees.employeeId, employeeId),
          eq(payrollEmployees.payrollRunId, payrollRunId),
          eq(payrollRuns.enterpriseId, enterpriseId)
        )
      )
      .limit(1)
      .execute();

    if (!transaction || transaction.length === 0) {
      return NextResponse.json({ error: 'Payroll transaction not found' }, { status: 404 });
    }

    const t = transaction[0];

    return NextResponse.json({
      id: t.transactionId,
      payrollRunId: t.payrollRunId,
      grossSalary: t.grossSalary,
      netSalary: t.netSalary,
      taxWithheld: t.taxWithheld,
      status: t.status,
      processedAt: t.processedAt,
      txHash: t.txHash,
      payrollRun: {
        runDate: t.runDate,
        periodStart: t.periodStart,
        periodEnd: t.periodEnd,
        status: t.payrollStatus,
        totalGross: t.totalGross,
        totalNet: t.totalNet,
        totalTaxWithheld: t.totalTaxWithheld,
      },
      employee: {
        id: String(t.employeeId),
        fullName: t.employeeName,
        email: t.employeeEmail,
        walletAddress: t.walletAddress,
        type: t.type,
      },
    });
  } catch (error) {
    console.error('Error fetching payroll run detail:', error);
    return NextResponse.json({ error: 'Failed to fetch payroll run details' }, { status: 500 });
  }
}
