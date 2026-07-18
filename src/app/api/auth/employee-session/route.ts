import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { eq } from 'drizzle-orm';

import { EMPLOYEE } from '@/config';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';

export async function POST(request: Request) {
  try {
    const { walletAddress } = (await request.json()) as {
      walletAddress?: string;
    };

    if (!walletAddress) {
      return NextResponse.json({ error: 'Missing wallet address' }, { status: 400 });
    }

    const [employee] = await db
      .select({
        id: employees.id,
        enterpriseId: employees.enterpriseId,
        walletAddress: employees.walletAddress,
        fullName: employees.fullName,
        status: employees.status,
      })
      .from(employees)
      .where(eq(employees.walletAddress, walletAddress))
      .limit(1)
      .execute();

    if (!employee) {
      return NextResponse.json(
        {
          error:
            'This wallet is not registered as an employee wallet. Ask your employer to add this wallet first.',
        },
        { status: 403 }
      );
    }

    if (employee.status !== 'active') {
      return NextResponse.json(
        {
          error: 'This employee profile is not active.',
        },
        { status: 403 }
      );
    }

    const cookieStore = await cookies();

    const cookieOptions = {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7,
    };

    cookieStore.set('zetaWallet', walletAddress, cookieOptions);
    cookieStore.set('zetaRole', EMPLOYEE, cookieOptions);
    cookieStore.set('employeeId', String(employee.id), cookieOptions);
    cookieStore.set('enterpriseId', String(employee.enterpriseId), cookieOptions);

    return NextResponse.json({
      success: true,
      employeeId: employee.id,
      enterpriseId: employee.enterpriseId,
      walletAddress: employee.walletAddress,
      fullName: employee.fullName,
    });
  } catch (error) {
    console.error('Employee session API error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create employee session',
      },
      { status: 500 }
    );
  }
}
