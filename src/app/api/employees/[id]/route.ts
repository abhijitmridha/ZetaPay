import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { db } from '@/lib/db';
import { employees } from '@/lib/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enterpriseId = parseInt(enterpriseIdStr, 10);

    const result = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, parseInt(id)), eq(employees.enterpriseId, enterpriseId)))
      .execute();

    if (!result || result.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error fetching employee:', error);
    return NextResponse.json({ error: 'Failed to fetch employee' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enterpriseId = parseInt(enterpriseIdStr, 10);
    const body = await request.json();

    const {
      fullName,
      email,
      walletAddress,
      type,
      title,
      salary,
      preferredCurrency,
      taxFilingStatus,
      allowances,
      additionalWithholding,
      isExempt,
      status,
    } = body;

    const existing = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, parseInt(id)), eq(employees.enterpriseId, enterpriseId)))
      .execute();

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    const result = await db
      .update(employees)
      .set({
        fullName: fullName || existing[0].fullName,
        email: email ?? existing[0].email,
        walletAddress: walletAddress || existing[0].walletAddress,
        type: type || existing[0].type,
        title: title ?? existing[0].title,
        salary: salary ?? existing[0].salary,
        preferredCurrency: preferredCurrency || existing[0].preferredCurrency,
        taxFilingStatus: taxFilingStatus || existing[0].taxFilingStatus,
        allowances:
          allowances !== undefined ? parseInt(String(allowances), 10) : existing[0].allowances,
        additionalWithholding:
          additionalWithholding !== undefined
            ? String(additionalWithholding)
            : existing[0].additionalWithholding,
        isExempt: isExempt !== undefined ? isExempt : existing[0].isExempt,
        status: status || existing[0].status,
        updatedAt: new Date(),
      })
      .where(eq(employees.id, parseInt(id)))
      .returning()
      .execute();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error('Error updating employee:', error);
    return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const enterpriseId = parseInt(enterpriseIdStr, 10);

    const existing = await db
      .select()
      .from(employees)
      .where(and(eq(employees.id, parseInt(id)), eq(employees.enterpriseId, enterpriseId)))
      .execute();

    if (!existing || existing.length === 0) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    await db
      .delete(employees)
      .where(eq(employees.id, parseInt(id)))
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
  }
}
