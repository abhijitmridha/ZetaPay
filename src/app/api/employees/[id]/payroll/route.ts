import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { payrollRuns, payrollEmployees, employees } from '@/lib/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employeeId = parseInt(id);

    if (isNaN(employeeId)) {
      return NextResponse.json({ error: 'Invalid employee ID' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enterpriseId = parseInt(enterpriseIdStr);

    const transactions = await db
      .select({
        payrollRunId: payrollRuns.id,
        runDate: payrollRuns.runDate,
        periodStart: payrollRuns.periodStart,
        periodEnd: payrollRuns.periodEnd,
        payrollStatus: payrollRuns.status,
        txHash: payrollRuns.txHash,

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
      })
      .from(payrollEmployees)
      .innerJoin(payrollRuns, eq(payrollEmployees.payrollRunId, payrollRuns.id))
      .innerJoin(employees, eq(payrollEmployees.employeeId, employees.id))
      .where(
        and(eq(payrollEmployees.employeeId, employeeId), eq(payrollRuns.enterpriseId, enterpriseId))
      )
      .orderBy(desc(payrollRuns.runDate))
      .execute();

    const employeeRecord = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, employeeId), eq(employees.enterpriseId, enterpriseId)))
      .limit(1)
      .execute();

    if (!employeeRecord || employeeRecord.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const formattedTransactions = transactions.map((p) => ({
      id: p.transactionId,
      payrollRunId: p.payrollRunId,
      grossSalary: p.grossSalary,
      netSalary: p.netSalary,
      taxWithheld: p.taxWithheld,
      status: p.status,
      processedAt: p.processedAt,
      txHash: p.txHash,
      payrollRun: {
        runDate: p.runDate,
        periodStart: p.periodStart,
        periodEnd: p.periodEnd,
        status: p.payrollStatus,
      },
    }));

    const totalPaid = formattedTransactions.reduce(
      (sum, p) => sum + parseFloat(p.netSalary || '0'),
      0
    );

    return NextResponse.json({
      employee: {
        id: String(employeeRecord[0].id),
        fullName: employeeRecord[0].fullName || 'Unknown',
        email: employeeRecord[0].email,
        walletAddress: employeeRecord[0].walletAddress || '',
        type: employeeRecord[0].type || 'employee',
      },
      payrollHistory: formattedTransactions,
      summary: {
        totalPayrolls: formattedTransactions.length,
        totalPaid: totalPaid,
        averagePayment:
          formattedTransactions.length > 0 ? totalPaid / formattedTransactions.length : 0,
      },
    });
  } catch (error) {
    console.error('Error fetching employee payroll:', error);
    return NextResponse.json({ error: 'Failed to fetch employee payroll' }, { status: 500 });
  }
}
