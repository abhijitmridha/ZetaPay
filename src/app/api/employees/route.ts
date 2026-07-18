import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const enterpriseId = searchParams.get('enterpriseId');

    if (!enterpriseId) {
      return NextResponse.json({ error: 'Enterprise ID is required' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionEnterpriseId = cookieStore.get('enterpriseId')?.value;

    if (!sessionEnterpriseId || parseInt(sessionEnterpriseId) !== parseInt(enterpriseId)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const records = await db
      .select()
      .from(employees)
      .where(eq(employees.enterpriseId, parseInt(enterpriseId)))
      .execute();
    console.error('SALARY');
    return NextResponse.json(records);
  } catch (error) {
    console.error('Error fetching employees:', error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const {
      walletAddress,
      email,
      fullName,
      classification,
      title,
      salary,
      preferredCurrency,
      taxFilingStatus,
      allowances,
      additionalWithholding,
      isExempt,
    } = body;

    if (!walletAddress || !fullName) {
      return NextResponse.json(
        { error: 'Wallet address and full name are required' },
        { status: 400 }
      );
    }

    const cleanWallet = walletAddress.trim();
    if (!cleanWallet.startsWith('G') || cleanWallet.length < 56) {
      return NextResponse.json(
        { error: 'Invalid Stellar wallet address. Must start with G and be 56 characters.' },
        { status: 400 }
      );
    }

    const enterpriseId = parseInt(enterpriseIdStr);

    const result = await db
      .insert(employees)
      .values({
        enterpriseId,
        walletAddress: cleanWallet,
        email: email || null,
        fullName: fullName.trim(),
        type: classification || 'employee',
        title: title || null,
        salary: salary !== undefined ? String(salary) : '0',
        preferredCurrency: preferredCurrency === 'XLM' ? 'XLM' : 'USDC',
        taxFilingStatus: taxFilingStatus || 'single',
        allowances: allowances ? parseInt(String(allowances), 10) : 0,
        additionalWithholding: additionalWithholding ? String(additionalWithholding) : '0',
        isExempt: !!isExempt,
        status: 'active',
      })
      .returning()
      .execute();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error('Error creating employee:', error);

    const cause = error instanceof Error && 'cause' in error ? String(error.cause) : null;

    return NextResponse.json(
      {
        error: 'Failed to create employee',
        message: error instanceof Error ? error.message : String(error),
        cause,
      },
      { status: 500 }
    );
  }
}
