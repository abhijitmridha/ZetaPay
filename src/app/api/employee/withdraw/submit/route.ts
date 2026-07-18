import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, payrollEmployees } from '@/lib/db/schema';
import { sendSignedPoolXdr } from '@/lib/zetapay/contracts/pool';

type WithdrawSubmitRequest = {
  payrollEmployeeId?: number;
  signedXdr?: string;
};

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const employeeIdValue = cookieStore.get('employeeId')?.value;
    const walletAddress = cookieStore.get('zetaWallet')?.value;

    if (!employeeIdValue || !walletAddress) {
      return NextResponse.json({ error: 'Employee session not found' }, { status: 401 });
    }

    const employeeId = Number.parseInt(employeeIdValue, 10);
    const body = (await request.json()) as WithdrawSubmitRequest;
    const payrollEmployeeId = Number(body.payrollEmployeeId);

    if (Number.isNaN(employeeId) || !payrollEmployeeId || Number.isNaN(payrollEmployeeId)) {
      return NextResponse.json({ error: 'Invalid withdrawal submit request' }, { status: 400 });
    }

    if (!body.signedXdr) {
      return NextResponse.json({ error: 'Signed XDR is required' }, { status: 400 });
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

    const [row] = await db
      .select()
      .from(payrollEmployees)
      .where(
        and(
          eq(payrollEmployees.id, payrollEmployeeId),
          eq(payrollEmployees.employeeId, employee.id)
        )
      )
      .limit(1)
      .execute();

    if (!row) {
      return NextResponse.json(
        { error: 'Withdrawal note does not belong to this employee' },
        { status: 403 }
      );
    }

    const result = await sendSignedPoolXdr(body.signedXdr);
    const now = new Date();

    await db
      .update(payrollEmployees)
      .set({
        status: 'cancelled',
        processedAt: now,
        paymentVerifiedAt: now,
        txHash: result.txHash,
        updatedAt: now,
      })
      .where(eq(payrollEmployees.id, row.id))
      .execute();

    return NextResponse.json({
      success: true,
      payrollEmployeeId: row.id,
      withdrawalTxHash: result.txHash,
      withdrawalStellarUrl: `https://stellar.expert/explorer/testnet/tx/${result.txHash}`,
      result,
    });
  } catch (error) {
    console.error('Submit withdrawal error:', error);

    return NextResponse.json(
      {
        error: 'Failed to submit withdrawal',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
