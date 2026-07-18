import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq, inArray } from 'drizzle-orm';

import { db } from '@/lib/db';
import {
  employees,
  payrollEmployees,
  payrollRuns,
  payrollVerificationLinks,
  zkProofs,
} from '@/lib/db/schema';
import { decryptPayload } from '@/lib/security/tokenVault';

type EmployeeSelect = typeof employees.$inferSelect;

type TokenPayload = {
  token?: string;
};

type UpdatePayrollRequest = {
  status?: typeof payrollRuns.$inferSelect.status;
  txHash?: string;
};

function getBaseUrl(request: Request) {
  const origin = request.headers.get('origin');

  if (origin) return origin;

  const host = request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto') || 'http';

  return host ? `${protocol}://${host}` : '';
}

function decryptTokenUrlPayload(encryptedPayload?: string | null) {
  if (!encryptedPayload) return null;

  try {
    return decryptPayload<TokenPayload>(encryptedPayload);
  } catch {
    return null;
  }
}

function buildPublicVerificationUrl(baseUrl: string, encryptedPayload?: string | null) {
  const payload = decryptTokenUrlPayload(encryptedPayload);

  if (!payload?.token) return null;

  return `${baseUrl}/verify/payroll/${payload.token}`;
}

function buildEmployeeVerificationUrl(baseUrl: string, encryptedPayload?: string | null) {
  const payload = decryptTokenUrlPayload(encryptedPayload);

  if (!payload?.token) return null;

  return `${baseUrl}/verify/payment/${payload.token}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payrollRunId = Number.parseInt(id, 10);
    const enterpriseId = Number.parseInt(enterpriseIdStr, 10);

    if (Number.isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid payroll run id' }, { status: 400 });
    }

    if (Number.isNaN(enterpriseId)) {
      return NextResponse.json({ error: 'Invalid enterprise session' }, { status: 401 });
    }

    const [payrollRun] = await db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.enterpriseId, enterpriseId)))
      .limit(1)
      .execute();

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    const payrollEmployeeRows = await db
      .select()
      .from(payrollEmployees)
      .where(eq(payrollEmployees.payrollRunId, payrollRunId))
      .execute();

    let employeeDetails: EmployeeSelect[] = [];

    if (payrollEmployeeRows.length > 0) {
      const employeeIds = payrollEmployeeRows.map((payee) => payee.employeeId);

      employeeDetails = await db
        .select()
        .from(employees)
        .where(inArray(employees.id, employeeIds))
        .execute();
    }

    const [proof] = await db
      .select()
      .from(zkProofs)
      .where(eq(zkProofs.payrollRunId, payrollRunId))
      .limit(1)
      .execute();

    const linkRows = await db
      .select()
      .from(payrollVerificationLinks)
      .where(eq(payrollVerificationLinks.payrollRunId, payrollRunId))
      .execute();

    const baseUrl = getBaseUrl(request);

    const employeesWithVerificationLinks = payrollEmployeeRows.map((payee) => {
      const employee = employeeDetails.find((item) => item.id === payee.employeeId);
      const verificationLink = linkRows.find((link) => link.payrollEmployeeId === payee.id);

      return {
        ...payee,
        employee,
        employeeVerificationLink: verificationLink
          ? {
              id: verificationLink.id,
              linkType: verificationLink.linkType,
              expiresAt: verificationLink.expiresAt,
              usedAt: verificationLink.usedAt,
              revokedAt: verificationLink.revokedAt,
              verificationUrl: buildEmployeeVerificationUrl(
                baseUrl,
                verificationLink.encryptedPayload
              ),
            }
          : null,
      };
    });

    return NextResponse.json({
      ...payrollRun,
      publicVerificationUrl: buildPublicVerificationUrl(
        baseUrl,
        payrollRun.publicVerificationPayload
      ),
      proof: proof || null,
      employees: employeesWithVerificationLinks,
    });
  } catch (error) {
    console.error('Error fetching payroll run:', error);

    return NextResponse.json(
      {
        error: 'Failed to fetch payroll run',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
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

    const payrollRunId = Number.parseInt(id, 10);
    const enterpriseId = Number.parseInt(enterpriseIdStr, 10);

    if (Number.isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid payroll run id' }, { status: 400 });
    }

    if (Number.isNaN(enterpriseId)) {
      return NextResponse.json({ error: 'Invalid enterprise session' }, { status: 401 });
    }

    const body = (await request.json()) as UpdatePayrollRequest;

    const [existing] = await db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.enterpriseId, enterpriseId)))
      .limit(1)
      .execute();

    if (!existing) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    const [updated] = await db
      .update(payrollRuns)
      .set({
        status: body.status || existing.status,
        txHash: body.txHash || existing.txHash,
        updatedAt: new Date(),
      })
      .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.enterpriseId, enterpriseId)))
      .returning()
      .execute();

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Error updating payroll run:', error);

    return NextResponse.json(
      {
        error: 'Failed to update payroll run',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();
    const enterpriseIdStr = cookieStore.get('enterpriseId')?.value;

    if (!enterpriseIdStr) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payrollRunId = Number.parseInt(id, 10);
    const enterpriseId = Number.parseInt(enterpriseIdStr, 10);

    if (Number.isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid payroll run id' }, { status: 400 });
    }

    if (Number.isNaN(enterpriseId)) {
      return NextResponse.json({ error: 'Invalid enterprise session' }, { status: 401 });
    }

    const [existing] = await db
      .select()
      .from(payrollRuns)
      .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.enterpriseId, enterpriseId)))
      .limit(1)
      .execute();

    if (!existing) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    await db
      .delete(payrollRuns)
      .where(and(eq(payrollRuns.id, payrollRunId), eq(payrollRuns.enterpriseId, enterpriseId)))
      .execute();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting payroll run:', error);

    return NextResponse.json(
      {
        error: 'Failed to delete payroll run',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
