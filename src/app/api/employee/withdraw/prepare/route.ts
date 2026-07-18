import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { and, eq } from 'drizzle-orm';

import { db } from '@/lib/db';
import { employees, payrollEmployees, payrollRuns } from '@/lib/db/schema';
import { decryptPayload } from '@/lib/security/tokenVault';
import { buildWithdrawWithProofXdr, getNote, isRootAccepted } from '@/lib/zetapay/contracts/pool';

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

type WithdrawPrepareRequest = {
  payrollRunId?: number;
};

type AuditNote = {
  employeeId?: number;
  commitment?: string;
  atomicAmount?: string;
  amount?: string;
  token?: string;
  tokenHash?: string;
  nullifierHash?: string;
  recipientHash?: string;
  withdrawalHash?: string;
  proof?: JsonValue;
  publicInputs?: JsonValue;
};

type EncryptedPoolAudit = Record<string, JsonValue> & {
  notes?: AuditNote[];
};

type PayrollMetadata = {
  settlementMode?: 'confidential_payroll' | 'shielded_pool';
  encryptedPayroll?: string;
  soroban?: {
    poolPayload?: {
      root?: string;
      notes?: AuditNote[];
    };
  };
};

function asMetadata(value: unknown): PayrollMetadata {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return value as PayrollMetadata;
}

function decryptSafe<TPayload extends Record<string, JsonValue>>(payload?: string | null) {
  if (!payload) return null;

  try {
    return decryptPayload<TPayload>(payload);
  } catch {
    return null;
  }
}

function getAuditNotes(metadata: PayrollMetadata) {
  const decrypted = decryptSafe<EncryptedPoolAudit>(metadata.encryptedPayroll);

  if (Array.isArray(decrypted?.notes)) return decrypted.notes;

  if (Array.isArray(metadata.soroban?.poolPayload?.notes)) {
    return metadata.soroban.poolPayload.notes;
  }

  return [];
}

function missingProofFields(note?: AuditNote | null) {
  const missing: string[] = [];

  if (!note) return ['note'];
  if (!note.token) missing.push('token');
  if (!note.atomicAmount) missing.push('atomicAmount');
  if (!note.nullifierHash) missing.push('nullifierHash');
  if (!note.recipientHash) missing.push('recipientHash');
  if (!note.tokenHash) missing.push('tokenHash');
  if (!note.withdrawalHash) missing.push('withdrawalHash');
  if (!note.proof) missing.push('proof');
  if (!note.publicInputs) missing.push('publicInputs');

  return missing;
}

function errorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return typeof error === 'string' ? error : 'Unknown error';
}

export async function POST(request: Request) {
  try {
    const cookieStore = await cookies();
    const employeeIdValue = cookieStore.get('employeeId')?.value;
    const walletAddress = cookieStore.get('zetaWallet')?.value;

    if (!employeeIdValue || !walletAddress) {
      return NextResponse.json({ error: 'Employee session not found' }, { status: 401 });
    }

    const employeeId = Number.parseInt(employeeIdValue, 10);
    const body = (await request.json()) as WithdrawPrepareRequest;
    const payrollRunId = Number(body.payrollRunId);

    if (Number.isNaN(employeeId) || !payrollRunId || Number.isNaN(payrollRunId)) {
      return NextResponse.json({ error: 'Invalid withdrawal request' }, { status: 400 });
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

    const metadata = asMetadata(run.metadata);

    if (metadata.settlementMode !== 'shielded_pool') {
      return NextResponse.json(
        { error: 'Only shielded pool payroll can be withdrawn' },
        { status: 400 }
      );
    }

    const root = metadata.soroban?.poolPayload?.root || run.batchRoot;

    if (!root) {
      return NextResponse.json({ error: 'Pool root is missing' }, { status: 500 });
    }

    let rootAccepted = false;

    try {
      rootAccepted = await isRootAccepted({
        source: walletAddress,
        root,
      });
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Could not verify pool root on chain',
          message: errorMessage(error),
          debug: {
            source: walletAddress,
            root,
            payrollRunId,
          },
        },
        { status: 500 }
      );
    }

    if (!rootAccepted) {
      return NextResponse.json({ error: 'Pool root is not accepted on chain' }, { status: 409 });
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

    const auditNotes = getAuditNotes(metadata);

    if (auditNotes.length === 0) {
      return NextResponse.json(
        {
          error: 'Withdrawal notes are missing from encrypted payroll metadata',
          debug: {
            payrollRunId,
            hasEncryptedPayroll: Boolean(metadata.encryptedPayroll),
            hasPoolPayloadNotes: Boolean(metadata.soroban?.poolPayload?.notes?.length),
          },
        },
        { status: 500 }
      );
    }

    const withdrawals = [];

    for (const row of rows) {
      if (!row.commitment) continue;

      let chainNote;

      try {
        chainNote = await getNote({
          source: walletAddress,
          commitment: row.commitment,
        });
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Could not read shielded note from chain',
            message: errorMessage(error),
            debug: {
              payrollEmployeeId: row.id,
              payrollRunId,
              source: walletAddress,
              commitment: row.commitment,
            },
          },
          { status: 500 }
        );
      }

      if (Boolean(chainNote.withdrawn)) continue;

      const note = auditNotes.find((item) => String(item.commitment) === String(row.commitment));
      const missing = missingProofFields(note);

      if (missing.length > 0) {
        return NextResponse.json(
          {
            error: `Withdrawal proof data is missing for note ${row.id}`,
            missing,
            debug: {
              payrollEmployeeId: row.id,
              payrollRunId,
              commitment: row.commitment,
              matchedAuditNote: Boolean(note),
              auditNoteCount: auditNotes.length,
            },
          },
          { status: 500 }
        );
      }

      let unsignedXdr: string;

      try {
        unsignedXdr = await buildWithdrawWithProofXdr({
          recipient: walletAddress,
          token: note!.token!,
          amount: note!.atomicAmount!,
          commitment: row.commitment,
          root,
          nullifierHash: note!.nullifierHash!,
          recipientHash: note!.recipientHash!,
          tokenHash: note!.tokenHash!,
          withdrawalHash: note!.withdrawalHash!,
          proof: note!.proof!,
          publicInputs: note!.publicInputs!,
        } as Parameters<typeof buildWithdrawWithProofXdr>[0]);
      } catch (error) {
        return NextResponse.json(
          {
            error: 'Could not build withdrawal transaction',
            message: errorMessage(error),
            debug: {
              payrollEmployeeId: row.id,
              payrollRunId,
              commitment: row.commitment,
              token: note!.token,
              amount: note!.atomicAmount,
              root,
            },
          },
          { status: 500 }
        );
      }

      withdrawals.push({
        payrollEmployeeId: row.id,
        commitment: row.commitment,
        amount: String(row.netSalary || '0'),
        currency: row.payoutCurrency || employee.preferredCurrency || 'USDC',
        unsignedXdr,
      });
    }

    if (withdrawals.length === 0) {
      return NextResponse.json({ error: 'No available notes to withdraw' }, { status: 409 });
    }

    return NextResponse.json({
      success: true,
      payrollRunId,
      walletAddress,
      withdrawals,
    });
  } catch (error) {
    console.error('Prepare withdrawal error:', error);

    return NextResponse.json(
      {
        error: 'Failed to prepare withdrawal',
        message: errorMessage(error),
      },
      { status: 500 }
    );
  }
}
